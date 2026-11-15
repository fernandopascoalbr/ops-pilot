import { buildContextBreakdown, estimateTokens } from './token.js';

export const DEFAULT_CONTEXT_BUDGETS = Object.freeze({
  system: Number.POSITIVE_INFINITY,
  messages: Number.POSITIVE_INFINITY,
  summary: 200,
  window: 1200,
  memory: 300,
});

export type ContextBudgetKey = 'system' | 'messages' | 'summary' | 'window' | 'memory';
export type ContextCutMode = 'never' | 'oldest-first' | 'lowest-score-first';

export type ContextBudgetOverrides = Partial<Record<ContextBudgetKey, number>>;

export type ContextHistoryEntry = {
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

export type ContextMemoryItem = {
  id?: string;
  fact: string;
  score?: number;
  createdAt?: string;
};

export type BuildContextInput = {
  message: string;
  summary?: string | null;
  history?: ContextHistoryEntry[];
  memories?: ContextMemoryItem[];
  systemPrompt?: string;
  budgets?: ContextBudgetOverrides;
};

export type BuiltContextSection = {
  name: ContextBudgetKey;
  text: string;
  budget: number;
  protected: boolean;
  cut: ContextCutMode;
  originalCount: number;
  finalCount: number;
};

export type BuildContext = {
  input: string;
  sections: BuiltContextSection[];
  contextBreakdown: ReturnType<typeof buildContextBreakdown>;
};

function readBudgetFromEnv(envName: string, fallback: number): number {
  const raw = process.env[envName];
  if (typeof raw !== 'string') {
    return fallback;
  }

  const value = Number(raw.trim());
  if (!Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return value;
}

export function resolveContextBudgets(overrides: ContextBudgetOverrides = {}): Record<ContextBudgetKey, number> {
  const next: Record<ContextBudgetKey, number> = { ...DEFAULT_CONTEXT_BUDGETS };
  const hasExplicitOverride = (Object.keys(overrides) as ContextBudgetKey[]).some((key) => {
    const value = overrides[key];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  });

  if (!hasExplicitOverride) {
    next.summary = readBudgetFromEnv('CONTEXT_BUDGET_SUMMARY', DEFAULT_CONTEXT_BUDGETS.summary);
    next.window = readBudgetFromEnv('CONTEXT_BUDGET_WINDOW', DEFAULT_CONTEXT_BUDGETS.window);
    next.memory = readBudgetFromEnv('CONTEXT_BUDGET_MEMORY', DEFAULT_CONTEXT_BUDGETS.memory);
    next.system = readBudgetFromEnv('CONTEXT_BUDGET_SYSTEM', DEFAULT_CONTEXT_BUDGETS.system);
    next.messages = readBudgetFromEnv('CONTEXT_BUDGET_MESSAGES', DEFAULT_CONTEXT_BUDGETS.messages);

    const aliasWindow = readBudgetFromEnv('CONTEXT_BUDGET_HISTORY', next.window);
    const aliasMemory = readBudgetFromEnv('CONTEXT_BUDGET_MEMORIES', next.memory);

    if (Number.isFinite(aliasWindow) && aliasWindow >= 0) {
      next.window = aliasWindow;
    }
    if (Number.isFinite(aliasMemory) && aliasMemory >= 0) {
      next.memory = aliasMemory;
    }
  }

  for (const [key, value] of Object.entries(overrides) as Array<[ContextBudgetKey, number | undefined]>) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      next[key] = value;
    }
  }

  return next;
}

function truncateTextToBudget(value: string, budget: number): string {
  const normalizedBudget = Number.isFinite(budget) ? Math.max(0, budget) : 0;
  if (!value || normalizedBudget <= 0) {
    return '';
  }

  if (estimateTokens(value) <= normalizedBudget) {
    return value;
  }

  const maxChars = Math.max(0, Math.floor(normalizedBudget * 4));
  if (maxChars <= 0) {
    return '';
  }

  let candidate = value.slice(0, maxChars).trimEnd();
  if (candidate.length === 0) {
    return '';
  }

  const withEllipsis = `${candidate}…`;
  if (estimateTokens(withEllipsis) <= normalizedBudget) {
    return withEllipsis;
  }

  while (candidate.length > 0 && estimateTokens(candidate) > normalizedBudget) {
    candidate = candidate.slice(0, -1).trimEnd();
  }

  return candidate;
}

