import OpenAI from 'openai';
import env from '../config/env';

// Verificar se a chave API está configurada
if (!env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY não está configurada no arquivo .env');
  throw new Error('OPENAI_API_KEY não configurada');
}

// Inicializar cliente OpenAI
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Interfaces para o conteúdo gerado
export interface MultipleChoiceQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string;
}

export interface LessonPlanStage {
  stage: string;
  description: string;
  duration: string;
  resources: string[];
}

export interface LessonPlan {
  duration_total: string;
  stages: LessonPlanStage[];
  required_materials: string[];
  assessment_methods: string[];
  teacher_tips: string[];
}

export interface Activities {
  exercises: string[];
  multiple_choice: MultipleChoiceQuestion[];
  essay_questions: string[];
  practical_activities?: string[];
}

export interface GeneratedContent {
  title: string;
  summary: string;
  objectives: string[];
  lesson_plan: LessonPlan;
  activities: Activities;
  metadata: {
    generated_at: string;
    difficulty_level: string;
    estimated_prep_time: string;
  };
}

// Manter compatibilidade com código antigo
export interface GeneratedActivities {
  summary: string;
  objectives: string[];
  exercises: string[];
  multiple_choice: MultipleChoiceQuestion[];
  essay_questions: string[];
}

// Serviço de IA
export class AIService {
  /**
   * Gera plano de aula completo + atividades a partir do conteúdo de um material
   */
  async generateContent(
    materialContent: string,
    materialTitle: string,
    discipline: string,
    grade: string,
    materialType: string,
    difficulty: string
  ): Promise<GeneratedContent> {
    try {
      // Limitar conteúdo para evitar exceder limite de tokens
      const truncatedContent = materialContent.substring(0, 8000);

      // Prompt estruturado para gerar plano de aula + atividades
      const prompt = this.buildContentPrompt(
        truncatedContent,
        materialTitle,
        discipline,
        grade,
        materialType,
        difficulty
      );

      // Fazer requisição para OpenAI
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente pedagógico especializado em criar planos de aula e atividades educacionais de alta qualidade para professores brasileiros. Sempre responda em português do Brasil e siga rigorosamente o formato JSON solicitado.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 3000, // Aumentado para comportar mais conteúdo
        response_format: { type: 'json_object' },
      });

      // Extrair resposta
      const contentResponse = response.choices[0].message.content;

      if (!contentResponse) {
        throw new Error('OpenAI retornou resposta vazia');
      }

      // Parsear JSON
      const content: GeneratedContent = JSON.parse(contentResponse);

      // Validar estrutura da resposta
      this.validateContentStructure(content);

