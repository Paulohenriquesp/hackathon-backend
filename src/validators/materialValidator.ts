import { z } from 'zod';
import { MaterialType, Difficulty } from '@prisma/client';

export const createMaterialSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  discipline: z.string().min(2, 'Disciplina é obrigatória'),
  grade: z.string().min(1, 'Série é obrigatória'),
  materialType: z.nativeEnum(MaterialType),
  subTopic: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  estimatedDuration: z.number().int().positive().optional(),
  tags: z.array(z.string()).default([]),
  fileName: z.string().optional(),
});

export const updateMaterialSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').optional(),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres').optional(),
  discipline: z.string().min(2, 'Disciplina é obrigatória').optional(),
  grade: z.string().min(1, 'Série é obrigatória').optional(),
  materialType: z.nativeEnum(MaterialType).optional(),
  subTopic: z.string().optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  estimatedDuration: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

export const getMaterialsQuerySchema = z.object({
  discipline: z.string().optional(),
  grade: z.string().optional(),
  materialType: z.nativeEnum(MaterialType).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(10),
  search: z.string().optional(),
  tags: z.string().optional(), // tags separadas por vírgula
});

export const createRatingSchema = z.object({
  rating: z.number().int().min(1, 'Rating mínimo é 1').max(5, 'Rating máximo é 5'),
  comment: z.string().optional(),
});

export type CreateMaterialData = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialData = z.infer<typeof updateMaterialSchema>;
export type GetMaterialsQuery = z.infer<typeof getMaterialsQuerySchema>;
export type CreateRatingData = z.infer<typeof createRatingSchema>;