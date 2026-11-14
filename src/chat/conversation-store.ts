export type ConversationRole = 'user' | 'assistant';

export type ConversationMessage = {
  role: ConversationRole;
  content: string;
  createdAt: string;
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
}
