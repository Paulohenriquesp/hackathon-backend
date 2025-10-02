import OpenAI from 'openai';
import env from '../config/env';

// Verificar se a chave API está configurada
if (!env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY não está configurada no arquivo .env');
  throw new Error('OPENAI_API_KEY não configurada');
}

console.log('✅ OpenAI API Key carregada:', env.OPENAI_API_KEY.substring(0, 20) + '...');

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Interface para as atividades geradas
export interface GeneratedActivities {
  summary: string;
  objectives: string[];
  exercises: string[];
  multiple_choice: MultipleChoiceQuestion[];
  essay_questions: string[];
}

export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  answer: string;
}

// Serviço de IA
export class AIService {
  /**
   * Gera atividades educacionais a partir do conteúdo de um material
   */
  async generateActivities(
    materialContent: string,
    materialTitle: string,
    discipline: string,
    grade: string,
    materialType: string
  ): Promise<GeneratedActivities> {
    try {
      console.log('🤖 AIService: Iniciando geração de atividades...');
      console.log('📚 Material:', materialTitle);
      console.log('📖 Disciplina:', discipline);
      console.log('🎓 Série:', grade);

      // Limitar conteúdo para evitar exceder limite de tokens
      const truncatedContent = materialContent.substring(0, 8000);

      // Prompt estruturado para gerar atividades
      const prompt = this.buildPrompt(
        truncatedContent,
        materialTitle,
        discipline,
        grade,
        materialType
      );

      // Fazer requisição para OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini', // Ou 'gpt-4' para melhor qualidade
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente pedagógico especializado em criar atividades educacionais de alta qualidade para professores brasileiros. Sempre responda em português do Brasil e siga rigorosamente o formato JSON solicitado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      });

      // Extrair resposta
      const contentResponse = response.choices[0].message.content;

      if (!contentResponse) {
        throw new Error('OpenAI retornou resposta vazia');
      }

      console.log('✅ AIService: Resposta recebida da OpenAI');

      // Parsear JSON
      const activities: GeneratedActivities = JSON.parse(contentResponse);

      // Validar estrutura da resposta
      this.validateActivitiesStructure(activities);

      console.log('✅ AIService: Atividades geradas com sucesso');
      console.log(`📝 ${activities.exercises.length} exercícios`);
      console.log(`❓ ${activities.multiple_choice.length} questões de múltipla escolha`);
      console.log(`✍️ ${activities.essay_questions.length} questões dissertativas`);

      return activities;

    } catch (error: any) {
      console.error('❌ AIService: Erro ao gerar atividades:', error);
      console.error('❌ Erro detalhado:', {
        message: error.message,
        code: error.code,
        status: error.status,
        type: error.type,
        stack: error.stack
      });

      // Tratamento específico de erros da OpenAI
      if (error.code === 'insufficient_quota') {
        throw new Error('Limite de uso da API OpenAI excedido. Entre em contato com o administrador.');
      }

      if (error.code === 'rate_limit_exceeded') {
        throw new Error('Muitas requisições. Aguarde alguns segundos e tente novamente.');
      }

      if (error.code === 'invalid_api_key' || error.status === 401) {
        throw new Error('Chave de API OpenAI inválida. Entre em contato com o administrador.');
      }

      throw new Error(`Erro ao gerar atividades: ${error.message}`);
    }
  }

  /**
   * Construir prompt estruturado para a OpenAI
   */
  private buildPrompt(
    content: string,
    title: string,
    discipline: string,
    grade: string,
    materialType: string
  ): string {
    return `
Analise o seguinte material didático e gere atividades educacionais completas e pedagogicamente adequadas.

**INFORMAÇÕES DO MATERIAL:**
- Título: ${title}
- Disciplina: ${discipline}
- Série/Ano: ${grade}
- Tipo: ${materialType}

**CONTEÚDO DO MATERIAL:**
${content}

**INSTRUÇÕES:**
Com base no conteúdo acima, gere atividades educacionais seguindo EXATAMENTE este formato JSON:

{
  "summary": "Um resumo claro e conciso do conteúdo do material (2-3 frases)",
  "objectives": [
    "Objetivo de aprendizagem 1",
    "Objetivo de aprendizagem 2",
    "Objetivo de aprendizagem 3"
  ],
  "exercises": [
    "Exercício aberto 1 (questão que estimule reflexão e aplicação do conteúdo)",
    "Exercício aberto 2",
    "Exercício aberto 3"
  ],
  "multiple_choice": [
    {
      "question": "Pergunta de múltipla escolha 1?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "answer": "A"
    },
    {
      "question": "Pergunta de múltipla escolha 2?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "answer": "C"
    },
    {
      "question": "Pergunta de múltipla escolha 3?",
      "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
      "answer": "B"
    }
  ],
  "essay_questions": [
    "Questão dissertativa 1 (requer resposta elaborada)",
    "Questão dissertativa 2"
  ]
}

**REQUISITOS IMPORTANTES:**
1. As atividades devem ser apropriadas para a série "${grade}"
2. Use linguagem clara e adequada para a faixa etária
3. As questões devem testar diferentes níveis de compreensão (memorização, compreensão, aplicação, análise)
4. Nas questões de múltipla escolha, distribua as respostas corretas entre as alternativas (não coloque todas como "A")
5. As questões dissertativas devem estimular pensamento crítico
6. IMPORTANTE: Responda APENAS com o JSON, sem texto adicional antes ou depois

Gere as atividades agora:
`.trim();
  }

  /**
   * Validar estrutura da resposta da IA
   */
  private validateActivitiesStructure(activities: any): void {
    if (!activities.summary || typeof activities.summary !== 'string') {
      throw new Error('Resposta da IA inválida: summary ausente ou inválido');
    }

    if (!Array.isArray(activities.objectives) || activities.objectives.length === 0) {
      throw new Error('Resposta da IA inválida: objectives deve ser um array não vazio');
    }

    if (!Array.isArray(activities.exercises) || activities.exercises.length === 0) {
      throw new Error('Resposta da IA inválida: exercises deve ser um array não vazio');
    }

    if (!Array.isArray(activities.multiple_choice) || activities.multiple_choice.length === 0) {
      throw new Error('Resposta da IA inválida: multiple_choice deve ser um array não vazio');
    }

    // Validar estrutura de cada questão de múltipla escolha
    activities.multiple_choice.forEach((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.answer) {
        throw new Error(`Questão de múltipla escolha ${index + 1} inválida`);
      }
    });

    if (!Array.isArray(activities.essay_questions) || activities.essay_questions.length === 0) {
      throw new Error('Resposta da IA inválida: essay_questions deve ser um array não vazio');
    }
  }

  /**
   * Estimar custo de tokens para uma requisição
   */
  estimateTokens(content: string): number {
    // Estimativa aproximada: 1 token ≈ 4 caracteres em português
    return Math.ceil(content.length / 4);
  }
}

// Export singleton
export const aiService = new AIService();
