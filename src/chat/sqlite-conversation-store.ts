import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import {
  ConversationNotFoundError,
  type ConversationMessage,
  type ConversationRole,
  type ConversationStore,
} from './conversation-store.js';

type MessageRow = {
  role: ConversationRole;
  content: string;
  created_at: string;
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

  private ensureConversationExists(conversationId: string): void {
    const row = this.db.prepare('SELECT id FROM conversations WHERE id = ?').get(conversationId) as { id: string } | undefined;
    if (!row) {
      throw new ConversationNotFoundError(conversationId);
    }
  }
}
