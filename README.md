# 🔧 Hackathon Backend - Banco Colaborativo de Recursos Didáticos

API REST em Node.js + Express + TypeScript para sistema de compartilhamento de materiais didáticos.

## 🚀 Tecnologias

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Banco**: PostgreSQL + Prisma ORM
- **Autenticação**: JWT
- **Upload**: Multer
- **Validação**: Zod
- **Containerização**: Docker

## ⚡ Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis
cp .env.example .env

# 3. Subir PostgreSQL
npm run docker:up

# 4. Configurar banco
npm run db:push
npm run db:generate

# 5. Executar
npm run dev
```

## 🔧 Scripts Disponíveis

```bash
npm run dev             # Desenvolvimento
npm run build           # Build produção
npm run start           # Produção
npm run docker:up       # Subir PostgreSQL
npm run docker:down     # Parar containers
npm run docker:logs     # Ver logs
npm run docker:reset    # Reset banco
npm run db:push         # Aplicar schema
npm run db:generate     # Gerar cliente
npm run db:studio       # Interface Prisma
npm run db:migrate      # Criar migração
npm run lint            # ESLint
npm run format          # Prettier
```

## 🌐 Endpoints

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login

### Materiais
- `GET /api/materials` - Listar materiais
- `POST /api/materials` - Criar material (auth)
- `GET /api/materials/:id` - Detalhes
- `POST /api/materials/:id/like` - Curtir (auth)

### Utilitários
- `GET /health` - Health check

## 🗄️ Banco de Dados

**PostgreSQL (Docker)**
- Host: localhost:5432
- Database: banco_didatico
- User: admin
- Password: admin123

**pgAdmin**: http://localhost:5050
**Prisma Studio**: `npm run db:studio`

## 📁 Estrutura

```
src/
├── app.ts              # Configuração Express
├── server.ts           # Inicialização
├── config/             # Configurações
├── controllers/        # Lógica de negócio
├── middlewares/        # Auth, Upload, Validação
├── routes/             # Rotas API
├── validators/         # Validações Zod
├── utils/              # Utilitários
└── types/              # Tipos TypeScript
```

## 🔐 Variáveis de Ambiente

```env
DATABASE_URL="postgresql://admin:admin123@localhost:5432/banco_didatico?schema=public"
JWT_SECRET="seu_jwt_secret"
PORT=3001
NODE_ENV=development
```

## 🧪 Testando a API

```bash
# Health check
curl http://localhost:3001/health

# Cadastro
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"João","email":"joao@test.com","password":"123456"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"joao@test.com","password":"123456"}'
```

## 🔄 Desenvolvimento

1. **Configuração**: Use `config/env.ts` para variáveis
2. **Validação**: Crie schemas em `validators/`
3. **Rotas**: Adicione em `routes/`
4. **Controllers**: Lógica em `controllers/`
5. **Middlewares**: Auth/Upload em `middlewares/`