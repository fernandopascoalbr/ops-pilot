export type DecisionStatus = 'pending' | 'approved' | 'rejected'

export interface DecisionCard {
  id: string
  title: string
  summary: string
  status: DecisionStatus
  createdAt: string
  traceId?: string
  decisionBy?: string
}
