import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    school: string | null;
    materialsCount: number;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
}