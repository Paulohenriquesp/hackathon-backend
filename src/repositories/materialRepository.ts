import prisma from '../database';

export interface MaterialFilters {
  discipline?: string;
  grade?: string;
  materialType?: string;
  difficulty?: string;
  authorId?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class MaterialRepository {
  /**
   * Buscar todos os materiais com filtros e paginação
   */
  async findMany(
    filters: MaterialFilters = {},
    pagination: PaginationParams = {}
  ) {
    const {
      discipline,
      grade,
      materialType,
      difficulty,
      authorId,
      minRating,
      maxRating,
      search
    } = filters;

    const {
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination;

    const skip = (page - 1) * limit;

    // Construir filtro where
    const where: any = {
      ...(discipline && { discipline }),
      ...(grade && { grade }),
      ...(materialType && { materialType }),
      ...(difficulty && { difficulty }),
      ...(authorId && { authorId }),
      ...(minRating !== undefined && { avgRating: { gte: minRating } }),
      ...(maxRating !== undefined && { avgRating: { lte: maxRating } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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
      }),
      prisma.material.count({ where })
    ]);

    return {
      materials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Buscar material por ID
   */
  async findById(id: string) {
    return await prisma.material.findUnique({
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
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  /**
   * Criar material
   */
  async create(data: any) {
    return await prisma.material.create({
      data,
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
  }

  /**
   * Atualizar material
   */
  async update(id: string, data: any) {
    return await prisma.material.update({
      where: { id },
      data,
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
  }

  /**
   * Deletar material
   */
  async delete(id: string) {
    return await prisma.material.delete({
      where: { id }
    });
  }

  /**
   * Buscar materiais similares (mesma disciplina e série)
   */
  async findSimilar(materialId: string, limit: number = 5) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      select: { discipline: true, grade: true }
    });

    if (!material) return [];

    return await prisma.material.findMany({
      where: {
        discipline: material.discipline,
        grade: material.grade,
        id: { not: materialId }
      },
      take: limit,
      orderBy: { avgRating: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            school: true
          }
        }
      }
    });
  }

  /**
   * Incrementar contador de downloads
   */
  async incrementDownloadCount(id: string) {
    return await prisma.material.update({
      where: { id },
      data: {
        downloadCount: { increment: 1 }
      }
    });
  }

  /**
   * Buscar materiais do usuário
   */
  async findByAuthor(authorId: string, pagination: PaginationParams = {}) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where: { authorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.material.count({ where: { authorId } })
    ]);

    return {
      materials,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Obter estatísticas gerais
   */
  async getStats() {
    const [totalMaterials, avgRating, totalDownloads] = await Promise.all([
      prisma.material.count(),
      prisma.material.aggregate({
        _avg: { avgRating: true }
      }),
      prisma.material.aggregate({
        _sum: { downloadCount: true }
      })
    ]);

    return {
      totalMaterials,
      avgRating: avgRating._avg.avgRating || 0,
      totalDownloads: totalDownloads._sum.downloadCount || 0
    };
  }

  /**
   * Adicionar/atualizar avaliação
   */
  async upsertRating(materialId: string, userId: string, rating: number, comment?: string) {
    // Verificar se já existe avaliação
    const existingRating = await prisma.rating.findUnique({
      where: {
        materialId_userId: {
          materialId,
          userId
        }
      }
    });

    // Criar ou atualizar rating
    const ratingResult = await prisma.rating.upsert({
      where: {
        materialId_userId: {
          materialId,
          userId
        }
      },
      create: {
        materialId,
        userId,
        rating,
        comment
      },
      update: {
        rating,
        comment
      }
    });

    // Recalcular média de ratings
    const ratings = await prisma.rating.findMany({
      where: { materialId },
      select: { rating: true }
    });

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const totalRatings = ratings.length;

    // Atualizar material com nova média
    await prisma.material.update({
      where: { id: materialId },
      data: {
        avgRating,
        totalRatings
      }
    });

    return ratingResult;
  }
}

// Exportar instância única (Singleton)
export const materialRepository = new MaterialRepository();
