import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../database';
import { ResponseHelper } from '../utils/response';
import env from '../config/env';
import { AuthenticatedRequest, JWTPayload } from '../types/auth';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log('🔍 Auth Token: Requisição recebida para:', req.method, req.path);
    const authHeader = req.headers['authorization'];
    console.log('🔍 Auth Token: Header Authorization:', authHeader ? 'presente' : 'ausente');
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.error('❌ Auth Token: Token não encontrado');
      return ResponseHelper.unauthorized(res, 'Token de acesso necessário');
    }

    // Verificar e decodificar token
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        school: true,
        materialsCount: true
      }
    });

    if (!user) {
      return ResponseHelper.unauthorized(res, 'Usuário não encontrado');
    }

    // Adicionar usuário ao request
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return ResponseHelper.unauthorized(res, 'Token expirado');
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      return ResponseHelper.unauthorized(res, 'Token inválido');
    }

    console.error('Erro na autenticação:', error);
    return ResponseHelper.serverError(res);
  }
};

// Middleware opcional - não bloqueia se não tiver token
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next(); // Continua sem usuário
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        school: true,
        materialsCount: true
      }
    });

    if (user) {
      req.user = user;
    }

    next();

  } catch (error) {
    // Ignora erros de token em auth opcional
    next();
  }
};