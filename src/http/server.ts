import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { createTraceEvent } from '../agents/trace.js';
import { UnknownStrategyError, defaultStrategyRegistry, resolveStrategy, type StrategyRegistry } from '../agents/index.js';
import {
  ConversationNotFoundError,
  RECENT_WINDOW_MESSAGES,
  selectDisplacedBatch,
  summarizeDisplacedMessages,
  type ConversationMessage,
  type ConversationStore,
  SqliteConversationStore,
} from '../chat/index.js';
import { buildContextBreakdown, type ContextBreakdown } from '../context/token.js';
import { LearningReflector, MemoryStore, type MemoryRecord } from '../memory/index.js';
import { chatRequestSchema } from './chat-schema.js';

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_ITERATIONS = 8;
const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_MEMORY_RECALL_K = 3;
const DEFAULT_MEMORY_RECALL_MIN_SCORE = 0.3;

const memoryRememberRequestSchema = z.object({
  userId: z.string().trim().min(1, 'userId must not be empty'),
  fact: z.string().trim().min(1, 'fact must not be empty'),
});

const memoryForgetRequestSchema = z.object({
  userId: z.string().trim().min(1, 'userId must not be empty'),
  target: z.string().trim().min(1, 'target must not be empty'),
});

const memoryRecallQuerySchema = z.object({
  userId: z.string().trim().min(1, 'userId must not be empty'),
  query: z.string().trim().min(1, 'query must not be empty'),
  k: z.coerce.number().int().positive().max(10).default(DEFAULT_MEMORY_RECALL_K),
  minScore: z.coerce.number().min(0).max(1).default(DEFAULT_MEMORY_RECALL_MIN_SCORE),
});

type ChatResultBody = {
  conversationId: string;
  answer: string;
  trace: unknown[];
  metrics: Record<string, unknown> & {
    promptTokens: number | null;
    contextBreakdown: ContextBreakdown;
  };
};

export type ChatHttpResponse =
  | { status: 200; body: ChatResultBody }
  | { status: 400; body: { issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } }
  | { status: 404; body: { error: string } }
  | { status: 422; body: { error: string } }
  | { status: 504; body: { error: string } };

type MemoryHttpResponse =
  | { status: 200; body: Record<string, unknown> }
  | { status: 201; body: Record<string, unknown> }
  | { status: 400; body: { issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } };

export type ChatServerOptions = {
  timeoutMs?: number;
  maxIterations?: number;
  registry?: StrategyRegistry;
  conversationStore?: ConversationStore;
  memoryStore?: MemoryStore;
  learningReflector?: Pick<LearningReflector, 'reflectAndRememberAsync'>;
};

class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Chat request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new TimeoutError(timeoutMs)), timeoutMs);
    timeoutHandle.unref();
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function composeMessageWithHistory(
  message: string,
  history: ConversationMessage[],
  memories: MemoryRecord[] = [],
  persistedSummary: string | null = null,
): { input: string; contextBreakdown: ContextBreakdown } {
  const sections: string[] = [];

  const memoryText = memories
    .map((memory) => `- ${memory.fact}`)
    .join('\n');
  const memorySection = memoryText.length > 0 ? `Memórias relevantes do usuário:\n${memoryText}` : '';
  if (memorySection.length > 0) {
    sections.push(memorySection);
  }

  const historyText = history
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join('\n');
  const summarySection = persistedSummary && persistedSummary.trim().length > 0
    ? `Resumo consolidado da conversa:\n${persistedSummary}`
    : '';
  const historySectionParts = [
    summarySection,
    historyText.length > 0 ? `Histórico recente da conversa:\n${historyText}` : '',
  ].filter((section) => section.length > 0);
  const historySection = historySectionParts.join('\n\n');
  if (historySection.length > 0) {
    sections.push(historySection);
  }

  const currentMessageSection = `Mensagem atual:\n${message}`;
  sections.push(currentMessageSection);
  return {
    input: sections.join('\n\n'),
    contextBreakdown: buildContextBreakdown([
      { source: 'currentMessage', text: currentMessageSection },
      { source: 'conversationHistory', text: historySection },
      { source: 'memoryRecall', text: memorySection },
    ]),
  };
}

