import type { TraceStep } from './trace'

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  timestamp: string
  traceId?: string
}

export interface ChatMetrics {
  totalTimeMs: number
  promptTokens?: number
  completionTokens?: number
  costUsd?: number
}

export interface ChatResponse {
  answer: string
  trace: TraceStep[]
  metrics: ChatMetrics
}

export interface ApiIssue {
  code: string
  message: string
  path?: string[]
}

export interface ChatRequest {
  message: string
  strategy?: string
  reflect?: boolean
  conversationId?: string
  userId?: string
}
