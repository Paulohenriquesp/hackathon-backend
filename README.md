# 🔧 Hackathon Backend - Banco Colaborativo de Recursos Didáticos

API REST em Node.js + Express + TypeScript para sistema de compartilhamento de materiais didáticos com **geração de planos de aula e atividades por IA** (OpenAI GPT-4o-mini).

## 🚀 Tecnologias

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Banco**: PostgreSQL + Prisma ORM
- **Autenticação**: JWT (JSON Web Tokens)
- **Upload**: Multer (arquivos locais)
- **Validação**: Zod (schemas robustos)
- **IA**: OpenAI SDK (GPT-4o-mini)
- **PDF**: PDF-Parse (extração de texto)
- **Containerização**: Docker + Docker Compose
- **CORS**: Habilitado para frontend

## ⚡ Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais (DATABASE_URL, JWT_SECRET, OPENAI_API_KEY)

# 3. Subir PostgreSQL via Docker
npm run docker:up

# 4. Configurar banco de dados
npm run db:push      # Aplicar schema do Prisma
npm run db:generate  # Gerar cliente Prisma

# 5. Executar servidor em desenvolvimento
npm run dev

# Servidor rodando em http://localhost:3001
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev             # Servidor com hot-reload (ts-node-dev)
npm run build           # Build TypeScript para JavaScript
npm run start           # Produção (node dist/server.js)

# Docker (PostgreSQL)
npm run docker:up       # Subir containers (PostgreSQL + pgAdmin)
npm run docker:down     # Parar containers
npm run docker:logs     # Ver logs dos containers
npm run docker:reset    # Reset completo (para e remove tudo)

# Banco de Dados (Prisma)
npm run db:push         # Aplicar schema ao banco (dev)
npm run db:generate     # Gerar cliente Prisma
npm run db:studio       # Abrir Prisma Studio (UI do banco)
npm run db:migrate      # Criar migração (produção)
npm run db:seed         # Popular banco com dados de teste

# Qualidade de Código
npm run lint            # ESLint
npm run format          # Prettier
npm run type-check      # TypeScript check
```

## 🌐 Endpoints da API

### 🔐 Autenticação (`/api/auth`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/auth/register` | Cadastro de novo usuário | ❌ |
| POST | `/api/auth/login` | Login com email/senha | ❌ |
| GET | `/api/auth/profile` | Obter perfil do usuário logado | ✅ |
| PUT | `/api/auth/profile` | Atualizar perfil (nome, escola) | ✅ |

### 📚 Materiais (`/api/materials`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/materials` | Listar materiais (com filtros) | ❌ |
| GET | `/api/materials/stats` | Estatísticas gerais | ❌ |
| GET | `/api/materials/:id` | Detalhes do material | ❌ |
| GET | `/api/materials/:id/similar` | Materiais similares | ✅ |
| GET | `/api/materials/:id/download` | Download do arquivo | ✅ |
| POST | `/api/materials` | Criar material (com upload) | ✅ |
| PUT | `/api/materials/:id` | Atualizar material | ✅ |
| DELETE | `/api/materials/:id` | Deletar material | ✅ |
| POST | `/api/materials/:id/rate` | Avaliar material (1-5 estrelas) | ✅ |
| GET | `/api/materials/user/my-materials` | Materiais do usuário logado | ✅ |

### 🤖 IA - Geração de Conteúdo (`/api/materials`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/materials/:id/generate-activities` | ✨ Gerar plano de aula + atividades com IA | ✅ |

### 📊 Usuários (`/api/users`)

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/api/users/stats` | Estatísticas do usuário | ✅ |

### 🏥 Utilitários

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/health` | Health check do servidor | ❌ |

## 🤖 Funcionalidade de IA - Geração de Planos de Aula

### ✨ O que a IA gera?

Endpoint: `POST /api/materials/:id/generate-activities`

A IA (GPT-4o-mini) analisa o conteúdo do material didático e gera:

#### 📋 Plano de Aula Completo
- **Título criativo** para a aula
- **Resumo** do conteúdo (2-3 frases)
- **Objetivos de aprendizagem** (alinhados à BNCC)
- **Etapas da aula** (Introdução, Desenvolvimento, Fechamento):
  - Descrição detalhada de cada etapa
  - Duração estimada
  - Recursos necessários por etapa