      return content;

    } catch (error: any) {
      console.error('❌ AIService: Erro ao gerar conteúdo:', error);
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

      throw new Error(`Erro ao gerar conteúdo: ${error.message}`);
    }
  }

  /**
   * Gera atividades educacionais a partir do conteúdo de um material (método antigo - mantido para compatibilidade)
   */
  async generateActivities(
    materialContent: string,
    materialTitle: string,
    discipline: string,
    grade: string,
    materialType: string
  ): Promise<GeneratedActivities> {
    try {
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

      // Parsear JSON
      const activities: GeneratedActivities = JSON.parse(contentResponse);

      // Validar estrutura da resposta
      this.validateActivitiesStructure(activities);

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
   * Construir prompt para gerar conteúdo completo (plano de aula + atividades)
   */
  private buildContentPrompt(
    content: string,
    title: string,
    discipline: string,
    grade: string,
    materialType: string,
    difficulty: string
  ): string {
    return `
Analise o material didático e gere um PLANO DE AULA COMPLETO + ATIVIDADES EDUCACIONAIS.

**INFORMAÇÕES DO MATERIAL:**
- Título: ${title}
- Disciplina: ${discipline}
- Série/Ano: ${grade}
- Tipo: ${materialType}
- Dificuldade: ${difficulty}

**CONTEÚDO DO MATERIAL:**
${content}

**GERE JSON SEGUINDO EXATAMENTE ESTA ESTRUTURA:**

{
  "title": "Título criativo e atrativo para a aula",
  "summary": "Resumo claro e conciso do conteúdo (2-3 frases)",
  "objectives": [
    "Objetivo 1 (começar com verbo de ação: compreender, identificar, aplicar, analisar...)",
    "Objetivo 2",
    "Objetivo 3"
  ],
  "lesson_plan": {
    "duration_total": "50 min",
    "stages": [
      {
        "stage": "Introdução",
        "description": "Descrição detalhada da etapa inicial (como apresentar o tema, contextualizar, motivar os alunos)",
        "duration": "10 min",
        "resources": ["Recurso 1", "Recurso 2"]
      },
      {
        "stage": "Desenvolvimento",
        "description": "Descrição detalhada da atividade principal (como desenvolver o conteúdo, estratégias pedagógicas)",
        "duration": "30 min",
        "resources": ["Recurso 1", "Recurso 2", "Recurso 3"]
      },
      {
        "stage": "Fechamento",
        "description": "Descrição detalhada do encerramento (como consolidar o aprendizado, fazer síntese)",
        "duration": "10 min",
        "resources": ["Recurso 1"]
      }
    ],
    "required_materials": ["Lista consolidada de TODOS os materiais necessários"],
    "assessment_methods": [
      "Método de avaliação 1 (como verificar se os objetivos foram alcançados)",
      "Método de avaliação 2"
    ],
    "teacher_tips": [
      "Dica prática 1 (preparação prévia, organização da sala, possíveis dificuldades)",
      "Dica prática 2",
      "Dica prática 3"
    ]
  },
  "activities": {
    "exercises": [
      "Exercício aberto 1 (questão que estimule reflexão e aplicação)",
      "Exercício aberto 2",
      "Exercício aberto 3"
    ],
    "multiple_choice": [
      {
        "question": "Pergunta de múltipla escolha 1?",
        "options": ["A) Alternativa A", "B) Alternativa B", "C) Alternativa C", "D) Alternativa D"],
        "correct_answer": "B",
        "explanation": "Breve explicação de por que esta é a resposta correta"
      },
      {
        "question": "Pergunta 2?",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "A",
        "explanation": "..."
      },
      {
        "question": "Pergunta 3?",
        "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
        "correct_answer": "D",
        "explanation": "..."
      }
    ],
    "essay_questions": [
      "Questão dissertativa 1 (que estimule pensamento crítico e argumentação)",
      "Questão dissertativa 2"
    ],
    "practical_activities": [
      "Atividade prática 1 (experimento, construção, dramatização, etc)",
      "Atividade prática 2"
    ]
  },
  "metadata": {
    "generated_at": "${new Date().toISOString()}",
    "difficulty_level": "${difficulty}",
    "estimated_prep_time": "15 min"
  }
}

**REQUISITOS IMPORTANTES:**
1. Série ${grade}: use linguagem clara e adequada à faixa etária
2. Duração total do plano: aproximadamente 50 minutos (pode variar entre 45-55 min)
3. Etapas do plano: seja específico e detalhado nas descrições
4. Questões múltipla escolha: VARIE a alternativa correta (não use sempre a mesma letra)
5. Recursos: seja realista com materiais disponíveis em escolas brasileiras
6. Dicas para professor: inclua orientações práticas e úteis
7. Atividades práticas: sugira algo concreto e aplicável
8. IMPORTANTE: Responda APENAS com o JSON válido, sem texto extra antes ou depois

Gere o conteúdo agora:
`.trim();
  }

  /**
   * Construir prompt estruturado para a OpenAI (método antigo)
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
   * Validar estrutura do conteúdo completo gerado
   */
  private validateContentStructure(content: any): void {
    // Validações básicas
    if (!content.title || typeof content.title !== 'string') {
      throw new Error('Resposta da IA inválida: title ausente ou inválido');
    }

    if (!content.summary || typeof content.summary !== 'string') {
      throw new Error('Resposta da IA inválida: summary ausente ou inválido');
    }

    if (!Array.isArray(content.objectives) || content.objectives.length === 0) {
      throw new Error('Resposta da IA inválida: objectives deve ser um array não vazio');
    }

    // Validar lesson_plan
    if (!content.lesson_plan || typeof content.lesson_plan !== 'object') {
      throw new Error('Resposta da IA inválida: lesson_plan ausente ou inválido');
    }

    if (!Array.isArray(content.lesson_plan.stages) || content.lesson_plan.stages.length === 0) {
      throw new Error('Resposta da IA inválida: lesson_plan.stages deve ser um array não vazio');
    }

    // Validar cada etapa do plano
    content.lesson_plan.stages.forEach((stage: any, index: number) => {
      if (!stage.stage || !stage.description || !stage.duration || !Array.isArray(stage.resources)) {
        throw new Error(`Etapa ${index + 1} do plano de aula inválida`);
      }
    });

    if (!Array.isArray(content.lesson_plan.required_materials)) {
      throw new Error('Resposta da IA inválida: lesson_plan.required_materials deve ser um array');
    }

    if (!Array.isArray(content.lesson_plan.assessment_methods)) {
      throw new Error('Resposta da IA inválida: lesson_plan.assessment_methods deve ser um array');
    }

    if (!Array.isArray(content.lesson_plan.teacher_tips)) {
      throw new Error('Resposta da IA inválida: lesson_plan.teacher_tips deve ser um array');
    }

    // Validar activities
    if (!content.activities || typeof content.activities !== 'object') {
      throw new Error('Resposta da IA inválida: activities ausente ou inválido');
    }

    if (!Array.isArray(content.activities.exercises) || content.activities.exercises.length === 0) {
      throw new Error('Resposta da IA inválida: activities.exercises deve ser um array não vazio');
    }

    if (!Array.isArray(content.activities.multiple_choice) || content.activities.multiple_choice.length === 0) {
      throw new Error('Resposta da IA inválida: activities.multiple_choice deve ser um array não vazio');
    }

    // Validar questões de múltipla escolha
    content.activities.multiple_choice.forEach((q: any, index: number) => {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !q.correct_answer) {
        throw new Error(`Questão de múltipla escolha ${index + 1} inválida`);
      }
    });

    if (!Array.isArray(content.activities.essay_questions) || content.activities.essay_questions.length === 0) {
      throw new Error('Resposta da IA inválida: activities.essay_questions deve ser um array não vazio');
    }

    // Validar metadata
    if (!content.metadata || typeof content.metadata !== 'object') {
      throw new Error('Resposta da IA inválida: metadata ausente ou inválido');
    }
  }

  /**
   * Validar estrutura da resposta da IA (método antigo)
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
