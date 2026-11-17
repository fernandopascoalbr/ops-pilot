import type { ChatMessage } from '../../types/chat'
import type { DecisionCard } from '../../types/decision'

export type WarRoomStatus = 'idle' | 'empty' | 'loading' | 'success' | 'error'

export interface ApiErrorState {
  code: string
  message: string
  retryable: boolean
  actions: string[]
}

export interface WarRoomState {
  status: WarRoomStatus
  messages: ChatMessage[]
  decisions: DecisionCard[]
  error?: ApiErrorState
}