- **Materiais consolidados** (lista completa)
- **Métodos de avaliação** (como verificar aprendizado)
- **Dicas para o professor** (preparação, possíveis dificuldades)
- **Tempo total estimado** (~50 minutos)

#### 📝 Atividades Educacionais
- **Exercícios abertos** (3+)
- **Questões de múltipla escolha** (3+):
  - 4 alternativas
  - Resposta correta variada
  - Explicação da resposta
- **Questões dissertativas** (2+)
- **Atividades práticas** (experimentos, projetos, etc.)

### 🔧 Como funciona?

1. **Extração de conteúdo**: O backend extrai texto do arquivo do material (PDF, DOC, etc.)
2. **Chamada à OpenAI**: Envia conteúdo + metadados (disciplina, série, dificuldade) para GPT-4o-mini
3. **Prompt estruturado**: Solicita JSON formatado com plano de aula + atividades
4. **Validação**: Backend valida estrutura da resposta
5. **Retorno**: JSON completo para o frontend exibir

### 📦 Exemplo de Resposta (JSON)

```json
{
  "title": "Explorando o Ciclo da Água",
  "summary": "Aula sobre o ciclo hidrológico...",
  "objectives": [
    "Compreender as etapas do ciclo da água",
    "Identificar a importância do ciclo para o planeta"
  ],
  "lesson_plan": {
    "duration_total": "50 min",
    "stages": [
      {
        "stage": "Introdução",
        "description": "Apresentar o tema com vídeo ilustrativo...",
        "duration": "10 min",
        "resources": ["Projetor", "Vídeo educativo"]
      },
      {
        "stage": "Desenvolvimento",
        "description": "Explicação detalhada das etapas...",
        "duration": "30 min",
        "resources": ["Quadro", "Giz", "Cartazes"]
      },
      {
        "stage": "Fechamento",
        "description": "Recapitulação e discussão...",
        "duration": "10 min",
        "resources": ["Questionário impresso"]
      }
    ],
    "required_materials": ["Projetor", "Quadro", "Giz", "Cartazes", "Questionário"],
    "assessment_methods": [
      "Observação da participação em discussões",
      "Análise das respostas no questionário"
    ],
    "teacher_tips": [
      "Preparar vídeo com antecedência",
      "Ter exemplos locais do ciclo da água"
    ]
  },
  "activities": {
    "exercises": [
      "Descreva as etapas do ciclo da água",
      "Explique a importância da evaporação"
    ],
    "multiple_choice": [
      {
        "question": "Qual é a primeira etapa do ciclo da água?",
        "options": ["A) Condensação", "B) Evaporação", "C) Precipitação", "D) Infiltração"],
        "correct_answer": "B",
        "explanation": "A evaporação inicia o ciclo quando a água..."
      }
    ],
    "essay_questions": [
      "Como o desmatamento pode afetar o ciclo da água?"
    ],
    "practical_activities": [
      "Construir um terrário para observar o ciclo em miniatura"
    ]
  },
  "metadata": {
    "generated_at": "2025-10-03T10:30:00Z",
    "difficulty_level": "MEDIUM",
    "estimated_prep_time": "15 min"
  }
}
```

### ⚙️ Configuração da IA

```typescript
// src/services/aiService.ts
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    {
      role: 'system',
      content: 'Você é um assistente pedagógico especializado...'
    },
    {
      role: 'user',
      content: prompt // Prompt estruturado com o material
    }
  ],
  temperature: 0.7,
  max_tokens: 3000,
  response_format: { type: 'json_object' }
});
```

### 🔒 Segurança e Limites

- ✅ Endpoint protegido (requer autenticação JWT)
- ✅ Validação rigorosa do JSON de resposta
- ✅ Limite de 8000 caracteres do conteúdo do material
- ✅ Tratamento de erros específicos:
  - `insufficient_quota`: Limite da API excedido
  - `rate_limit_exceeded`: Muitas requisições
  - `invalid_api_key`: Chave inválida
- ⚠️ Rate limiting recomendado (implementar no futuro)
- ⚠️ Cache de respostas recomendado (implementar no futuro)

## 🗄️ Banco de Dados (PostgreSQL + Prisma)

### Configuração Docker

**PostgreSQL**:
- Host: `localhost:5432`
- Database: `banco_didatico`
- User: `admin`
- Password: `admin123`

**pgAdmin** (Interface Web):
- URL: http://localhost:5050
- Email: `admin@admin.com`
- Password: `admin`

