import { Response } from 'express';
import { ZodError } from 'zod';

// Classe para erros customizados da aplicação
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Tipos de resposta padronizados
export interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  timestamp: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  timestamp: string;
}

// Classe helper para respostas padronizadas
export class ResponseHelper {
  static success<T>(
    res: Response,
    message: string,
    data?: T,
    statusCode: number = 200
  ): Response<SuccessResponse<T>> {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    details?: any
  ): Response<ErrorResponse> {
    return res.status(statusCode).json({
      success: false,
      error: message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static validationError(
    res: Response,
    zodError: ZodError
  ): Response<ErrorResponse> {
    const details = (zodError as any).errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados de entrada inválidos',
      details,
      timestamp: new Date().toISOString()
    });
  }

  static unauthorized(
    res: Response,
    message: string = 'Não autorizado'
  ): Response<ErrorResponse> {
    return res.status(401).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static forbidden(
    res: Response,
    message: string = 'Acesso negado'
  ): Response<ErrorResponse> {
    return res.status(403).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static notFound(
    res: Response,
    message: string = 'Recurso não encontrado'
  ): Response<ErrorResponse> {
    return res.status(404).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static conflict(
    res: Response,
    message: string = 'Conflito de dados'
  ): Response<ErrorResponse> {
    return res.status(409).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }

  static serverError(
    res: Response,
    message: string = 'Erro interno do servidor'
  ): Response<ErrorResponse> {
    return res.status(500).json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    });
  }
}

// Função para capturar erros assíncronos
export const catchAsync = (fn: any) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Handler para erros não tratados
export const globalErrorHandler = (
  error: any,
  req: any,
  res: Response,
  next: any
) => {
  console.error('🚨 Erro capturado:', error);

  // Erro operacional da aplicação
  if (error instanceof AppError) {
    return ResponseHelper.error(res, error.message, error.statusCode);
  }

  // Erro de validação do Zod
  if (error instanceof ZodError) {
    return ResponseHelper.validationError(res, error);
  }

  // Erro de email duplicado (Prisma)
  if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
    return ResponseHelper.conflict(res, 'Este email já está em uso');
  }

  // Erro de registro não encontrado (Prisma)
  if (error.code === 'P2025') {
    return ResponseHelper.notFound(res, 'Registro não encontrado');
  }

  // Outros erros do Prisma
  if (error.code?.startsWith('P')) {
    return ResponseHelper.serverError(res, 'Erro na operação do banco de dados');
  }

  // Erro genérico
  return ResponseHelper.serverError(res, 'Erro interno do servidor');
};