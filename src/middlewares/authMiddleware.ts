import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../database';
import { AuthenticatedRequest, JWTPayload } from '../types/auth';
import { ResponseHelper, AppError, catchAsync } from '../utils/errorHandler';
import env from '../config/env';

// Rate limiting básico para autenticação
const authAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_AUTH_ATTEMPTS = 10;
const AUTH_WINDOW = 15 * 60 * 1000; // 15 minutos

// Função para verificar rate limiting
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const attempts = authAttempts.get(ip);

  if (!attempts) {
    authAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Reset counter se passou da janela de tempo
  if (now - attempts.lastAttempt > AUTH_WINDOW) {
    authAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Incrementar contador
  attempts.count++;
  attempts.lastAttempt = now;

  return attempts.count <= MAX_AUTH_ATTEMPTS;
};

// Middleware principal de autenticação
export const authenticate = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // Rate limiting por IP
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  
  if (!checkRateLimit(clientIP)) {
    console.warn(`🚨 Rate limit excedido para IP: ${clientIP}`);
    throw new AppError('Muitas tentativas de autenticação. Tente novamente em 15 minutos.', 429);
  }

  console.log('🔍 Auth Middleware: Requisição recebida para:', req.method, req.path);
  console.log('🔍 Auth Middleware: Headers:', req.headers.authorization ? 'Authorization presente' : 'Authorization ausente');
  
  // Extrair token do header Authorization
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    console.error('❌ Auth Middleware: Token de acesso não encontrado');
    throw new AppError('Token de acesso necessário', 401);
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.error('❌ Auth Middleware: Formato de token inválido');
    throw new AppError('Formato de token inválido. Use: Bearer <token>', 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  if (!token) {
    throw new AppError('Token não fornecido', 401);
  }

  try {
    // Verificar e decodificar o JWT
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'banco-colaborativo-api',
      audience: 'banco-colaborativo-frontend'
    }) as JWTPayload;

    // Validar estrutura do payload
    if (!decoded.userId || !decoded.email) {
      throw new AppError('Token inválido: payload malformado', 401);
    }

    // Buscar usuário no banco de dados
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });

    if (!user) {
      console.warn(`⚠️ Token válido mas usuário não encontrado: ${decoded.userId}`);
      throw new AppError('Usuário não encontrado', 401);
    }

    // Verificar se o email do token corresponde ao email atual do usuário
    if (user.email !== decoded.email) {
      console.warn(`⚠️ Email do token não corresponde ao usuário: ${decoded.email} vs ${user.email}`);
      throw new AppError('Token inválido: dados inconsistentes', 401);
    }

    // Adicionar usuário autenticado ao request
    req.user = user;

    // Log de autenticação bem-sucedida (apenas em desenvolvimento)
    if (env.NODE_ENV === 'development') {
      console.log(`🔐 Usuário autenticado: ${user.email} (${user.id})`);
    }

    next();

  } catch (error: any) {
    // Tratamento específico de erros JWT
    if (error instanceof jwt.TokenExpiredError) {
      console.warn(`⏰ Token expirado para usuário: ${error.message}`);
      throw new AppError('Token expirado. Faça login novamente.', 401);
    }

    if (error instanceof jwt.JsonWebTokenError) {
      console.warn(`🚫 Token JWT inválido: ${error.message}`);
      throw new AppError('Token inválido', 401);
    }

    if (error instanceof jwt.NotBeforeError) {
      console.warn(`🕐 Token usado antes do tempo: ${error.message}`);
      throw new AppError('Token ainda não é válido', 401);
    }

    // Re-throw AppErrors
    if (error instanceof AppError) {
      throw error;
    }

    // Erro genérico
    console.error('❌ Erro na autenticação:', error);
    throw new AppError('Erro na validação do token', 500);
  }
});

// Middleware opcional - não bloqueia se não tiver token
export const optionalAuthenticate = catchAsync(async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  // Se não há header de autorização, continua sem usuário
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  if (!token) {
    return next();
  }

  try {
    // Verificar JWT
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'banco-colaborativo-api',
      audience: 'banco-colaborativo-frontend'
    }) as JWTPayload;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        school: true,
        materialsCount: true
      }
    });

    if (user && user.email === decoded.email) {
      req.user = user;
    }
  } catch (error) {
    // Em autenticação opcional, ignoramos erros e continuamos sem usuário
    console.log('Token opcional inválido, continuando sem autenticação');
  }

  next();
});

// Middleware para verificar se usuário é o dono do recurso
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user?.id;
    const resourceId = req.params[resourceIdParam];

    if (!userId) {
      throw new AppError('Usuário não autenticado', 401);
    }

    if (!resourceId) {
      throw new AppError('ID do recurso não fornecido', 400);
    }

    // Verificar se o material pertence ao usuário
    const material = await prisma.material.findUnique({
      where: { id: resourceId },
      select: { authorId: true }
    });

    if (!material) {
      throw new AppError('Recurso não encontrado', 404);
    }

    if (material.authorId !== userId) {
      throw new AppError('Acesso negado: você não tem permissão para este recurso', 403);
    }

    next();
  });
};

// Middleware para validação de roles (extensível para futuro)
export const requireRole = (roles: string[]) => {
  return catchAsync(async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    const user = req.user;

    if (!user) {
      throw new AppError('Usuário não autenticado', 401);
    }

    // Por enquanto, todos os usuários são professores
    // Em uma implementação futura, você poderia adicionar roles na tabela de usuários
    const userRole = 'professor';

    if (!roles.includes(userRole)) {
      throw new AppError('Acesso negado: permissão insuficiente', 403);
    }

    next();
  });
};

// Cleanup de rate limiting (executar periodicamente)
export const cleanupRateLimit = () => {
  const now = Date.now();
  for (const [ip, data] of authAttempts.entries()) {
    if (now - data.lastAttempt > AUTH_WINDOW) {
      authAttempts.delete(ip);
    }
  }
};

// Executar cleanup a cada hora
setInterval(cleanupRateLimit, 60 * 60 * 1000);