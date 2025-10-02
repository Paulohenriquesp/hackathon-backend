# 🤖 Feature: Geração de Atividades com IA

## 📋 Visão Geral

Esta feature permite que professores gerem automaticamente atividades educacionais a partir de materiais didáticos já cadastrados na plataforma, utilizando inteligência artificial da OpenAI.

## ✨ Funcionalidades

A IA gera automaticamente:

1. **Resumo do Conteúdo** - Síntese clara e objetiva do material
2. **Objetivos de Aprendizagem** - 3 objetivos pedagógicos específicos
3. **Exercícios Abertos** - 3 questões que estimulam reflexão e aplicação
4. **Questões de Múltipla Escolha** - 3 questões com 4 alternativas cada
5. **Questões Dissertativas** - 2 questões para desenvolvimento crítico

## 🔧 Configuração

### Backend

#### 1. Instalar Dependências

```bash
cd hackathon-backend
npm install openai pdf-parse
```

#### 2. Configurar Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
```

Para obter sua chave API:
1. Acesse https://platform.openai.com/api-keys
2. Crie uma nova chave de API
3. Copie e cole no arquivo `.env`

**IMPORTANTE:** Mantenha sua chave API segura e nunca a compartilhe publicamente!

#### 3. Arquivos Criados

- `src/services/aiService.ts` - Serviço de integração com OpenAI
- `src/services/pdfService.ts` - Serviço de extração de texto de PDFs
- `src/controllers/materialController.ts` - Método `generateActivities` adicionado

#### 4. Rota Criada

```
POST /api/materials/:id/generate-activities
```

**Autenticação:** Requerida (JWT Bearer token)

**Parâmetros:**
- `id` (path) - ID do material

**Resposta de Sucesso (200):**

```json
{
  "success": true,
  "data": {
    "material": {
      "id": "material-id",
      "title": "Título do Material",
      "discipline": "Matemática",
      "grade": "5º ano"
    },
    "activities": {
      "summary": "Resumo do conteúdo...",
      "objectives": [
        "Objetivo 1",
        "Objetivo 2",
        "Objetivo 3"
      ],
      "exercises": [
        "Exercício aberto 1...",
        "Exercício aberto 2...",
        "Exercício aberto 3..."
      ],
      "multiple_choice": [
        {
          "question": "Pergunta?",
          "options": ["A", "B", "C", "D"],
          "answer": "B"
        }
      ],
      "essay_questions": [
        "Questão dissertativa 1...",
        "Questão dissertativa 2..."
      ]
    },
    "metadata": {
      "contentLength": 1500,
      "extractedFromFile": true,
      "generatedAt": "2025-10-01T12:00:00.000Z"
    }
  },
  "message": "Atividades geradas com sucesso"
}
```

**Erros Possíveis:**

- `400` - Material não possui conteúdo suficiente (mínimo 100 caracteres)
- `401` - Não autenticado
- `404` - Material não encontrado
- `503` - Serviço de IA temporariamente indisponível

### Frontend

#### Arquivos Criados

- `src/types/activity.ts` - Tipos TypeScript para atividades
- `src/app/materials/[id]/activities/page.tsx` - Página de geração de atividades
- `src/components/materials/MaterialCard.tsx` - Botão "Gerar Atividades com IA" adicionado

#### Como Usar

1. **Na lista de materiais**, cada card terá um botão "✨ Gerar Atividades com IA" (apenas para usuários logados)
2. Clique no botão para acessar a página de geração
3. Clique em "Gerar Atividades com IA"
4. Aguarde alguns segundos enquanto a IA processa o material
5. As atividades serão exibidas em cards organizados por tipo
6. Você pode:
   - Gerar novas atividades (clicando novamente)
   - Imprimir as atividades
   - Copiar o conteúdo para usar em suas aulas

## 📝 Como Funciona

### Processamento do Material

1. **Extração de Conteúdo:**
   - Se o material tem arquivo PDF ou TXT → extrai texto automaticamente
   - Se não tem arquivo ou tipo não suportado → usa a descrição do material

2. **Validação:**
   - Verifica se o material tem pelo menos 100 caracteres de conteúdo
   - Limita o conteúdo a 8000 caracteres para otimizar uso de tokens

3. **Geração com IA:**
   - Envia conteúdo + metadados (título, disciplina, série) para OpenAI GPT-4o-mini
   - Usa prompt estruturado e pedagogicamente orientado
   - Temperatura 0.7 para equilíbrio entre criatividade e consistência
   - Formato de resposta: JSON estruturado

4. **Validação da Resposta:**
   - Verifica estrutura do JSON retornado
   - Valida presença de todos os campos obrigatórios
   - Garante que questões de múltipla escolha têm 4 alternativas

## 🎯 Modelos de IA Suportados

**Modelo Atual:** `gpt-4o-mini`
- Custo-benefício excelente
- Boa qualidade de respostas
- Mais rápido que GPT-4

**Alternativas:**
- `gpt-4` - Melhor qualidade, mais lento e caro
- `gpt-3.5-turbo` - Mais rápido e barato, qualidade inferior

Para trocar o modelo, edite `src/services/aiService.ts` linha 47:

```typescript
model: 'gpt-4o-mini', // Ou 'gpt-4', 'gpt-3.5-turbo'
```

## 💰 Estimativa de Custos

**GPT-4o-mini:**
- ~$0.15 por 1M tokens de entrada
- ~$0.60 por 1M tokens de saída
- **Custo médio por geração:** ~$0.001 - $0.005 (menos de 1 centavo)

**Exemplo:**
- 1000 gerações/mês ≈ $1 - $5/mês

## 🔒 Segurança

### Limitações Implementadas

1. **Autenticação obrigatória** - Apenas usuários logados podem gerar atividades
2. **Rate limiting** - 10 requisições por 15 minutos por IP
3. **Validação de conteúdo** - Mínimo 100 caracteres
4. **Limite de tokens** - Máximo 8000 caracteres de entrada
5. **Timeout** - 2 minutos máximo por requisição

### Boas Práticas

- ✅ Mantenha `OPENAI_API_KEY` no `.env` (nunca commitar)
- ✅ Configure limites de uso no dashboard da OpenAI
- ✅ Monitore custos regularmente
- ✅ Implemente cache para materiais frequentemente consultados (futuro)

## 🚀 Melhorias Futuras

### Funcionalidades Planejadas

1. **Cache de Atividades**
   - Salvar atividades geradas no banco de dados
   - Evitar regeração desnecessária
   - Permitir edição manual das atividades

2. **Personalização**
   - Escolher quantidade de questões
   - Selecionar tipos de atividades desejadas
   - Ajustar nível de dificuldade

3. **Export**
   - Exportar para PDF estilizado
   - Exportar para Word (.docx)
   - Exportar para Google Docs

4. **Histórico**
   - Visualizar atividades geradas anteriormente
   - Favoritar atividades
   - Compartilhar com outros professores

5. **Múltiplos Idiomas**
   - Gerar atividades em inglês, espanhol, etc.

## 🐛 Troubleshooting

### Erro: "Invalid API Key"
**Solução:** Verifique se a chave API está correta no `.env`

### Erro: "Rate limit exceeded"
**Solução:** Aguarde alguns minutos antes de tentar novamente

### Erro: "Material não possui conteúdo suficiente"
**Solução:** Adicione mais detalhes na descrição do material ou faça upload de um arquivo PDF/TXT

### Erro: "Serviço de IA temporariamente indisponível"
**Solução:**
- Verifique sua conexão com internet
- Verifique se há saldo na conta OpenAI
- Tente novamente em alguns minutos

### PDF não extrai texto
**Causas possíveis:**
- PDF é uma imagem escaneada (sem texto selecionável)
- PDF está corrompido
- PDF tem proteção/criptografia

**Soluções:**
- Use PDFs com texto selecionável
- Adicione descrição detalhada manualmente
- Use arquivo TXT em vez de PDF

## 📊 Monitoramento

### Logs do Backend

```bash
# Logs importantes para monitorar:
🤖 AIService: Iniciando geração de atividades...
📚 Material: [título]
✅ AIService: Atividades geradas com sucesso
📝 3 exercícios
❓ 3 questões de múltipla escolha
✍️ 2 questões dissertativas
```

### Dashboard OpenAI

Monitore uso em: https://platform.openai.com/usage

- Tokens usados
- Custos acumulados
- Requisições por dia
- Erros

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs do backend
2. Consulte a documentação da OpenAI
3. Abra uma issue no repositório

## 📄 Licença

Esta feature é parte do projeto Banco Colaborativo de Recursos Didáticos.
