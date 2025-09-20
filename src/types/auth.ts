import { Request } from 'express';

// Interface para o payload do JWT
export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Interface para dados do usuário autenticado
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  school: string | null;
  materialsCount: number;
}

// Estendendo Request do Express para incluir usuário autenticado
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Interface para resposta de login/register
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Omit<AuthUser, 'materialsCount'>;
    token: string;
  };
  error?: string;
}

// Interface para dados de registro
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  school?: string;
}

// Interface para dados de login
export interface LoginData {
  email: string;
  password: string;
}

// Interface para atualização de perfil
export interface UpdateProfileData {
  name?: string;
  school?: string;
}