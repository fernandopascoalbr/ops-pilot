import { createServer as createNodeServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { z } from 'zod';
import { UnknownStrategyError, defaultStrategyRegistry, resolveStrategy, type StrategyRegistry } from '../agents/index.js';
import { chatRequestSchema } from './chat-schema.js';

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_MAX_ITERATIONS = 8;
const MAX_BODY_BYTES = 1_000_000;

type ChatResultBody = {
  answer: string;
  trace: unknown[];
  metrics: Record<string, unknown>;
};

export type ChatHttpResponse =
  | { status: 200; body: ChatResultBody }
  | { status: 400; body: { issues: z.ZodIssue[] | Array<{ code: string; message: string; path: (string | number)[] }> } }
  | { status: 422; body: { error: string } }
  | { status: 504; body: { error: string } };

export type ChatServerOptions = {
  timeoutMs?: number;
  maxIterations?: number;
  registry?: StrategyRegistry;
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

  try {
    const strategy = resolveStrategy(parsed.data.strategy, { reflect: parsed.data.reflect, registry });
    const result = await withTimeout(strategy.run(parsed.data.message, maxIterations), timeoutMs);
    return {
      status: 200,
      body: {
        answer: result.answer,
        trace: result.trace,
        metrics: result.metrics,
      },
    };
  } catch (error) {
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
  return createNodeServer(async (request, response) => {
    if (request.method !== 'POST' || request.url !== '/chat') {
      sendJson(response, 404, { error: 'Not Found' });
      return;
    }

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

    const result = await processChatRequest(body, options);
    sendJson(response, result.status, result.body);
  });
}

