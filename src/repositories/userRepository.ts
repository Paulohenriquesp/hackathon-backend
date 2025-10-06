import prisma from '../database';

export class UserRepository {
  /**
   * Buscar usuário por ID
   */
  async findById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });
  }

  /**
   * Buscar usuário por email
   */
  async findByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { email }
    });
  }

  /**
   * Criar usuário
   */
  async create(data: {
    name: string;
    email: string;
    password: string;
    school?: string | null;
  }) {
    return await prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });
  }

  /**
   * Atualizar usuário
   */
  async update(id: string, data: {
    name?: string;
    email?: string;
    school?: string | null;
  }) {
    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        school: true,
        materialsCount: true,
        createdAt: true
      }
    });
  }

  /**
   * Incrementar contador de materiais
   */
  async incrementMaterialsCount(id: string) {
    return await prisma.user.update({
      where: { id },
      data: {
        materialsCount: { increment: 1 }
      }
    });
  }

  /**
   * Decrementar contador de materiais
   */
  async decrementMaterialsCount(id: string) {
    return await prisma.user.update({
      where: { id },
      data: {
        materialsCount: { decrement: 1 }
      }
    });
  }

  /**
   * Obter estatísticas do usuário
   */
  async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        materialsCount: true
      }
    });

    if (!user) return null;

    // Total de downloads recebidos
    const materials = await prisma.material.findMany({
      where: { authorId: userId },
      select: { downloadCount: true, avgRating: true }
    });

    const totalDownloads = materials.reduce((sum, m) => sum + m.downloadCount, 0);
    const avgRating = materials.length > 0
      ? materials.reduce((sum, m) => sum + m.avgRating, 0) / materials.length
      : 0;

    // Uploads do mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const uploadsThisMonth = await prisma.material.count({
      where: {
        authorId: userId,
        createdAt: { gte: firstDayOfMonth }
      }
    });

    return {
      totalMaterials: user.materialsCount,
      totalDownloads,
      avgRating,
      uploadsThisMonth
    };
  }

  /**
   * Atualizar senha
   */
  async updatePassword(id: string, hashedPassword: string) {
    return await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
  }
}

// Exportar instância única (Singleton)
export const userRepository = new UserRepository();