**Prisma Studio**:
```bash
npm run db:studio
# Abre em http://localhost:5555
```

### 📊 Schema do Banco (Prisma)

#### User (Usuário)
```prisma
model User {
  id             String   @id @default(cuid())
  name           String
  email          String   @unique
  password       String   // Hash bcrypt
  school         String?
  materialsCount Int      @default(0)
  createdAt      DateTime @default(now())

  materials Material[]
  ratings   Rating[]
}
```

#### Material (Material Didático)
```prisma
model Material {
  id                String       @id @default(cuid())
  title             String       // 3-100 chars
  description       String       // 10-500 chars
  discipline        String       // Ex: Matemática
  grade             String       // Ex: 6º ano
  materialType      MaterialType // LESSON_PLAN, EXERCISE, etc.
  subTopic          String?      // 3-20 chars
  difficulty        Difficulty   // EASY, MEDIUM, HARD
  fileUrl           String?      // Caminho local do arquivo
  fileName          String?
  avgRating         Float        @default(0.0)
  totalRatings      Int          @default(0)
  downloadCount     Int          @default(0)
  createdAt         DateTime     @default(now())

  authorId String
  author   User   @relation(...)
  ratings  Rating[]
}
```

#### Rating (Avaliação)
```prisma
model Rating {
  id        String   @id @default(cuid())
  rating    Int      @db.SmallInt // 1-5
  comment   String?  // Máx 500 chars
  createdAt DateTime @default(now())

  materialId String
  material   Material @relation(...)
  userId     String
  user       User     @relation(...)

  @@unique([materialId, userId]) // Um usuário só pode avaliar uma vez
}
```

#### Enums
```prisma
enum MaterialType {
  LESSON_PLAN      // Plano de aula
  EXERCISE         // Exercício
  PRESENTATION     // Apresentação
  VIDEO            // Vídeo
  DOCUMENT         // Documento
  WORKSHEET        // Folha de atividades
  QUIZ             // Quiz/Questionário
  PROJECT          // Projeto
  GAME             // Jogo educativo
  OTHER            // Outros
}

enum Difficulty {
  EASY             // Fácil
  MEDIUM           // Médio
  HARD             // Difícil
}
```

## 📁 Estrutura do Projeto

```
hackathon-backend/
├── src/
│   ├── app.ts                    # Configuração do Express
│   ├── server.ts                 # Inicialização do servidor
│   ├── database.ts               # Cliente Prisma
│   ├── config/
│   │   └── env.ts               # Variáveis de ambiente
│   ├── controllers/
│   │   ├── authController.ts    # Lógica de autenticação
│   │   └── materialController.ts # Lógica de materiais + IA
│   ├── middlewares/
│   │   ├── auth.ts              # Middleware JWT
│   │   ├── authMiddleware.ts    # Verificação de token
│   │   ├── upload.ts            # Multer (upload de arquivos)
│   │   └── validate.ts          # Validação Zod
│   ├── routes/
│   │   ├── authRoutes.ts        # Rotas de autenticação
│   │   └── materialRoutes.ts    # Rotas de materiais
│   ├── services/
│   │   ├── aiService.ts         # ✨ Integração OpenAI
│   │   └── pdfService.ts        # Extração de texto PDF
│   ├── validators/
│   │   ├── authValidator.ts     # Schemas de autenticação
│   │   ├── materialValidator.ts # Schemas de materiais
│   │   └── userValidator.ts     # Schemas de usuário
│   ├── types/
│   │   ├── express.d.ts         # Tipagens Express
│   │   └── auth.ts              # Tipos de autenticação
│   └── utils/
│       ├── errorHandler.ts      # Tratamento de erros
│       └── response.ts          # Respostas padronizadas
├── prisma/
│   └── schema.prisma            # Schema do banco
├── uploads/                     # Arquivos enviados
├── docker-compose.yml           # PostgreSQL + pgAdmin
├── .env                         # Variáveis de ambiente
├── .env.example                 # Template .env
├── tsconfig.json                # Configuração TypeScript
└── package.json                 # Dependências
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Banco de Dados
DATABASE_URL="postgresql://admin:admin123@localhost:5432/banco_didatico?schema=public"

# Autenticação
JWT_SECRET="seu_jwt_secret_super_secreto_aqui_12345"

# Servidor
PORT=3001
NODE_ENV=development

# ✨ OpenAI (para geração de atividades com IA)
OPENAI_API_KEY="sk-proj-...sua-chave-aqui..."

# Upload
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=10485760  # 10MB em bytes
```

