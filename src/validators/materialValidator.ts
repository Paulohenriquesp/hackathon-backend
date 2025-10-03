import { z } from 'zod';
import { MaterialType, Difficulty } from '@prisma/client';

export const createMaterialSchema = z.object({
  title: z.string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres'),
  description: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  discipline: z.string().min(2, 'Disciplina é obrigatória'),
  grade: z.string().min(1, 'Série é obrigatória'),
  materialType: z.nativeEnum(MaterialType),
  subTopic: z.string()
    .max(100, 'Subtópico deve ter no máximo 100 caracteres')
    .optional(),
  difficulty: z.nativeEnum(Difficulty).default(Difficulty.MEDIUM),
  fileName: z.string().optional(),
});

export const updateMaterialSchema = z.object({
  title: z.string()
    .min(3, 'Título deve ter pelo menos 3 caracteres')
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .optional(),
  description: z.string()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  discipline: z.string().min(2, 'Disciplina é obrigatória').optional(),
  grade: z.string().min(1, 'Série é obrigatória').optional(),
  materialType: z.nativeEnum(MaterialType).optional(),
  subTopic: z.string()
    .max(100, 'Subtópico deve ter no máximo 100 caracteres')
    .optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
});

export const getMaterialsQuerySchema = z.object({
  // Filtros básicos
  discipline: z.string().optional(),
  grade: z.string().optional(),
  materialType: z.nativeEnum(MaterialType).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  
  // Filtros avançados
  author: z.string().optional(), // ID ou nome do autor
  minRating: z.string().transform(Number).optional(), // Rating mínimo
  maxRating: z.string().transform(Number).optional(), // Rating máximo
  
  // Filtros por data
  dateFrom: z.string().optional(), // Data início (YYYY-MM-DD)
  dateTo: z.string().optional(), // Data fim (YYYY-MM-DD)
  
  // Busca
  search: z.string().optional(), // Busca em título, descrição, disciplina
  
  // Paginação
  page: z.string().transform(Number).default(1),
  limit: z.string().transform(Number).default(10),
  
  // Ordenação
  sortBy: z.enum(['createdAt', 'title', 'avgRating', 'downloadCount', 'totalRatings']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Filtros especiais
  hasFile: z.string().transform(Boolean).optional(), // Apenas materiais com arquivo
  featured: z.string().transform(Boolean).optional(), // Materiais em destaque (alta avaliação)
});

export const createRatingSchema = z.object({
  rating: z.number().int().min(1, 'Rating mínimo é 1').max(5, 'Rating máximo é 5'),
  comment: z.string().optional(),
});

export type CreateMaterialData = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialData = z.infer<typeof updateMaterialSchema>;
export type GetMaterialsQuery = z.infer<typeof getMaterialsQuerySchema>;
export type CreateRatingData = z.infer<typeof createRatingSchema>;