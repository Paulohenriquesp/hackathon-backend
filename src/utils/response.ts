import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any;
}

export class ResponseHelper {
  static success<T>(res: Response, data: T, message?: string, status = 200) {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message
    };
    return res.status(status).json(response);
  }

  static error(res: Response, error: string, status = 400, details?: any) {
    const response: ApiResponse = {
      success: false,
      error,
      details
    };
    return res.status(status).json(response);
  }

  static created<T>(res: Response, data: T, message = 'Criado com sucesso') {
    return this.success(res, data, message, 201);
  }

  static notFound(res: Response, message = 'Recurso não encontrado') {
    return this.error(res, message, 404);
  }

  static unauthorized(res: Response, message = 'Não autorizado') {
    return this.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Acesso negado') {
    return this.error(res, message, 403);
  }

  static serverError(res: Response, message = 'Erro interno do servidor') {
    return this.error(res, message, 500);
  }
}