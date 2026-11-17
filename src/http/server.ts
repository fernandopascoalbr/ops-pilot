import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createTraceEvent } from '../agents/trace.js';
import { UnknownStrategyError, defaultStrategyRegistry, resolveStrategy, type StrategyRegistry } from '../agents/index.js';
import { ModelUnavailableError } from '../agents/model.js';
import {
  ConversationNotFoundError,
  RECENT_WINDOW_MESSAGES,
  selectDisplacedBatch,
  summarizeDisplacedMessages,
  type ConversationMessage,
  type ConversationStore,
  SqliteConversationStore,
} from '../chat/index.js';
import { buildContext } from '../context/context-builder.js';
import { type ContextBreakdown } from '../context/token.js';
import { LearningReflector, MemoryStore, type MemoryRecord } from '../memory/index.js';
import { routeForStrategy, routeRequest } from '../graph/production-graph.js';
import { logObsEvent } from '../obs/logger.js';
import { SqliteRequestTraceStore, type RequestTraceStore } from '../store/index.js';
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

const sinceDurationSchema = z.string().trim().regex(/^\d+[smhd]$/, 'since must be a duration like 24h, 30m, 7d');

const statsQuerySchema = z.object({
  since: sinceDurationSchema.default('24h'),
});

type ChatResultBody = {
  requestId: string;
  conversationId: string;
  answer: string;
  route: string;
  reason: string;
  trace: unknown[];
  metrics: Record<string, unknown> & {
    route: string;
    routeReason: string;
    promptTokens: number | null;
    contextBreakdown: ContextBreakdown;
  };
};

export type ChatHttpResponse =
  | { status: 200; body: ChatResultBody }
  | { status: 400; body: { requestId: string; issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } }
  | { status: 404; body: { requestId: string; error: string } }
  | { status: 422; body: { requestId: string; error: string } }
  | { status: 503; body: { requestId: string; error: string } }
  | { status: 504; body: { requestId: string; error: string } };

type MemoryHttpResponse =
  | { status: 200; body: Record<string, unknown> }
  | { status: 201; body: Record<string, unknown> }
  | { status: 400; body: { issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } };

type StatsHttpResponse =
  | { status: 200; body: Record<string, unknown> }
  | { status: 400; body: { issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } };

export type ChatServerOptions = {
  timeoutMs?: number;
  maxIterations?: number;
  registry?: StrategyRegistry;
  conversationStore?: ConversationStore;
  memoryStore?: MemoryStore;
  learningReflector?: Pick<LearningReflector, 'reflectAndRememberAsync'>;
  requestTraceStore?: RequestTraceStore;
  requestId?: string;
};

class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Chat request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

