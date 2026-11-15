import type { ConversationMessage } from './conversation-store.js';

export const RECENT_WINDOW_MESSAGES = 8;
export const SUMMARY_BATCH_SIZE = 8;
export const SUMMARY_MAX_TOKENS = 150;

export const SUMMARIZER_PROMPT = `Comprima o trecho de conversa a seguir em no máximo 150 tokens, preservando obrigatoriamente: decisões tomadas, fatos estabelecidos (nomes, datas, prazos, preferências), incidentes abertos/resolvidos e pendências abertas. Descarte cumprimentos e conversa social. Se houver um resumo anterior, incorpore. Responsa só o resumo em tópicos telegráficos`;

const SOCIAL_CHAT_PATTERNS = [
  /^(oi|ol[áa]|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|tchau)\b/i,
  /^(hello|hi|thanks|thank you|bye)\b/i,
];

const SIGNAL_PATTERNS = [
  /decis[aã]o/i,
  /fato/i,
  /incidente/i,
  /pend[eê]n/i,
  /prazo/i,
  /data/i,
  /prefer[eê]n/i,
  /aberto/i,
  /resolvido/i,
  /\d{4}-\d{2}-\d{2}/,
];

type DisplacedBatch = {
  messages: ConversationMessage[];
  summarizedMessageCount: number;
  batchSize: number;
};

function toTokens(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function countTokens(text: string): number {
  return toTokens(text).length;
}

export function clampSummaryToTokenLimit(summary: string, maxTokens = SUMMARY_MAX_TOKENS): string {
  const tokens = toTokens(summary);
  if (tokens.length <= maxTokens) {
    return summary.trim();
  }

  return tokens.slice(0, maxTokens).join(' ').trim();
}

function normalizePoint(point: string): string {
  return point
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–•:]+/, '')
    .trim();
}

function isSocialChat(text: string): boolean {
  return SOCIAL_CHAT_PATTERNS.some((pattern) => pattern.test(text));
}

function hasImportantSignal(text: string): boolean {
  return SIGNAL_PATTERNS.some((pattern) => pattern.test(text));
}

function extractTelegraphicPoints(messages: ConversationMessage[]): string[] {
  const points: string[] = [];

  for (const message of messages) {
    const chunks = message.content.split(/[\n\r]+|(?<=[.!?])\s+/g);
    for (const chunk of chunks) {
      const normalized = normalizePoint(chunk);
      if (normalized.length < 3 || isSocialChat(normalized)) {
        continue;
      }

      if (hasImportantSignal(normalized)) {
        points.push(normalized);
      }
    }
  }

  if (points.length > 0) {
    return points;
  }

  for (const message of messages) {
    const normalized = normalizePoint(message.content);
    if (normalized.length >= 3 && !isSocialChat(normalized)) {
      points.push(normalized);
    }
    if (points.length >= 6) {
      break;
    }
  }

  return points;
}

function splitSummaryLines(summary: string): string[] {
  return summary
    .split('\n')
    .map((line) => normalizePoint(line))
    .filter((line) => line.length > 0);
}

export function summarizeDisplacedMessages(messages: ConversationMessage[], previousSummary = ''): string {
  const deduped = new Set<string>();
  const mergedPoints: string[] = [];

  for (const point of splitSummaryLines(previousSummary)) {
    if (!deduped.has(point)) {
      deduped.add(point);
      mergedPoints.push(point);
    }
  }

  for (const point of extractTelegraphicPoints(messages)) {
    if (!deduped.has(point)) {
      deduped.add(point);
      mergedPoints.push(point);
    }
  }

  const telegraphic = mergedPoints.map((point) => `- ${point}`).join('\n');
  return clampSummaryToTokenLimit(telegraphic);
}

export function selectDisplacedBatch(
  allMessages: ConversationMessage[],
  alreadySummarizedCount: number,
): DisplacedBatch {
  const activeDisplaced = Math.max(0, allMessages.length - RECENT_WINDOW_MESSAGES);
  const normalizedSummarizedCount = Math.max(0, Math.min(alreadySummarizedCount, activeDisplaced));
  const newDisplacedCount = Math.max(0, activeDisplaced - normalizedSummarizedCount);
  const completeBatchCount = Math.floor(newDisplacedCount / SUMMARY_BATCH_SIZE);
  const batchSize = completeBatchCount * SUMMARY_BATCH_SIZE;

  if (batchSize === 0) {
    return {
      messages: [],
      summarizedMessageCount: normalizedSummarizedCount,
      batchSize: 0,
    };
  }

  const start = normalizedSummarizedCount;
  const end = start + batchSize;
  return {
    messages: allMessages.slice(start, end),
    summarizedMessageCount: normalizedSummarizedCount + batchSize,
    batchSize,
  };
}
