import { Request, Response } from 'express';
import { createMaterialSchema, updateMaterialSchema, getMaterialsQuerySchema, createRatingSchema } from '../validators/materialValidator';
import { getFileUrl, deleteFile, UploadedFile } from '../middlewares/upload';
import { AuthenticatedRequest } from '../types/auth';
import { aiService } from '../services/aiService';
import { pdfService } from '../services/pdfService';
import { materialRepository } from '../repositories/materialRepository';
import { userRepository } from '../repositories/userRepository';
import path from 'path';

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

      // Criar material no banco usando repository
      const material = await materialRepository.create({
        title: validatedData.title,
        description: validatedData.description,
        discipline: validatedData.discipline,
        grade: validatedData.grade,
        materialType: validatedData.materialType,
        subTopic: validatedData.subTopic,
        difficulty: validatedData.difficulty,
        fileUrl: uploadedFile.url,
        fileName: uploadedFile.originalName,
        author: {
          connect: { id: req.user!.id }
        }
      });

      // Incrementar contador de materiais do usuário
      await userRepository.incrementMaterialsCount(req.user!.id);

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

      // Preparar filtros
      const filters = {
        discipline: query.discipline,
        grade: query.grade,
        materialType: query.materialType,
        difficulty: query.difficulty,
        minRating: query.minRating,
        maxRating: query.maxRating,
        search: query.search
      };

      // Preparar paginação
      const pagination = {
        page: query.page,
        limit: Math.min(query.limit, 50), // Máximo 50 por página
        sortBy: query.sortBy,
        sortOrder: query.sortOrder
      };

      // Buscar materiais usando repository
      const result = await materialRepository.findMany(filters, pagination);

      // Enriquecer dados dos materiais
      const enrichedMaterials = result.materials.map(material => ({
        ...material,
        isNew: new Date().getTime() - new Date(material.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000, // Novo se menos de 7 dias
        isPopular: material.downloadCount > 10,
        isHighRated: material.avgRating >= 4.0 && material.totalRatings >= 3
      }));

      res.json({
        success: true,
        data: {
          materials: enrichedMaterials,
          pagination: {
            current: result.page,
            total: result.totalPages,
            count: result.total,
            limit: result.limit,
            hasNext: result.page < result.totalPages,
            hasPrev: result.page > 1
          },
          filters: {
            applied: filters,
            sorting: {
              sortBy: query.sortBy,
              sortOrder: query.sortOrder
            }
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

      const material = await materialRepository.findById(id);

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
      const existingMaterial = await materialRepository.findById(id);

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

      // Atualizar material usando repository
      const updatedMaterial = await materialRepository.update(id, validatedData);

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
      const existingMaterial = await materialRepository.findById(id);

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

      // Deletar material usando repository
      await materialRepository.delete(id);

      // Deletar arquivo físico se existir
      if (existingMaterial.fileUrl) {
        const filename = existingMaterial.fileUrl.split('/').pop();
        if (filename) {
          deleteFile(filename);
        }
      }

      // Decrementar contador de materiais do usuário
      await userRepository.decrementMaterialsCount(req.user!.id);

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

      const material = await materialRepository.findById(id);

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

      // Incrementar contador de download usando repository
      await materialRepository.incrementDownloadCount(id);

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
      const material = await materialRepository.findById(id);

      if (!material) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado'
        });
      }

      // Criar/atualizar avaliação usando repository
      const rating = await materialRepository.upsertRating(
        id,
        req.user!.id,
        validatedData.rating,
        validatedData.comment
      );

      res.json({
        success: true,
        data: rating,
        message: 'Avaliação registrada com sucesso'
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

      const pagination = {
        page: query.page,
        limit: query.limit
      };

      // Buscar materiais do usuário usando repository
      const result = await materialRepository.findByAuthor(req.user!.id, pagination);

      res.json({
        success: true,
        data: {
          materials: result.materials,
          pagination: {
            current: result.page,
            total: result.totalPages,
            count: result.total,
            limit: result.limit
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
      const stats = await materialRepository.getStats();

      res.json({
        success: true,
        data: stats
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

      // Buscar materiais similares usando repository
      const similarMaterials = await materialRepository.findSimilar(id, limit);

      if (similarMaterials.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Material não encontrado ou não há materiais similares'
        });
      }

      res.json({
        success: true,
        data: {
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

      // Buscar material usando repository
      const material = await materialRepository.findById(id);

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
