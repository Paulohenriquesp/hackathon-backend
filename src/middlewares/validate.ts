import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Dados de entrada inválidos',
          details,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }));
        
        return res.status(400).json({
          success: false,
          error: 'Parâmetros de consulta inválidos',
          details,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    }
  };
};