export type TraceKind = 'info' | 'action' | 'decision' | 'critique' | 'result'

export interface TraceStep {
  id: string
  message: string
  type: TraceKind
  timestamp?: string
}