export async function processChatRequest(body: unknown, options: ChatServerOptions = {}): Promise<ChatHttpResponse> {
  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { issues: parsed.error.issues },
    };
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const registry = options.registry ?? defaultStrategyRegistry;
  const conversationStore = options.conversationStore ?? new SqliteConversationStore();
  const memoryStore = options.memoryStore ?? new MemoryStore();
  const learningReflector = options.learningReflector ?? new LearningReflector({
    memoryStore,
    onAudit(event) {
      console.info(
        '[learning-reflector]',
        JSON.stringify({
          userId: event.userId,
          hasLearning: event.hasLearning,
          stored: event.stored,
          reason: event.reason,
        }),
      );
    },
  });

  try {
    const conversationId = parsed.data.conversationId ?? conversationStore.create();
    const allMessages = conversationStore.listMessages(conversationId);
    const previousSummary = conversationStore.readSummary(conversationId);
    const displacedBatch = selectDisplacedBatch(allMessages, previousSummary?.summarizedMessageCount ?? 0);
    let activeSummary = previousSummary?.summaryText ?? null;
    const summarizeTrace = displacedBatch.batchSize > 0
      ? createTraceEvent(
        'summarize',
        `Resumo incremental atualizado com ${displacedBatch.batchSize} mensagens deslocadas.`,
        {
          args: {
            conversationId,
            batchSize: displacedBatch.batchSize,
            summarizedMessageCount: displacedBatch.summarizedMessageCount,
          },
        },
      )
      : null;

    if (displacedBatch.batchSize > 0) {
      const mergedSummary = summarizeDisplacedMessages(displacedBatch.messages, activeSummary ?? '');
      const persistedSummary = conversationStore.upsertSummary(
        conversationId,
        mergedSummary,
        displacedBatch.summarizedMessageCount,
      );
      activeSummary = persistedSummary.summaryText;
    }

    const history = conversationStore.lastMessages(conversationId, RECENT_WINDOW_MESSAGES);
    const relevantMemories = parsed.data.userId
      ? await memoryStore.recall(parsed.data.userId, parsed.data.message, 3, 0.3)
      : [];
    const strategy = resolveStrategy(parsed.data.strategy, { reflect: parsed.data.reflect, registry });
    conversationStore.append(conversationId, 'user', parsed.data.message);

    const composedContext = composeMessageWithHistory(parsed.data.message, history, relevantMemories, activeSummary);
    const result = await withTimeout(strategy.run(composedContext.input, maxIterations), timeoutMs);
    conversationStore.append(conversationId, 'assistant', result.answer);
    if (parsed.data.userId) {
      learningReflector.reflectAndRememberAsync({
        userId: parsed.data.userId,
        lastUserMessage: parsed.data.message,
      });
    }

    return {
      status: 200,
      body: {
        conversationId,
        answer: result.answer,
        trace: summarizeTrace ? [summarizeTrace, ...result.trace] : result.trace,
        metrics: {
          ...result.metrics,
          historyMessages: history.length,
          memoryRecallCount: relevantMemories.length,
          promptTokens: typeof result.metrics.promptTokens === 'number' ? result.metrics.promptTokens : null,
          contextBreakdown: composedContext.contextBreakdown,
        },
      },
    };
  } catch (error) {
    if (error instanceof ConversationNotFoundError) {
      return {
        status: 404,
        body: { error: error.message },
      };
    }
    if (error instanceof UnknownStrategyError) {
      return {
        status: 422,
        body: { error: error.message },
      };
    }
    if (error instanceof TimeoutError) {
      return {
        status: 504,
        body: { error: 'Chat processing timed out' },
      };
    }
    throw error;
  }
}