### 🔑 Obtendo a OPENAI_API_KEY

1. Criar conta em https://platform.openai.com/
2. Ir em "API keys" no dashboard
3. Clicar em "Create new secret key"
4. Copiar a chave (começa com `sk-proj-...`)
5. Adicionar no `.env` como `OPENAI_API_KEY`
6. ⚠️ **Importante**: Não compartilhar a chave publicamente

## 🧪 Testando a API

### Health Check
```bash
curl http://localhost:3001/health
```

### Cadastro
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "João Silva",
    "email": "joao@escola.com",
    "password": "senha123",
    "school": "Escola Municipal ABC"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@escola.com",
    "password": "senha123"
  }'

# Resposta: { "token": "eyJhbGc...", "user": {...} }
```

### Listar Materiais (com filtros)
```bash
# Todos os materiais
curl http://localhost:3001/api/materials

# Com filtros
curl "http://localhost:3001/api/materials?discipline=Matemática&grade=6º ano&difficulty=MEDIUM&sortBy=avgRating&sortOrder=desc&page=1&limit=10"
```

### Criar Material (com arquivo)
```bash
curl -X POST http://localhost:3001/api/materials \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -F "title=Geometria Básica" \
  -F "description=Material sobre formas geométricas" \
  -F "discipline=Matemática" \
  -F "grade=5º ano" \
  -F "materialType=LESSON_PLAN" \
  -F "difficulty=EASY" \
  -F "subTopic=Formas 2D" \
  -F "file=@/caminho/para/arquivo.pdf"
```

### Avaliar Material
```bash
curl -X POST http://localhost:3001/api/materials/MATERIAL_ID/rate \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Excelente material! Muito didático e completo."
  }'
```

### ✨ Gerar Plano de Aula + Atividades com IA
```bash
curl -X POST http://localhost:3001/api/materials/MATERIAL_ID/generate-activities \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  -H "Content-Type: application/json"

# Resposta: JSON completo com plano de aula + atividades
```

### Download de Material
```bash
curl -X GET http://localhost:3001/api/materials/MATERIAL_ID/download \
  -H "Authorization: Bearer SEU_TOKEN_JWT" \
  --output arquivo-baixado.pdf
```

## 🔒 Autenticação JWT

### Como funciona?

1. **Login**: Cliente envia email + senha
2. **Verificação**: Backend valida credenciais no banco
3. **Token**: Backend gera JWT assinado com `JWT_SECRET`
4. **Resposta**: Retorna `{ token, user }`
5. **Requests**: Cliente envia token no header `Authorization: Bearer <token>`
6. **Middleware**: Backend valida token em rotas protegidas

### Exemplo de Uso no Frontend
```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await response.json();
localStorage.setItem('token', token);

// Request protegida
const materials = await fetch('/api/materials', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
});
```

## 🔄 Fluxo de Upload de Material

1. Frontend envia `multipart/form-data` com arquivo + metadados
2. Middleware `multer` salva arquivo em `./uploads/`
3. Middleware `validateUploadedFile` verifica tipo e tamanho
4. Controller cria registro no banco com `fileUrl`
5. Retorna material criado com URL do arquivo

## 📊 Filtros Avançados de Materiais

Endpoint: `GET /api/materials?[filtros]`

### Filtros Disponíveis
- `discipline`: Disciplina (ex: "Matemática")
- `grade`: Série (ex: "6º ano")
- `materialType`: Tipo (LESSON_PLAN, EXERCISE, etc.)
- `difficulty`: Dificuldade (EASY, MEDIUM, HARD)
- `author`: ID ou nome do autor
- `minRating`: Rating mínimo (1-5)
- `maxRating`: Rating máximo (1-5)
- `dateFrom`: Data início (YYYY-MM-DD)
- `dateTo`: Data fim (YYYY-MM-DD)
- `search`: Busca em título, descrição, disciplina
- `hasFile`: Apenas com arquivo (`true`)
- `featured`: Alta avaliação (`true`)

### Paginação
- `page`: Número da página (padrão: 1)
- `limit`: Itens por página (padrão: 10)

### Ordenação
- `sortBy`: Campo (createdAt, title, avgRating, downloadCount, totalRatings)
- `sortOrder`: Ordem (asc, desc)

### Exemplo Completo
```
GET /api/materials?
  discipline=Matemática&
  grade=6º ano&
  difficulty=MEDIUM&
  minRating=4&
  search=geometria&
  sortBy=avgRating&
  sortOrder=desc&
  page=1&
  limit=10
