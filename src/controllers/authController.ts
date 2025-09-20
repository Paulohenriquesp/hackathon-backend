import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../database';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, school } = req.body;

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email já está em uso' 
      });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        school: school || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Professor cadastrado com sucesso',
      data: { user, token }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      });
    }

    // Gerar token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Remover senha da resposta
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: { user: userWithoutPassword, token }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Não autorizado' 
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true,
        materials: {
          select: {
            id: true,
            title: true,
            discipline: true,
            grade: true,
            avgRating: true,
            downloadCount: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Usuário não encontrado' 
      });
    }

    return res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const { name, school } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Não autorizado' 
      });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name && { name }),
        ...(school !== undefined && { school }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });

    return res.json({
      success: true,
      message: 'Perfil atualizado com sucesso',
      data: user
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    });
  }
};