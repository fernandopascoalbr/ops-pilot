import { z } from 'zod';
import { createModel } from '../agents/model.js';
import type { MemoryStore } from './memory-store.js';

const learningDecisionSchema = z.object({
  hasLearning: z.boolean(),
  fact: z.string().trim().optional().default(''),
});

const LEARNING_PROMPT = `
Você analisa a última mensagem do usuário e decide se existe aprendizado durável.
Regras obrigatórias:
- Nunca memorize pedido pontual, instrução momentânea ou tarefa temporária.
- Nunca memorize segredo, credencial, token, senha, chave, dado sensível pessoal.
- Se houver aprendizado durável, destile um único fato curto, objetivo e útil para interações futuras.
`.trim();

const secretSignalPatterns = [
  /senha/i,
  /password/i,
  /token/i,
  /api[\s_-]?key/i,
  /secret/i,
  /segredo/i,
  /chave/i,
  /cpf/i,
  /cart[aã]o/i,
  /credencial/i,
];

const punctualSignalPatterns = [
  /\bagora\b/i,
  /\bhoje\b/i,
  /\bamanh[ãa]\b/i,
  /\bneste chamado\b/i,
  /\bnesse incidente\b/i,
  /\bfa[çc]a\b/i,
  /\bexecute\b/i,
  /\brode\b/i,
];

export type LearningDecision = {
  hasLearning: boolean;
  fact: string;
  reason: 'durable' | 'no-learning' | 'blocked-secret' | 'blocked-punctual';
};

export type LearningAuditEvent = {
  userId: string;
  hasLearning: boolean;
  stored: boolean;
  reason: LearningDecision['reason'] | 'store-error';
};

export type LearningReflectorOptions = {
  memoryStore: MemoryStore;
  onAudit?: (event: LearningAuditEvent) => void;
  decideWithModel?: (lastUserMessage: string) => Promise<{ hasLearning: boolean; fact: string }>;
};

function fallbackLearningDecision(lastUserMessage: string): LearningDecision {
  const message = lastUserMessage.trim();
  if (message.length === 0) {
    return { hasLearning: false, fact: '', reason: 'no-learning' };
  }

  if (secretSignalPatterns.some((pattern) => pattern.test(message))) {
    return { hasLearning: false, fact: '', reason: 'blocked-secret' };
  }

  if (punctualSignalPatterns.some((pattern) => pattern.test(message))) {
    return { hasLearning: false, fact: '', reason: 'blocked-punctual' };
  }

  return {
    hasLearning: true,
    fact: message,
    reason: 'durable',
  };
}

function sanitizeDecision(decision: LearningDecision): LearningDecision {
  if (!decision.hasLearning) {
    return { ...decision, fact: '' };
  }

  const fact = decision.fact.trim();
  if (!fact) {
    return { hasLearning: false, fact: '', reason: 'no-learning' };
  }

  if (secretSignalPatterns.some((pattern) => pattern.test(fact))) {
    return { hasLearning: false, fact: '', reason: 'blocked-secret' };
  }

  if (punctualSignalPatterns.some((pattern) => pattern.test(fact))) {
    return { hasLearning: false, fact: '', reason: 'blocked-punctual' };
  }

  return { hasLearning: true, fact, reason: 'durable' };
}

export class LearningReflector {
  private readonly memoryStore: MemoryStore;
  private readonly onAudit: (event: LearningAuditEvent) => void;
  private readonly decideWithModel?: (lastUserMessage: string) => Promise<{ hasLearning: boolean; fact: string }>;

  constructor(options: LearningReflectorOptions) {
    this.memoryStore = options.memoryStore;
    this.onAudit = options.onAudit ?? (() => undefined);
    this.decideWithModel = options.decideWithModel;
  }

  async analyzeLastUserMessage(lastUserMessage: string): Promise<LearningDecision> {
    try {
      const result = this.decideWithModel
        ? await this.decideWithModel(lastUserMessage)
        : await createModel()
          .withStructuredOutput(learningDecisionSchema)
          .invoke([
            ['system', LEARNING_PROMPT],
            ['user', lastUserMessage],
          ]);
      const parsed = learningDecisionSchema.parse(result);
      const decision: LearningDecision = {
        hasLearning: parsed.hasLearning,
        fact: parsed.fact,
        reason: parsed.hasLearning ? 'durable' : 'no-learning',
      };
      return sanitizeDecision(decision);
    } catch (error) {
      console.warn(
        '[learning-reflector] fallback to deterministic analysis:',
        error instanceof Error ? error.message : error,
      );
      return sanitizeDecision(fallbackLearningDecision(lastUserMessage));
    }
  }

  reflectAndRememberAsync(input: { userId: string; lastUserMessage: string }): void {
    void this.reflectAndRemember(input);
  }

  private async reflectAndRemember(input: { userId: string; lastUserMessage: string }): Promise<void> {
    const userId = input.userId.trim();
    if (!userId) {
      return;
    }

    const decision = await this.analyzeLastUserMessage(input.lastUserMessage);
    if (!decision.hasLearning) {
      this.onAudit({
        userId,
        hasLearning: false,
        stored: false,
        reason: decision.reason,
      });
      return;
    }

    try {
      const stored = await this.memoryStore.remember(userId, decision.fact);
      this.onAudit({
        userId,
        hasLearning: true,
        stored: stored !== null,
        reason: decision.reason,
      });
    } catch (error) {
      console.warn(
        '[learning-reflector] failed to persist extracted learning asynchronously:',
        error instanceof Error ? error.message : error,
      );
      this.onAudit({
        userId,
        hasLearning: true,
        stored: false,
        reason: 'store-error',
      });
    }
  }
}