```

## 🚀 Deploy (Produção)

### 1. Build
```bash
npm run build
# Gera pasta dist/
```

### 2. Configurar Variáveis no Servidor
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public"
JWT_SECRET="producao_secret_forte_12345"
OPENAI_API_KEY="sk-proj-..."
PORT=3001
NODE_ENV=production
```

### 3. Migração do Banco
```bash
npm run db:migrate
```

### 4. Iniciar Servidor
```bash
npm run start
```

### Alternativa: Docker (Futuro)
```bash
# Criar Dockerfile para o backend
docker build -t backend-didatico .
docker run -p 3001:3001 backend-didatico
```

## 📋 Roadmap

### ✅ Funcionalidades Implementadas
- [x] Sistema de autenticação JWT completo
- [x] CRUD de materiais didáticos
- [x] Upload de arquivos (PDF, DOC, PPT, XLS)
- [x] Sistema de avaliações (rating + comentários)
- [x] Download de materiais
- [x] Filtros avançados e busca
- [x] Paginação de resultados
- [x] ✨ Geração de planos de aula com IA (OpenAI GPT-4o-mini)
- [x] ✨ Geração de atividades educacionais com IA
- [x] Extração de texto de PDFs
- [x] Validação com Zod
- [x] Estatísticas de usuário
- [x] Materiais similares
- [x] Edição de perfil
- [x] Soft delete com cascata

### 🔮 Próximas Funcionalidades
- [ ] Sistema de favoritos
- [ ] Comentários em materiais
- [ ] Notificações em tempo real (WebSocket)
- [ ] Upload para S3/CloudStorage
- [ ] ✨ Rate limiting para API OpenAI
- [ ] ✨ Cache de atividades geradas (Redis)
- [ ] ✨ Mais modelos de IA (Claude, Gemini)
- [ ] ✨ Geração de questões de prova
- [ ] ✨ Análise de texto (resumos, traduções)
- [ ] Chat entre professores
- [ ] Sistema de tags
- [ ] Estatísticas globais
- [ ] Logs estruturados (Winston)

### 🛠️ Melhorias Técnicas
- [ ] Testes unitários (Jest)
- [ ] Testes de integração (Supertest)
- [ ] CI/CD (GitHub Actions)
- [ ] Documentação Swagger/OpenAPI
- [ ] Rate limiting global
- [ ] Compressão de respostas (gzip)
- [ ] Helmet.js (segurança headers)
- [ ] Monitoring (Sentry, DataDog)
- [ ] Performance profiling
- [ ] Database indexing otimizado
- [ ] Migrations em produção

## 🐛 Troubleshooting

### Erro: "OPENAI_API_KEY não configurada"
- Verifique se a chave está no arquivo `.env`
- Reinicie o servidor após adicionar a chave

### Erro: "Cannot connect to database"
- Verifique se o PostgreSQL está rodando: `npm run docker:up`
- Confirme DATABASE_URL no `.env`

### Erro: "Token inválido"
- Token expirado: fazer login novamente
- JWT_SECRET diferente: verificar .env

### Erro no upload: "File too large"
- Limite padrão: 10MB
- Aumentar MAX_FILE_SIZE no .env

### Erro: "Rate limit exceeded" (OpenAI)
- Aguardar alguns segundos
- Verificar cota da API no dashboard OpenAI

## 📞 Suporte

- **Documentação Prisma**: https://www.prisma.io/docs
- **Documentação OpenAI**: https://platform.openai.com/docs
- **Documentação Express**: https://expressjs.com/
- **Comunidade**: GitHub Issues do projeto

---

## 🎯 Status do Projeto

✅ **Backend totalmente funcional e integrado com frontend**, incluindo:
- API REST completa
- Autenticação JWT segura
- Upload e download de arquivos
- Sistema de avaliações robusto
- Filtros e busca avançados
- ✨ **Geração de planos de aula e atividades com IA**
- Banco PostgreSQL com Prisma ORM
- Validação com Zod
- Tratamento de erros completo

**API rodando em**: `http://localhost:3001` 🚀
