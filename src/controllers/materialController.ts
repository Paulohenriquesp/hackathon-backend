import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createMaterialSchema, updateMaterialSchema, getMaterialsQuerySchema, createRatingSchema } from '../validators/materialValidator';
import { getFileUrl, deleteFile, UploadedFile } from '../middlewares/upload';
import { AuthenticatedRequest } from '../types/auth';

const prisma = new PrismaClient();

export class MaterialController {
  // Criar material com upload
  async createMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      // Validar dados do formulário
      const validatedData = createMaterialSchema.parse(req.body);
      
      // Verificar se arquivo foi enviado
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Arquivo é obrigatório'
        });
      }

      // Preparar dados do arquivo
      const uploadedFile: UploadedFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: getFileUrl(req.file.filename)
      };

      // Criar material no banco
      const material = await prisma.material.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          discipline: validatedData.discipline,
          grade: validatedData.grade,
          materialType: validatedData.materialType,
          subTopic: validatedData.subTopic,
          difficulty: validatedData.difficulty,
          estimatedDuration: validatedData.estimatedDuration,
          tags: validatedData.tags,
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.originalName,
          authorId: req.user!.id,
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              school: true
            }
          }
        }
      });

      // Incrementar contador de materiais do usuário
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          materialsCount: {
            increment: 1
          }
        }
      });

      res.status(201).json({
        success: true,
        data: {
          material,
          file: uploadedFile
        },
        message: 'Material criado com sucesso'
      });

    } catch (error: any) {
      // Se erro após upload, deletar arquivo
      if (req.file) {
        deleteFile(req.file.filename);
      }

      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Erro ao criar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Listar materiais com filtros
  async getMaterials(req: Request, res: Response) {
    try {
      const query = getMaterialsQuerySchema.parse(req.query);
      
      const where: any = {};

      // Aplicar filtros
      if (query.discipline) {
        where.discipline = {
          contains: query.discipline,
          mode: 'insensitive'
        };
      }

      if (query.grade) {
        where.grade = query.grade;
      }

      if (query.materialType) {
        where.materialType = query.materialType;
      }

      if (query.difficulty) {
        where.difficulty = query.difficulty;
      }

      if (query.search) {
        where.OR = [
          {
            title: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            tags: {
              hasSome: [query.search]
            }
          }
        ];
      }

      if (query.tags) {
        const tagsArray = query.tags.split(',').map(tag => tag.trim());
        where.tags = {
          hasSome: tagsArray
        };
      }

      // Buscar materiais com paginação
      const [materials, total] = await Promise.all([
        prisma.material.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                school: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit
        }),
        prisma.material.count({ where })
      ]);

      const totalPages = Math.ceil(total / query.limit);

      res.json({
        success: true,
        data: {
          materials,
          pagination: {
            current: query.page,
            total: totalPages,
            count: total,
            limit: query.limit
          }
        }
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros de consulta inválidos',
          details: error.errors
        });
      }

      console.error('Erro ao buscar materiais:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Obter material específico
  async getMaterial(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const material = await prisma.material.findUnique({
        where: { id },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              school: true
            }
          },
          ratings: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      res.json({
        success: true,
        data: material
      });

    } catch (error) {
      console.error('Erro ao buscar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar material (apenas autor)
  async updateMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = updateMaterialSchema.parse(req.body);

      // Verificar se material existe e se usuário é o autor
      const existingMaterial = await prisma.material.findUnique({
        where: { id }
      });

      if (!existingMaterial) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      if (existingMaterial.authorId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas o autor pode editar este material'
        });
      }

      // Atualizar material
      const updatedMaterial = await prisma.material.update({
        where: { id },
        data: validatedData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              school: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedMaterial,
        message: 'Material atualizado com sucesso'
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Erro ao atualizar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar material (apenas autor)
  async deleteMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      // Verificar se material existe e se usuário é o autor
      const existingMaterial = await prisma.material.findUnique({
        where: { id }
      });

      if (!existingMaterial) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      if (existingMaterial.authorId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Acesso negado. Apenas o autor pode deletar este material'
        });
      }

      // Deletar material e arquivo
      await prisma.material.delete({
        where: { id }
      });

      // Deletar arquivo físico se existir
      if (existingMaterial.fileUrl) {
        const filename = existingMaterial.fileUrl.split('/').pop();
        if (filename) {
          deleteFile(filename);
        }
      }

      // Decrementar contador de materiais do usuário
      await prisma.user.update({
        where: { id: req.user!.id },
        data: {
          materialsCount: {
            decrement: 1
          }
        }
      });

      res.json({
        success: true,
        message: 'Material deletado com sucesso'
      });

    } catch (error) {
      console.error('Erro ao deletar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Incrementar contador de download
  async downloadMaterial(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const material = await prisma.material.findUnique({
        where: { id }
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      if (!material.fileUrl) {
        return res.status(404).json({
          success: false,
          error: 'Arquivo não disponível'
        });
      }

      // Incrementar contador de download
      await prisma.material.update({
        where: { id },
        data: {
          downloadCount: {
            increment: 1
          }
        }
      });

      res.json({
        success: true,
        data: {
          downloadUrl: material.fileUrl,
          fileName: material.fileName
        }
      });

    } catch (error) {
      console.error('Erro ao processar download:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Avaliar material
  async rateMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const validatedData = createRatingSchema.parse(req.body);

      // Verificar se material existe
      const material = await prisma.material.findUnique({
        where: { id }
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      // Verificar se usuário já avaliou
      const existingRating = await prisma.rating.findUnique({
        where: {
          materialId_userId: {
            materialId: id,
            userId: req.user!.id
          }
        }
      });

      let rating;
      if (existingRating) {
        // Atualizar avaliação existente
        rating = await prisma.rating.update({
          where: { id: existingRating.id },
          data: validatedData,
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      } else {
        // Criar nova avaliação
        rating = await prisma.rating.create({
          data: {
            ...validatedData,
            materialId: id,
            userId: req.user!.id
          },
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
      }

      // Recalcular média de avaliações
      const ratings = await prisma.rating.findMany({
        where: { materialId: id }
      });

      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

      // Atualizar material com nova média
      await prisma.material.update({
        where: { id },
        data: {
          avgRating,
          totalRatings: ratings.length
        }
      });

      res.json({
        success: true,
        data: rating,
        message: existingRating ? 'Avaliação atualizada com sucesso' : 'Avaliação criada com sucesso'
      });

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos',
          details: error.errors
        });
      }

      console.error('Erro ao avaliar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Obter materiais do usuário logado
  async getMyMaterials(req: AuthenticatedRequest, res: Response) {
    try {
      const query = getMaterialsQuerySchema.parse(req.query);

      const where: any = {
        authorId: req.user!.id
      };

      // Aplicar filtros se fornecidos
      if (query.search) {
        where.OR = [
          {
            title: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: query.search,
              mode: 'insensitive'
            }
          }
        ];
      }

      const [materials, total] = await Promise.all([
        prisma.material.findMany({
          where,
          include: {
            ratings: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit
        }),
        prisma.material.count({ where })
      ]);

      const totalPages = Math.ceil(total / query.limit);

      res.json({
        success: true,
        data: {
          materials,
          pagination: {
            current: query.page,
            total: totalPages,
            count: total,
            limit: query.limit
          }
        }
      });

    } catch (error) {
      console.error('Erro ao buscar meus materiais:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

export const materialController = new MaterialController();