function renderHistorySection(entries: ContextHistoryEntry[]): string {
  if (entries.length === 0) {
    return '';
  }

  return entries
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join('\n');
}

function renderMemorySection(entries: ContextMemoryItem[]): string {
  if (entries.length === 0) {
    return '';
  }

  const items = entries
    .map((entry) => `- ${entry.fact}${typeof entry.score === 'number' ? ` (score: ${entry.score.toFixed(2)})` : ''}`)
    .join('\n');

  return `Memórias relevantes do usuário:\n${items}`;
}

function fitTextSection(
  name: ContextBudgetKey,
  value: string,
  budget: number,
  protectedSection: boolean,
): BuiltContextSection {
  const trimmed = protectedSection || budget === Number.POSITIVE_INFINITY ? value : truncateTextToBudget(value, budget);
  const text = trimmed ?? '';

  return {
    name,
    text,
    budget,
    protected: protectedSection,
    cut: protectedSection ? 'never' : 'oldest-first',
    originalCount: value.length > 0 ? 1 : 0,
    finalCount: text.length > 0 ? 1 : 0,
  };
}

function fitHistorySection(history: ContextHistoryEntry[], budget: number): BuiltContextSection {
  const original = history.map((entry) => ({ ...entry }));
  let kept = [...history];
  while (estimateTokens(renderHistorySection(kept)) > budget && kept.length > 0) {
    kept.shift();
  }

  return {
    name: 'window',
    text: renderHistorySection(kept),
    budget,
    protected: false,
    cut: 'oldest-first',
    originalCount: original.length,
    finalCount: kept.length,
  };
}

function fitMemorySection(memories: ContextMemoryItem[], budget: number): BuiltContextSection {
  const original = [...memories];
  const sorted = [...memories].sort((left, right) => (right.score ?? 0) - (left.score ?? 0));
  let kept = sorted.slice(0, Math.min(sorted.length, 2));

  while (estimateTokens(renderMemorySection(kept)) > budget && kept.length > 0) {
    kept.pop();
  }

  return {
    name: 'memory',
    text: renderMemorySection(kept),
    budget,
    protected: false,
    cut: 'lowest-score-first',
    originalCount: original.length,
    finalCount: kept.length,
  };
}

export function buildContext(input: BuildContextInput): BuildContext {
  const budgets = resolveContextBudgets(input.budgets);
  const systemPrompt = input.systemPrompt ?? 'Você é um assistente útil e responsável que responde com clareza e segurança.';
  const messageText = input.message?.trim() ?? '';
  const summaryText = input.summary?.trim() ?? '';
  const history = input.history ?? [];
  const memories = input.memories ?? [];

  const systemSection = fitTextSection('system', systemPrompt, budgets.system, true);
  const messageSection = fitTextSection('messages', `Mensagem atual:\n${messageText}`, budgets.messages, true);

  const summarySection = fitTextSection('summary', summaryText.length > 0 ? `Resumo consolidado da conversa:\n${summaryText}` : '', budgets.summary, false);
  const windowSection = fitHistorySection(history, budgets.window);
  const memorySection = fitMemorySection(memories, budgets.memory);

  const sections = [systemSection, summarySection, windowSection, memorySection, messageSection];

  const assembledInput = sections
    .map((section) => section.text)
    .filter((text) => text.trim().length > 0)
    .join('\n\n');

  const historyText = [summarySection.text, windowSection.text].filter(Boolean).join('\n\n');
  const memoryText = memorySection.text;
  const currentMessageText = messageSection.text;

  return {
    input: assembledInput,
    sections,
    contextBreakdown: buildContextBreakdown([
      { source: 'currentMessage', text: currentMessageText },
      { source: 'conversationHistory', text: historyText },
      { source: 'memoryRecall', text: memoryText },
    ]),
  };
}
