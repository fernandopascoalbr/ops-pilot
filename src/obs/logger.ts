export type ObsLogInput = {
  requestId: string;
  node: string;
  eventType: string;
  route?: string;
  metadata?: Record<string, unknown>;
};

export type ObsJsonLine = {
  timestamp: string;
  requestId: string;
  node: string;
  eventType: string;
  route?: string;
  metadata: Record<string, unknown>;
};

const FORBIDDEN_METADATA_KEYS = new Set(['payload', 'input', 'output', 'message', 'answer']);

export function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!metadata) {
    return {};
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (FORBIDDEN_METADATA_KEYS.has(key)) {
      continue;
    }
    sanitized[key] = value;
  }
  return sanitized;
}

export function formatObsJsonLine(input: ObsLogInput): string {
  const event: ObsJsonLine = {
    timestamp: new Date().toISOString(),
    requestId: input.requestId,
    node: input.node,
    eventType: input.eventType,
    ...(input.route ? { route: input.route } : {}),
    metadata: sanitizeMetadata(input.metadata),
  };
  return JSON.stringify(event);
}

export function logObsEvent(input: ObsLogInput): void {
  console.info(formatObsJsonLine(input));
}
