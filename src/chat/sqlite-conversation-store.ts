import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  ConversationNotFoundError,
  type ConversationMessage,
  type ConversationSummary,
  type ConversationRole,
  type ConversationStore,
} from './conversation-store.js';

type MessageRow = {
  role: ConversationRole;
  content: string;
  created_at: string;
};

type SummaryRow = {
  conversation_id: string;
  summary_text: string;
  summarized_message_count: number;
  updated_at: string;
};

export class SqliteConversationStore implements ConversationStore {
  readonly db: DatabaseSync;

  constructor(path = process.env.OPSPILOT_DB ?? './data/opspilot.db') {
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
      ON messages (conversation_id, created_at DESC, id DESC);

      CREATE TABLE IF NOT EXISTS conversation_summaries (
        conversation_id TEXT PRIMARY KEY,
        summary_text TEXT NOT NULL,
        summarized_message_count INTEGER NOT NULL CHECK (summarized_message_count >= 0),
        updated_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
  }

  create(): string {
    const id = `conv-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    this.db.prepare('INSERT INTO conversations (id, created_at) VALUES (?, ?)').run(id, createdAt);
    return id;
  }

  append(conversationId: string, role: ConversationRole, content: string): void {
    this.ensureConversationExists(conversationId);
    const id = `msg-${randomUUID()}`;
    const createdAt = new Date().toISOString();
    this.db.prepare(
      'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(id, conversationId, role, content, createdAt);
  }

  lastMessages(conversationId: string, limit: number): ConversationMessage[] {
    this.ensureConversationExists(conversationId);
    const boundedLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0;
    if (boundedLimit === 0) {
      return [];
    }

    const rows = this.db.prepare(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY rowid DESC LIMIT ?',
    ).all(conversationId, boundedLimit) as MessageRow[];

    return rows.reverse().map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  listMessages(conversationId: string): ConversationMessage[] {
    this.ensureConversationExists(conversationId);

    const rows = this.db.prepare(
      'SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY rowid ASC',
    ).all(conversationId) as MessageRow[];

    return rows.map((row) => ({
      role: row.role,
      content: row.content,
      createdAt: row.created_at,
    }));
  }

  readSummary(conversationId: string): ConversationSummary | null {
    this.ensureConversationExists(conversationId);
    const row = this.db.prepare(
      'SELECT conversation_id, summary_text, summarized_message_count, updated_at FROM conversation_summaries WHERE conversation_id = ?',
    ).get(conversationId) as SummaryRow | undefined;

    if (!row) {
      return null;
    }

    return {
      conversationId: row.conversation_id,
      summaryText: row.summary_text,
      summarizedMessageCount: row.summarized_message_count,
      updatedAt: row.updated_at,
    };
  }

  upsertSummary(conversationId: string, summaryText: string, summarizedMessageCount: number): ConversationSummary {
    this.ensureConversationExists(conversationId);
    const normalizedCount = Math.max(0, Math.floor(summarizedMessageCount));
    const updatedAt = new Date().toISOString();

    this.db.prepare(`
      INSERT INTO conversation_summaries (conversation_id, summary_text, summarized_message_count, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(conversation_id) DO UPDATE SET
        summary_text = excluded.summary_text,
        summarized_message_count = MAX(conversation_summaries.summarized_message_count, excluded.summarized_message_count),
        updated_at = excluded.updated_at
    `).run(conversationId, summaryText, normalizedCount, updatedAt);

    const current = this.readSummary(conversationId);
    if (!current) {
      throw new Error(`Unable to persist summary for conversation: ${conversationId}`);
    }

    return current;
  }

  private ensureConversationExists(conversationId: string): void {
    const row = this.db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId) as { id: string } | undefined;
    if (!row) {
      throw new ConversationNotFoundError(conversationId);
    }
  }
}
