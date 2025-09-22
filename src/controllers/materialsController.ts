import { Request, Response } from 'express';
import prisma from '../database';
import { MaterialType, Difficulty } from '@prisma/client';

export const createMaterial = async (req: any, res: Response) => {
  try {
    const { 
      title, 
      description, 
      discipline, 
      grade, 
      materialType, 
      subTopic, 
      difficulty, 
 
    } = req.body;
    const authorId = req.user?.id;
    const file = req.file;

    if (!authorId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    if (!title || !description || !discipline || !grade) {
      return res.status(400).json({ 
        success: false,
        error: 'Título, descrição, disciplina e série são obrigatórios' 
      });
    }

    const validTypes = Object.values(MaterialType);
    if (materialType && !validTypes.includes(materialType)) {
      return res.status(400).json({ 
        success: false,
        error: 'Tipo de material inválido' 
      });
    }

    const validDifficulties = Object.values(Difficulty);
    if (difficulty && !validDifficulties.includes(difficulty)) {
      return res.status(400).json({ 
        success: false,
        error: 'Dificuldade inválida' 
      });
    }

    const material = await prisma.material.create({
      data: {
        title,
        description,
        discipline,
        grade,
        materialType: materialType || MaterialType.DOCUMENT,
        subTopic,
        difficulty: difficulty || Difficulty.MEDIUM,
        fileUrl: file ? `/uploads/${file.filename}` : null,
        fileName: file ? file.originalname : null,
        authorId
      },
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
      }
    });

    res.status(201).json({
      success: true,
      message: 'Material criado com sucesso',
      data: material
    });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { 
      discipline, 
      grade, 
      materialType,
      difficulty,
      search,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};

    if (discipline) {
      where.discipline = {
        contains: discipline as string,
        mode: 'insensitive'
      };
    }

    if (grade) {
      where.grade = {
        contains: grade as string,
        mode: 'insensitive'
      };
    }

    if (materialType) {
      where.materialType = materialType;
    }

    if (difficulty) {
      where.difficulty = difficulty;
    }


    if (search) {
      where.OR = [
        {
          title: {
            contains: search as string,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search as string,
            mode: 'insensitive'
          }
        }
      ];
    }

    const [materials, total] = await Promise.all([
      prisma.material.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              school: true
            }
          },
          _count: {
            select: {
              ratings: true
            }
          }
        }
      }),
      prisma.material.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        materials,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

export const getMaterialById = async (req: Request, res: Response) => {
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
        },
        _count: {
          select: {
            ratings: true
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

    // Increment download count
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
      data: material 
    });
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

export const rateMaterial = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ 
        success: false,
        error: 'Rating deve ser entre 1 e 5' 
      });
    }

    const material = await prisma.material.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material não encontrado' 
      });
    }

    const existingRating = await prisma.rating.findUnique({
      where: {
        materialId_userId: {
          materialId: id,
          userId
        }
      }
    });

    let result;
    if (existingRating) {
      result = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { rating, comment },
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
      result = await prisma.rating.create({
        data: {
          materialId: id,
          userId,
          rating,
          comment
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

    // Update material's average rating
    const ratings = await prisma.rating.findMany({
      where: { materialId: id },
      select: { rating: true }
    });

    const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    
    await prisma.material.update({
      where: { id },
      data: {
        avgRating,
        totalRatings: ratings.length
      }
    });

    res.json({ 
      success: true,
      message: existingRating ? 'Avaliação atualizada com sucesso' : 'Material avaliado com sucesso',
      data: result 
    });
  } catch (error) {
    console.error('Erro ao avaliar material:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

export const updateMaterial = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const material = await prisma.material.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material não encontrado' 
      });
    }

    if (material.authorId !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Não autorizado a editar este material' 
      });
    }

    const updatedMaterial = await prisma.material.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            school: true
          }
        },
        _count: {
          select: {
            ratings: true
          }
        }
      }
    });

    res.json({ 
      success: true,
      message: 'Material atualizado com sucesso',
      data: updatedMaterial 
    });
  } catch (error) {
    console.error('Erro ao atualizar material:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
};

export const deleteMaterial = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuário não autenticado' 
      });
    }

    const material = await prisma.material.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ 
        success: false,
        error: 'Material não encontrado' 
      });
    }

    if (material.authorId !== userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Não autorizado a deletar este material' 
      });
    }

    await prisma.material.delete({
      where: { id }
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
};