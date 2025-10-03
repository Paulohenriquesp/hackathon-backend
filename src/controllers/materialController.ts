import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createMaterialSchema, updateMaterialSchema, getMaterialsQuerySchema, createRatingSchema } from '../validators/materialValidator';
import { getFileUrl, deleteFile, UploadedFile } from '../middlewares/upload';
import { AuthenticatedRequest } from '../types/auth';
import { aiService } from '../services/aiService';
import { pdfService } from '../services/pdfService';
import path from 'path';

const prisma = new PrismaClient();

export class MaterialController {
  // Criar material com upload
  async createMaterial(req: AuthenticatedRequest, res: Response) {
    try {
      console.log('🔍 Backend: Dados recebidos:', req.body);
      console.log('🔍 Backend: Arquivo recebido:', req.file ? req.file.originalname : 'Nenhum arquivo');
      
      // Validar dados recebidos
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
        console.error('❌ Backend: Erro de validação Zod:', error.errors);
        return res.status(400).json({
          success: false,
          error: 'Dados inválidos - Detalhes no console',
          details: error.errors,
          receivedData: req.body
        });
      }

      console.error('Erro ao criar material:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Listar materiais com filtros avançados
  async getMaterials(req: Request, res: Response) {
    try {
      const query = getMaterialsQuerySchema.parse(req.query);
      
      // Construir filtros WHERE
      const where: any = {};

      // Filtros básicos
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

      // Filtros avançados
      if (query.author) {
        where.OR = [
          {
            author: {
              name: {
                contains: query.author,
                mode: 'insensitive'
              }
            }
          },
          {
            authorId: query.author
          }
        ];
      }

      // Filtros por avaliação
      if (query.minRating !== undefined) {
        where.avgRating = {
          ...where.avgRating,
          gte: query.minRating
        };
      }

      if (query.maxRating !== undefined) {
        where.avgRating = {
          ...where.avgRating,
          lte: query.maxRating
        };
      }


      // Filtros por data
      if (query.dateFrom) {
        where.createdAt = {
          ...where.createdAt,
          gte: new Date(query.dateFrom)
        };
      }

      if (query.dateTo) {
        where.createdAt = {
          ...where.createdAt,
          lte: new Date(query.dateTo + 'T23:59:59.999Z')
        };
      }

      // Busca textual avançada
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
            discipline: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            subTopic: {
              contains: query.search,
              mode: 'insensitive'
            }
          },
          {
            author: {
              name: {
                contains: query.search,
                mode: 'insensitive'
              }
            }
          }
        ];
      }


      // Filtros especiais
      if (query.hasFile) {
        where.fileUrl = {
          not: null
        };
      }

      if (query.featured) {
        where.avgRating = {
          ...where.avgRating,
          gte: 4.0
        };
        where.totalRatings = {
          gte: 3
        };
      }

      // Configurar ordenação
      const orderBy: any = {};
      orderBy[query.sortBy] = query.sortOrder;

      // Validar limite de paginação
      const limit = Math.min(query.limit, 50); // Máximo 50 por página

      // Buscar materiais com paginação otimizada
      const [materials, total, stats] = await Promise.all([
        prisma.material.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                school: true
              }
            },
            _count: {
              select: {
                ratings: true
              }
            }
          },
          orderBy,
          skip: (query.page - 1) * limit,
          take: limit
        }),
        prisma.material.count({ where }),
        // Estatísticas adicionais
        prisma.material.aggregate({
          where,
          _avg: {
            avgRating: true,
            downloadCount: true
          },
          _max: {
            avgRating: true,
            downloadCount: true
          },
          _min: {
            avgRating: true,
            downloadCount: true
          }
        })
      ]);

      const totalPages = Math.ceil(total / limit);

      // Enriquecer dados dos materiais
      const enrichedMaterials = materials.map(material => ({
        ...material,
        isNew: new Date().getTime() - new Date(material.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000, // Novo se menos de 7 dias
        isPopular: material.downloadCount > (stats._avg.downloadCount || 0),
        isHighRated: material.avgRating >= 4.0 && material.totalRatings >= 3
      }));

      res.json({
        success: true,
        data: {
          materials: enrichedMaterials,
          pagination: {
            current: query.page,
            total: totalPages,
            count: total,
            limit: limit,
            hasNext: query.page < totalPages,
            hasPrev: query.page > 1
          },
          filters: {
            applied: {
              discipline: query.discipline,
              grade: query.grade,
              materialType: query.materialType,
              difficulty: query.difficulty,
              author: query.author,
              minRating: query.minRating,
              maxRating: query.maxRating,
              dateFrom: query.dateFrom,
              dateTo: query.dateTo,
              search: query.search,
              hasFile: query.hasFile,
              featured: query.featured
            },
            sorting: {
              sortBy: query.sortBy,
              sortOrder: query.sortOrder
            }
          },
          stats: {
            totalMaterials: total,
            avgRating: stats._avg.avgRating || 0,
            avgDownloads: stats._avg.downloadCount || 0,
            maxRating: stats._max.avgRating || 0,
            maxDownloads: stats._max.downloadCount || 0
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

  // Obter estatísticas gerais dos materiais
  async getStats(req: Request, res: Response) {
    try {
      const [
        totalMaterials,
        totalDownloads,
        totalRatings,
        avgRating,
        materialsByType,
        materialsByDifficulty,
        materialsByGrade,
        topAuthors,
        recentMaterials,
        popularMaterials
      ] = await Promise.all([
        // Total de materiais
        prisma.material.count(),
        
        // Total de downloads
        prisma.material.aggregate({
          _sum: { downloadCount: true }
        }),
        
        // Total de avaliações
        prisma.rating.count(),
        
        // Média geral de avaliações
        prisma.material.aggregate({
          _avg: { avgRating: true }
        }),
        
        // Materiais por tipo
        prisma.material.groupBy({
          by: ['materialType'],
          _count: { materialType: true },
          orderBy: { _count: { materialType: 'desc' } }
        }),
        
        // Materiais por dificuldade
        prisma.material.groupBy({
          by: ['difficulty'],
          _count: { difficulty: true },
          orderBy: { _count: { difficulty: 'desc' } }
        }),
        
        // Materiais por série
        prisma.material.groupBy({
          by: ['grade'],
          _count: { grade: true },
          orderBy: { _count: { grade: 'desc' } },
          take: 10
        }),
        
        // Top autores
        prisma.user.findMany({
          select: {
            id: true,
            name: true,
            school: true,
            materialsCount: true,
            materials: {
              select: {
                avgRating: true,
                downloadCount: true
              }
            }
          },
          orderBy: { materialsCount: 'desc' },
          take: 10
        }),
        
        // Materiais recentes (últimos 7 dias)
        prisma.material.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        
        // Materiais mais populares
        prisma.material.findMany({
          select: {
            id: true,
            title: true,
            downloadCount: true,
            avgRating: true,
            totalRatings: true,
            author: {
              select: {
                name: true
              }
            }
          },
          orderBy: { downloadCount: 'desc' },
          take: 5
        })
      ]);

      // Calcular estatísticas dos top autores
      const enrichedAuthors = topAuthors.map(author => {
        const totalDownloads = author.materials.reduce((sum, material) => sum + material.downloadCount, 0);
        const avgAuthorRating = author.materials.length > 0 
          ? author.materials.reduce((sum, material) => sum + material.avgRating, 0) / author.materials.length 
          : 0;
        
        return {
          id: author.id,
          name: author.name,
          school: author.school,
          materialsCount: author.materialsCount,
          totalDownloads,
          avgRating: avgAuthorRating
        };
      });

      res.json({
        success: true,
        data: {
          overview: {
            totalMaterials,
            totalDownloads: totalDownloads._sum.downloadCount || 0,
            totalRatings,
            avgRating: avgRating._avg.avgRating || 0,
            recentMaterials
          },
          distribution: {
            byType: materialsByType.map(item => ({
              type: item.materialType,
              count: item._count.materialType
            })),
            byDifficulty: materialsByDifficulty.map(item => ({
              difficulty: item.difficulty,
              count: item._count.difficulty
            })),
            byGrade: materialsByGrade.map(item => ({
              grade: item.grade,
              count: item._count.grade
            }))
          },
          topAuthors: enrichedAuthors,
          popularMaterials
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar materiais similares
  async getSimilarMaterials(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 5;

      // Buscar material original
      const originalMaterial = await prisma.material.findUnique({
        where: { id },
        select: {
          discipline: true,
          grade: true,
          materialType: true,
          difficulty: true,
        }
      });

      if (!originalMaterial) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      // Buscar materiais similares
      const similarMaterials = await prisma.material.findMany({
        where: {
          AND: [
            { id: { not: id } }, // Excluir o material original
            {
              OR: [
                { discipline: originalMaterial.discipline },
                { grade: originalMaterial.grade },
                { materialType: originalMaterial.materialType },
                { difficulty: originalMaterial.difficulty },
              ]
            }
          ]
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              school: true
            }
          }
        },
        orderBy: [
          { avgRating: 'desc' },
          { downloadCount: 'desc' }
        ],
        take: limit
      });

      res.json({
        success: true,
        data: {
          original: {
            id,
            discipline: originalMaterial.discipline,
            grade: originalMaterial.grade,
            materialType: originalMaterial.materialType,
            difficulty: originalMaterial.difficulty,
          },
          similar: similarMaterials
        }
      });

    } catch (error) {
      console.error('Erro ao buscar materiais similares:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Gerar plano de aula + atividades com IA a partir do material
  async generateActivities(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      console.log('🤖 Gerando plano de aula e atividades com IA para material:', id);

      // Buscar material
      const material = await prisma.material.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          discipline: true,
          grade: true,
          materialType: true,
          difficulty: true,
          fileUrl: true,
          fileName: true,
          authorId: true,
        }
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      // Extrair conteúdo do material
      let materialContent = '';

      // Se há arquivo, tentar extrair texto
      if (material.fileUrl && material.fileName) {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const filename = material.fileUrl.split('/').pop();

        if (filename) {
          const filePath = path.join(uploadsDir, filename);

          // Verificar se arquivo suporta extração de texto
          if (pdfService.supportsTextExtraction(material.fileName)) {
            try {
              materialContent = await pdfService.extractTextFromFile(filePath);
              console.log('✅ Texto extraído do arquivo:', materialContent.length, 'caracteres');
            } catch (extractError: any) {
              console.warn('⚠️ Não foi possível extrair texto do arquivo:', extractError.message);
              // Continuar com descrição se extração falhar
              materialContent = material.description;
            }
          } else {
            console.log('ℹ️ Arquivo não suporta extração de texto, usando descrição');
            materialContent = material.description;
          }
        }
      } else {
        // Se não há arquivo, usar descrição
        materialContent = material.description;
      }

      // Validar se há conteúdo suficiente
      if (!materialContent || materialContent.trim().length < 100) {
        return res.status(400).json({
          success: false,
          error: 'Material não possui conteúdo suficiente para gerar o plano de aula e atividades. O material precisa ter pelo menos 100 caracteres.'
        });
      }

      // Gerar plano de aula + atividades usando IA
      const content = await aiService.generateContent(
        materialContent,
        material.title,
        material.discipline,
        material.grade,
        material.materialType,
        material.difficulty
      );

      console.log('✅ Plano de aula e atividades geradas com sucesso');

      res.json({
        success: true,
        data: {
          material: {
            id: material.id,
            title: material.title,
            discipline: material.discipline,
            grade: material.grade,
            difficulty: material.difficulty,
          },
          content,
          metadata: {
            contentLength: materialContent.length,
            extractedFromFile: !!material.fileUrl && pdfService.supportsTextExtraction(material.fileName || ''),
            generatedAt: new Date().toISOString(),
          }
        },
        message: 'Plano de aula e atividades geradas com sucesso'
      });

    } catch (error: any) {
      console.error('❌ Erro ao gerar plano de aula e atividades:', error);

      // Erros específicos da OpenAI
      if (error.message.includes('OpenAI') || error.message.includes('API')) {
        return res.status(503).json({
          success: false,
          error: 'Serviço de IA temporariamente indisponível',
          details: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Erro ao gerar plano de aula e atividades',
        details: error.message
      });
    }
  }
}

export const materialController = new MaterialController();