function durationToMilliseconds(duration: string): number {
  const value = Number.parseInt(duration.slice(0, -1), 10);
  const unit = duration.at(-1);

  switch (unit) {
    case 's':
      return value * 1_000;
    case 'm':
      return value * 60_000;
    case 'h':
      return value * 3_600_000;
    case 'd':
      return value * 86_400_000;
    default:
      return 0;
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
  const result = buildContext({
    message,
    history,
    memories: memories.map((memory) => ({
      id: memory.id,
      fact: memory.fact,
      score: memory.score,
    })),
    summary: persistedSummary,
    systemPrompt: 'Você é um assistente útil e responsável que responde com clareza e segurança.',
  });

  return {
    input: result.input,
    contextBreakdown: result.contextBreakdown,
  };
}

export async function processChatRequest(body: unknown, options: ChatServerOptions = {}): Promise<ChatHttpResponse> {
  const requestId = options.requestId ?? randomUUID();
  const createdAt = new Date().toISOString();
  const parsed = chatRequestSchema.safeParse(body);
  const requestTraceStore = options.requestTraceStore ?? new SqliteRequestTraceStore();

  if (!parsed.success) {
    requestTraceStore.saveRequest({
      requestId,
      status: 'error',
      route: 'validation',
      routeReason: 'request body validation failed',
      llmCalls: 0,
      latencyMs: 0,
      promptTokens: null,
      modelUsed: null,
      createdAt,
      finishedAt: new Date().toISOString(),
    });
    return {
      status: 400,
      body: { requestId, issues: parsed.error.issues },
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
    const explicitRoute = parsed.data.strategy ? routeForStrategy(parsed.data.strategy) : await routeRequest(parsed.data.message);
    const routeTrace = parsed.data.strategy
      ? [createTraceEvent('route', `Rota escolhida: ${explicitRoute.route}`, {
        node: 'roteador',
        route: explicitRoute.route,
        reason: explicitRoute.reason,
        args: { source: 'explicit', strategy: parsed.data.strategy },
      })]
      : explicitRoute.trace;
    const strategy = resolveStrategy(
      parsed.data.strategy ?? explicitRoute.strategyName,
      { reflect: parsed.data.reflect, registry },
    );
    conversationStore.append(conversationId, 'user', parsed.data.message);

    const composedContext = composeMessageWithHistory(parsed.data.message, history, relevantMemories, activeSummary);
    const result = await withTimeout(strategy.run(composedContext.input, maxIterations), timeoutMs);
    const tracedEvents = [...routeTrace, ...(summarizeTrace ? [summarizeTrace, ...result.trace] : result.trace)].map((event) => ({
      ...event,
      node: event.node ?? strategy.name,
      route: event.route ?? explicitRoute.route,
      reason: event.reason ?? explicitRoute.reason,
    }));
    const finishedAt = new Date().toISOString();
    conversationStore.append(conversationId, 'assistant', result.answer);
    if (parsed.data.userId) {
      learningReflector.reflectAndRememberAsync({
        userId: parsed.data.userId,
        lastUserMessage: parsed.data.message,
      });
    }

    requestTraceStore.saveRequest({
      requestId,
      status: 'success',
      route: explicitRoute.route,
      routeReason: explicitRoute.reason,
      llmCalls: result.metrics.llmCalls,
      latencyMs: result.metrics.latencyMs,
      promptTokens: typeof result.metrics.promptTokens === 'number' ? result.metrics.promptTokens : null,
      modelUsed: typeof result.metrics.modelUsed === 'string' ? result.metrics.modelUsed : null,
      createdAt,
      finishedAt,
    });

    requestTraceStore.saveTraceEvents(tracedEvents.map((event: any, index: number) => ({
      eventId: randomUUID(),
      requestId,
      seq: index + 1,
      node: typeof event.node === 'string' ? event.node : strategy.name,
      type: typeof event.type === 'string' ? event.type : 'observation',
      payload: {
        tool: event.tool,
        route: event.route,
        reason: event.reason,
        args: event.args,
      },
      occurredAt: typeof event.timestamp === 'string' ? event.timestamp : finishedAt,
    })));

    for (const event of tracedEvents as Array<Record<string, unknown>>) {
      logObsEvent({
        requestId,
        node: typeof event.node === 'string' ? event.node : strategy.name,
        eventType: typeof event.type === 'string' ? event.type : 'observation',
        route: explicitRoute.route,
        metadata: {
          tool: event.tool,
          reason: event.reason,
        },
      });
    }

    return {
      status: 200,
      body: {
        requestId,
        conversationId,
        answer: result.answer,
        route: explicitRoute.route,
        reason: explicitRoute.reason,
        trace: tracedEvents,
        metrics: {
          ...result.metrics,
          modelUsed: typeof result.metrics.modelUsed === 'string' && result.metrics.modelUsed.length > 0
            ? result.metrics.modelUsed
            : 'unknown',
          route: explicitRoute.route,
          routeReason: explicitRoute.reason,
          historyMessages: history.length,
          memoryRecallCount: relevantMemories.length,
          promptTokens: typeof result.metrics.promptTokens === 'number' ? result.metrics.promptTokens : null,
          contextBreakdown: composedContext.contextBreakdown,
        },
      },
    };
  } catch (error) {
    requestTraceStore.saveRequest({
      requestId,
      status: 'error',
      route: 'chat',
      routeReason: 'chat execution failed',
      llmCalls: 0,
      latencyMs: 0,
      promptTokens: null,
      modelUsed: null,
      createdAt,
      finishedAt: new Date().toISOString(),
    });

    if (error instanceof ConversationNotFoundError) {
      return {
        status: 404,
        body: { requestId, error: error.message },
      };
    }
    if (error instanceof UnknownStrategyError) {
      return {
        status: 422,
        body: { requestId, error: error.message },
      };
    }
    if (error instanceof TimeoutError) {
      return {
        status: 504,
        body: { requestId, error: 'Chat processing timed out' },
      };
    }
    if (error instanceof ModelUnavailableError) {
      return {
        status: 503,
        body: { requestId, error: 'Model provider unavailable after retry and fallback attempts.' },
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

function processGetRequestById(requestId: string, requestTraceStore: RequestTraceStore):
{ status: 200; body: { request: unknown; trace: unknown[] } } | { status: 404; body: { error: string } } {
  const requestTrace = requestTraceStore.getRequestTrace(requestId);
  if (!requestTrace) {
    return {
      status: 404,
      body: { error: 'Request not found' },
    };
  }

  return {
    status: 200,
    body: {
      request: requestTrace.request,
      trace: requestTrace.trace,
    },
  };
}

function processGetStats(url: URL, requestTraceStore: RequestTraceStore): StatsHttpResponse {
  const parsed = statsQuerySchema.safeParse({
    since: url.searchParams.get('since') ?? '24h',
  });

  if (!parsed.success) {
    return {
      status: 400,
      body: { issues: parsed.error.issues },
    };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const sinceMs = durationToMilliseconds(parsed.data.since);
  const fromIso = new Date(now.getTime() - sinceMs).toISOString();
  const stats = requestTraceStore.getRequestStats(fromIso, nowIso);

  return {
    status: 200,
    body: {
      since: parsed.data.since,
      ...stats,
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

function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS ?? '';
  return configured
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function applyCorsHeaders(response: ServerResponse, origin: string | undefined, requestedHeaders?: string): void {
  const allowedOrigins = getAllowedOrigins();
  const resolvedOrigin = origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) ? origin : undefined;

  response.setHeader('Vary', 'Origin, Access-Control-Request-Headers');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', requestedHeaders || 'Content-Type, Authorization, X-Requested-With, Accept');
  response.setHeader('Access-Control-Allow-Private-Network', 'true');
  response.setHeader('Access-Control-Allow-Credentials', 'true');
  response.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
  response.setHeader('Access-Control-Max-Age', '600');

  if (resolvedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', resolvedOrigin);
  }
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown, requestId?: string): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  if (requestId) {
    response.setHeader('X-Request-Id', requestId);
  }
  response.end(JSON.stringify(payload));
}

export function createServer(options: ChatServerOptions = {}): Server {
  const conversationStore = options.conversationStore ?? new SqliteConversationStore();
  const memoryStore = options.memoryStore ?? new MemoryStore();
  const requestTraceStore = options.requestTraceStore ?? new SqliteRequestTraceStore();
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
    const origin = request.headers.origin;
    applyCorsHeaders(response, origin, request.headers['access-control-request-headers'] as string | undefined);

    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    if (request.method === 'POST' && url.pathname === '/chat') {
      const requestId = randomUUID();
      const body = await readJsonBody(request);
      if (body === Symbol.for('invalid-json-body')) {
        sendJson(response, 400, {
          requestId,
          issues: [
            {
              code: 'custom',
              message: 'Invalid JSON body',
              path: [],
            },
          ],
        }, requestId);
        return;
      }

      const result = await processChatRequest(body, {
        ...options,
        requestId,
        requestTraceStore,
        conversationStore,
        memoryStore,
        learningReflector,
      });
      sendJson(response, result.status, result.body, result.body.requestId);
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/requests/')) {
      const requestId = url.pathname.slice('/requests/'.length);
      if (!requestId) {
        sendJson(response, 404, { error: 'Request not found' });
        return;
      }

      const result = processGetRequestById(requestId, requestTraceStore);
      sendJson(response, result.status, result.body);
      return;
    }

    if (request.method === 'GET' && url.pathname === '/stats') {
      const result = processGetStats(url, requestTraceStore);
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

