import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuários de exemplo
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.create({
    data: {
      name: 'Maria Silva',
      email: 'maria@escola.com',
      password: hashedPassword,
      school: 'Escola Estadual Santos Dumont',
    },
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'João Santos',
      email: 'joao@escola.com',
      password: hashedPassword,
      school: 'Colégio Municipal Dom Pedro',
    },
  });

  console.log('✅ Usuários criados');

  // Criar materiais de exemplo
  const material1 = await prisma.material.create({
    data: {
      title: 'Introdução à Matemática Básica',
      description: 'Material completo sobre operações básicas de matemática para o ensino fundamental.',
      discipline: 'Matemática',
      grade: '5º ano',
      materialType: 'LESSON_PLAN',
      subTopic: 'Operações básicas',
      difficulty: 'EASY',
      authorId: user1.id,
    },
  });

  const material2 = await prisma.material.create({
    data: {
      title: 'Exercícios de Português - Verbos',
      description: 'Lista de exercícios sobre conjugação verbal e tempos verbais.',
      discipline: 'Português',
      grade: '7º ano',
      materialType: 'EXERCISE',
      subTopic: 'Verbos e conjugações',
      difficulty: 'MEDIUM',
      authorId: user2.id,
    },
  });

  const material3 = await prisma.material.create({
    data: {
      title: 'História do Brasil - República',
      description: 'Apresentação sobre o período republicano no Brasil.',
      discipline: 'História',
      grade: '9º ano',
      materialType: 'PRESENTATION',
      subTopic: 'República Brasileira',
      difficulty: 'HARD',
      authorId: user1.id,
    },
  });

  console.log('✅ Materiais criados');

  // Criar avaliações de exemplo
  await prisma.rating.create({
    data: {
      rating: 5,
      comment: 'Excelente material, muito didático!',
      materialId: material1.id,
      userId: user2.id,
    },
  });

  await prisma.rating.create({
    data: {
      rating: 4,
      comment: 'Bom conteúdo, mas poderia ter mais exemplos.',
      materialId: material2.id,
      userId: user1.id,
    },
  });

  console.log('✅ Avaliações criadas');

  // Atualizar contadores
  await prisma.material.update({
    where: { id: material1.id },
    data: {
      avgRating: 5.0,
      totalRatings: 1,
      downloadCount: 15,
    },
  });

  await prisma.material.update({
    where: { id: material2.id },
    data: {
      avgRating: 4.0,
      totalRatings: 1,
      downloadCount: 8,
    },
  });

  await prisma.user.update({
    where: { id: user1.id },
    data: { materialsCount: 2 },
  });

  await prisma.user.update({
    where: { id: user2.id },
    data: { materialsCount: 1 },
  });

  console.log('✅ Contadores atualizados');
  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });