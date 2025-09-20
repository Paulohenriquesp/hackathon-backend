import { Request, Response } from 'express';
import prisma from '../database';
import { ResourceType } from '@prisma/client';

export const createMaterial = async (req: Request, res: Response) => {
  try {
    const { title, description, subject, gradeLevel, type, content } = req.body;
    const authorId = req.user?.id;
    const file = req.file;

    if (!authorId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!title || !description || !subject || !gradeLevel) {
      return res.status(400).json({ 
        error: 'Título, descrição, disciplina e série são obrigatórios' 
      });
    }

    const validTypes = Object.values(ResourceType);
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ 
        error: 'Tipo de recurso inválido' 
      });
    }

    const material = await prisma.resource.create({
      data: {
        title,
        description,
        content: content || '',
        subject,
        gradeLevel,
        type: type || ResourceType.DOCUMENT,
        fileUrl: file ? `/uploads/${file.filename}` : null,
        authorId
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            likes: true,
            reviews: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Material criado com sucesso',
      material
    });
  } catch (error) {
    console.error('Erro ao criar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getMaterials = async (req: Request, res: Response) => {
  try {
    const { subject, gradeLevel, page = 1, limit = 10 } = req.query;
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      isPublic: true
    };

    if (subject) {
      where.subject = {
        contains: subject as string,
        mode: 'insensitive'
      };
    }

    if (gradeLevel) {
      where.gradeLevel = {
        contains: gradeLevel as string,
        mode: 'insensitive'
      };
    }

    const [materials, total] = await Promise.all([
      prisma.resource.findMany({
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
              email: true
            }
          },
          _count: {
            select: {
              likes: true,
              reviews: true
            }
          }
        }
      }),
      prisma.resource.count({ where })
    ]);

    res.json({
      materials,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Erro ao buscar materiais:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getMaterialById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const material = await prisma.resource.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        reviews: {
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
            likes: true,
            reviews: true
          }
        }
      }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    if (!material.isPublic && material.authorId !== req.user?.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    res.json({ material });
  } catch (error) {
    console.error('Erro ao buscar material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const likeMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const material = await prisma.resource.findUnique({
      where: { id }
    });

    if (!material) {
      return res.status(404).json({ error: 'Material não encontrado' });
    }

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_resourceId: {
          userId,
          resourceId: id
        }
      }
    });

    if (existingLike) {
      await prisma.$transaction([
        prisma.like.delete({
          where: { id: existingLike.id }
        }),
        prisma.resource.update({
          where: { id },
          data: {
            likesCount: {
              decrement: 1
            }
          }
        })
      ]);

      res.json({ message: 'Like removido com sucesso', liked: false });
    } else {
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            resourceId: id
          }
        }),
        prisma.resource.update({
          where: { id },
          data: {
            likesCount: {
              increment: 1
            }
          }
        })
      ]);

      res.json({ message: 'Material curtido com sucesso', liked: true });
    }
  } catch (error) {
    console.error('Erro ao curtir material:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};