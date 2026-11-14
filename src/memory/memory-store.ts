import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

import { embedText, type EmbeddingVector } from './embeddings.js';

export type MemoryRecord = {
  id: string;
  userId: string;
  fact: string;
  embedding: EmbeddingVector;
  createdAt: string;
  score?: number;
};

export const MEMORY_DEDUP_THRESHOLD = 0.92;
export const MEMORY_RECALL_THRESHOLD = 0.3;
export const MEMORY_RECALL_LIMIT = 3;

export type EmbeddingProvider = (text: string) => Promise<EmbeddingVector>;

function normalizeUserId(userId: string): string {
  return userId.trim();
}

function normalizeTarget(target: string): string {
  return target.trim();
}

function dotProduct(left: EmbeddingVector, right: EmbeddingVector): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) {
    return 0;
  }

  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += left[index] * right[index];
  }

  const leftNorm = Math.hypot(...left);
  const rightNorm = Math.hypot(...right);
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }

  return sum / (leftNorm * rightNorm);
}

function serializeEmbedding(embedding: EmbeddingVector): Buffer {
  const bytes = Float32Array.from(embedding);
  return Buffer.from(bytes.buffer);
}

function deserializeEmbedding(blob: Uint8Array | Buffer | null): EmbeddingVector {
  if (!blob || blob.length === 0) {
    return [];
  }

  const values = new Float32Array(blob.buffer, blob.byteOffset, Math.floor(blob.byteLength / 4));
  return Array.from(values);
}

function toMemoryRecord(row: {
  id: string;
  user_id: string;
  fact: string;
  embedding: Uint8Array | Buffer;
  created_at: string;
  score?: number;
}): MemoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    fact: row.fact,
    embedding: deserializeEmbedding(row.embedding),
    createdAt: row.created_at,
    score: row.score,
  };
}

export class MemoryStore {
  readonly db: DatabaseSync;
  readonly embeddingProvider: EmbeddingProvider;

  constructor(path = process.env.OPSPILOT_DB ?? './data/opspilot.db', embeddingProvider: EmbeddingProvider = embedText) {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        fact TEXT NOT NULL,
        embedding BLOB NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_id_created_at
      ON memories (user_id, created_at DESC, id DESC);
    `);

    this.embeddingProvider = embeddingProvider;
  }

  async remember(userId: string, fact: string): Promise<MemoryRecord | null> {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedFact = fact.trim();

    if (!normalizedUserId || normalizedFact.length === 0) {
      throw new Error('userId and fact are required to save a memory');
    }

    const queryEmbedding = await this.embeddingProvider(normalizedFact);
    const existingMemories = this.listByUser(normalizedUserId);

    for (const memory of existingMemories) {
      const similarity = dotProduct(queryEmbedding, memory.embedding);
      if (similarity > MEMORY_DEDUP_THRESHOLD) {
        return null;
      }
    }

    const id = `mem-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    const embeddingBlob = serializeEmbedding(queryEmbedding);

    this.db.prepare(
      'INSERT INTO memories (id, user_id, fact, embedding, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, normalizedUserId, normalizedFact, embeddingBlob, createdAt);

    return {
      id,
      userId: normalizedUserId,
      fact: normalizedFact,
      embedding: queryEmbedding,
      createdAt,
    };
  }

  async recall(userId: string, query: string, k = MEMORY_RECALL_LIMIT, minSimilarity = MEMORY_RECALL_THRESHOLD): Promise<MemoryRecord[]> {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedQuery = query.trim();

    if (!normalizedUserId || normalizedQuery.length === 0) {
      return [];
    }

    const queryEmbedding = await this.embeddingProvider(normalizedQuery);
    const rows = this.db.prepare(
      'SELECT id, user_id, fact, embedding, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC',
    ).all(normalizedUserId) as Array<{
      id: string;
      user_id: string;
      fact: string;
      embedding: Uint8Array | Buffer;
      created_at: string;
    }>;

    return rows
      .map((row) => {
        const memory = toMemoryRecord(row);
        const similarity = dotProduct(queryEmbedding, memory.embedding);
        return { ...memory, score: similarity };
      })
      .filter((memory) => memory.score !== undefined && memory.score >= minSimilarity)
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .slice(0, k)
      .map((memory) => ({
        id: memory.id,
        userId: memory.userId,
        fact: memory.fact,
        embedding: memory.embedding,
        createdAt: memory.createdAt,
        score: memory.score,
      }));
  }

  forget(id: string): boolean {
    const result = this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
    return result.changes > 0;
  }

  forgetPreference(userId: string, target: string): number {
    const normalizedUserId = normalizeUserId(userId);
    const normalizedTarget = normalizeTarget(target);

    if (!normalizedUserId || !normalizedTarget) {
      throw new Error('userId and target are required to forget preference');
    }

    const result = this.db.prepare(
      'DELETE FROM memories WHERE user_id = ? AND lower(fact) LIKE lower(?)',
    ).run(normalizedUserId, `%${normalizedTarget}%`);

    return Number(result.changes);
  }

  listByUser(userId: string): MemoryRecord[] {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) {
      return [];
    }

    const rows = this.db.prepare(
      'SELECT id, user_id, fact, embedding, created_at FROM memories WHERE user_id = ? ORDER BY created_at DESC',
    ).all(normalizedUserId) as Array<{
      id: string;
      user_id: string;
      fact: string;
      embedding: Uint8Array | Buffer;
      created_at: string;
    }>;

    return rows.map((row) => toMemoryRecord(row));
  }
}
