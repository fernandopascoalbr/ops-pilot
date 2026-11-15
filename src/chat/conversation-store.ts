export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
  createdAt: string;
};

export type ConversationSummary = {
  conversationId: string;
  summaryText: string;
  summarizedMessageCount: number;
  updatedAt: string;
};

export class ConversationNotFoundError extends Error {
  readonly conversationId: string;

  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
    this.conversationId = conversationId;
  }
}

export interface ConversationStore {
  create(): string;
  append(conversationId: string, role: ConversationRole, content: string): void;
  lastMessages(conversationId: string, limit: number): ConversationMessage[];
  listMessages(conversationId: string): ConversationMessage[];
  readSummary(conversationId: string): ConversationSummary | null;
  upsertSummary(conversationId: string, summaryText: string, summarizedMessageCount: number): ConversationSummary;
}
