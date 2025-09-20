import { z } from 'zod';
import { ResourceType } from '@prisma/client';

export const createMaterialSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  content: z.string().optional(),
  subject: z.string().min(2, 'Disciplina é obrigatória'),
  gradeLevel: z.string().min(1, 'Série é obrigatória'),
  type: z.nativeEnum(ResourceType).optional(),
});

export const getMaterialsQuerySchema = z.object({
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('10'),
});

export type CreateMaterialData = z.infer<typeof createMaterialSchema>;
export type GetMaterialsQuery = z.infer<typeof getMaterialsQuerySchema>;