async function processRememberMemoryRequest(body: unknown, memoryStore: MemoryStore): Promise<MemoryHttpResponse> {
  const parsed = memoryRememberRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { issues: parsed.error.issues },
    };
  }

  const stored = await memoryStore.remember(parsed.data.userId, parsed.data.fact);
  if (!stored) {
    return {
      status: 200,
      body: {
        stored: false,
        reason: 'duplicate',
      },
    };
  }

  return {
    status: 201,
    body: {
      stored: true,
      memory: {
        id: stored.id,
        userId: stored.userId,
        fact: stored.fact,
        createdAt: stored.createdAt,
      },
    },
  };
}

async function processRecallMemoryRequest(url: URL, memoryStore: MemoryStore): Promise<MemoryHttpResponse> {
  const parsed = memoryRecallQuerySchema.safeParse({
    userId: url.searchParams.get('userId') ?? '',
    query: url.searchParams.get('query') ?? '',
    k: url.searchParams.get('k') ?? DEFAULT_MEMORY_RECALL_K,
    minScore: url.searchParams.get('minScore') ?? DEFAULT_MEMORY_RECALL_MIN_SCORE,
  });

  if (!parsed.success) {
    return {
      status: 400,
      body: { issues: parsed.error.issues },
    };
  }

  const memories = await memoryStore.recall(
    parsed.data.userId,
    parsed.data.query,
    parsed.data.k,
    parsed.data.minScore,
  );

  return {
    status: 200,
    body: {
      memories: memories.map((entry) => ({
        id: entry.id,
        userId: entry.userId,
        fact: entry.fact,
        createdAt: entry.createdAt,
        score: entry.score ?? 0,
      })),
    },
  };
}

async function processForgetMemoryRequest(body: unknown, memoryStore: MemoryStore): Promise<MemoryHttpResponse> {
  const parsed = memoryForgetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return {
      status: 400,
      body: { issues: parsed.error.issues },
    };
  }

  const removed = memoryStore.forgetPreference(parsed.data.userId, parsed.data.target);
  return {
    status: 200,
    body: {
      removed,
      userId: parsed.data.userId,
      target: parsed.data.target,
    },
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString('utf-8');
  try {
    return JSON.parse(text);
  } catch {
    return Symbol.for('invalid-json-body');
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function createServer(options: ChatServerOptions = {}): Server {
  const conversationStore = options.conversationStore ?? new SqliteConversationStore();
  const memoryStore = options.memoryStore ?? new MemoryStore();
  const learningReflector = options.learningReflector ?? new LearningReflector({
    memoryStore,
    onAudit(event) {
      console.info(
        '[learning-reflector]',
        JSON.stringify({
          userId: event.userId,
          hasLearning: event.hasLearning,
          stored: event.stored,
          reason: event.reason,
        }),
      );
    },
  });

  return createNodeServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/chat') {
      const body = await readJsonBody(request);
      if (body === Symbol.for('invalid-json-body')) {
        sendJson(response, 400, {
          issues: [
            {
              code: 'custom',
              message: 'Invalid JSON body',
              path: [],
            },
          ],
        });
        return;
      }

      const result = await processChatRequest(body, { ...options, conversationStore, memoryStore, learningReflector });
      sendJson(response, result.status, result.body);
      return;
    }

    if (url.pathname === '/memories' && request.method === 'GET') {
      const result = await processRecallMemoryRequest(url, memoryStore);
      sendJson(response, result.status, result.body);
      return;
    }

    if (url.pathname === '/memories' && (request.method === 'POST' || request.method === 'DELETE')) {
      const body = await readJsonBody(request);
      if (body === Symbol.for('invalid-json-body')) {
        sendJson(response, 400, {
          issues: [
            {
              code: 'custom',
              message: 'Invalid JSON body',
              path: [],
            },
          ],
        });
        return;
      }

      const result = request.method === 'POST'
        ? await processRememberMemoryRequest(body, memoryStore)
        : await processForgetMemoryRequest(body, memoryStore);
      sendJson(response, result.status, result.body);
      return;
    }

    if (request.method === 'POST' && url.pathname !== '/chat') {
      sendJson(response, 404, { error: 'Not Found' });
      return;
    }
    sendJson(response, 404, { error: 'Not Found' });
  });
}

