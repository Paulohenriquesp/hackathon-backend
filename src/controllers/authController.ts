import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../database';
import { AuthenticatedRequest, JWTPayload } from '../types/auth';
import { 
  registerSchema, 
  loginSchema, 
  updateProfileSchema, 
  changePasswordSchema 
} from '../validators/authValidator';
import { 
  ResponseHelper, 
  AppError, 
  catchAsync 
} from '../utils/errorHandler';
import env from '../config/env';

// Configurações de segurança
const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '24h'; // 24 horas conforme solicitado
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos

// Função para gerar JWT
const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'banco-colaborativo-api',
    audience: 'banco-colaborativo-frontend'
  });
};

// Função para hash de senha com validação de força
const hashPassword = async (password: string): Promise<string> => {
  // Validação adicional de força da senha
  if (password.length < 6) {
    throw new AppError('Senha deve ter pelo menos 6 caracteres', 400);
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Registro de professor
export const register = catchAsync(async (req: any, res: Response) => {
  // Validação dos dados de entrada
  const validatedData = registerSchema.parse(req.body);
  const { name, email, password, school } = validatedData;

  // Verificar se o email já existe
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new AppError('Este email já está cadastrado', 409);
  }

  // Hash da senha
  const hashedPassword = await hashPassword(password);

  // Criar usuário
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      school: school || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      createdAt: true
    }
  });

  // Gerar token JWT
  const token = generateToken({
    userId: user.id,
    email: user.email
  });

  // Log de segurança
  console.log(`✅ Novo usuário registrado: ${email} (ID: ${user.id})`);

  return ResponseHelper.success(
    res,
    'Professor cadastrado com sucesso',
    { user, token },
    201
  );
});

// Login de professor
export const login = catchAsync(async (req: any, res: Response) => {
  // Validação dos dados de entrada
  const validatedData = loginSchema.parse(req.body);
  const { email, password } = validatedData;

  // Buscar usuário com dados de segurança
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      school: true,
      createdAt: true
    }
  });

  if (!user) {
    // Log de tentativa de login inválida
    console.warn(`❌ Tentativa de login com email inexistente: ${email}`);
    throw new AppError('Credenciais inválidas', 401);
  }

  // Verificar senha
  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    // Log de tentativa de senha incorreta
    console.warn(`❌ Tentativa de login com senha incorreta: ${email}`);
    throw new AppError('Credenciais inválidas', 401);
  }

  // Gerar token JWT
  const token = generateToken({
    userId: user.id,
    email: user.email
  });

  // Remover senha da resposta
  const { password: _, ...userWithoutPassword } = user;

  // Log de login bem-sucedido
  console.log(`✅ Login bem-sucedido: ${email} (ID: ${user.id})`);

  return ResponseHelper.success(
    res,
    'Login realizado com sucesso',
    { user: userWithoutPassword, token }
  );
});

// Obter perfil do usuário autenticado
export const getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      materialsCount: true,
      createdAt: true,
      materials: {
        select: {
          id: true,
          title: true,
          discipline: true,
          grade: true,
          materialType: true,
          avgRating: true,
          downloadCount: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5 // Últimos 5 materiais
      }
    }
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  return ResponseHelper.success(res, 'Perfil obtido com sucesso', user);
});

// Atualizar perfil do usuário
export const updateProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  // Validação dos dados
  const validatedData = updateProfileSchema.parse(req.body);
  const updateData: any = {};

  // Só adiciona campos que foram fornecidos
  if (validatedData.name !== undefined) {
    updateData.name = validatedData.name;
  }
  
  if (validatedData.school !== undefined) {
    updateData.school = validatedData.school;
  }

  // Verificar se há dados para atualizar
  if (Object.keys(updateData).length === 0) {
    throw new AppError('Nenhum dado fornecido para atualização', 400);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      school: true,
      materialsCount: true,
      createdAt: true
    }
  });

  // Log de atualização
  console.log(`✅ Perfil atualizado: ${user.email} (ID: ${userId})`);

  return ResponseHelper.success(res, 'Perfil atualizado com sucesso', user);
});

// Alterar senha
export const changePassword = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (!userId) {
    throw new AppError('Usuário não autenticado', 401);
  }

  // Validação dos dados
  const validatedData = changePasswordSchema.parse(req.body);
  const { currentPassword, newPassword } = validatedData;

  // Buscar usuário atual
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, password: true }
  });

  if (!user) {
    throw new AppError('Usuário não encontrado', 404);
  }

  // Verificar senha atual
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  
  if (!isCurrentPasswordValid) {
    throw new AppError('Senha atual incorreta', 400);
  }

  // Verificar se a nova senha é diferente da atual
  const isSamePassword = await bcrypt.compare(newPassword, user.password);
  
  if (isSamePassword) {
    throw new AppError('A nova senha deve ser diferente da atual', 400);
  }

  // Hash da nova senha
  const hashedNewPassword = await hashPassword(newPassword);

  // Atualizar senha
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedNewPassword }
  });

  // Log de segurança
  console.log(`🔐 Senha alterada: ${user.email} (ID: ${userId})`);

  return ResponseHelper.success(res, 'Senha alterada com sucesso');
});

// Logout (invalidar token - implementação básica)
export const logout = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  // Em uma implementação completa, você adicionaria o token a uma blacklist
  // Por ora, o logout é feito no frontend removendo o token
  
  const userId = req.user?.id;
  if (userId) {
    console.log(`👋 Logout realizado: User ID ${userId}`);
  }

  return ResponseHelper.success(res, 'Logout realizado com sucesso');
});

// Verificar se token é válido
export const verifyToken = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  return ResponseHelper.success(res, 'Token válido', { user: req.user });
});