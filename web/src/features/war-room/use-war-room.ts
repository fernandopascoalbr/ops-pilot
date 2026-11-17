import { useCallback, useMemo, useState } from 'react'
import { postChatRequest } from '../../services/api'
import type { ChatMessage } from '../../types/chat'
import type { TraceStep } from '../../types/trace'
import type { DecisionCard } from '../../types/decision'
import type { ApiErrorState, WarRoomStatus } from './states'

export interface UseWarRoomResult {
  messages: ChatMessage[]
  decisions: DecisionCard[]
  status: WarRoomStatus
  error?: ApiErrorState
  traceEvents: TraceStep[]
  selectedTraceId: string | null
  isSending: boolean
  selectedTrace: TraceStep | null
  sendPrompt: (prompt: string) => Promise<void>
  setSelectedTraceId: (id: string | null) => void
  updateDecision: (cardId: string, nextStatus: DecisionCard['status']) => void
  retryLastPrompt: () => Promise<void>
  lastPrompt: string
}

export function useWarRoom(baseUrl: string): UseWarRoomResult {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [decisions, setDecisions] = useState<DecisionCard[]>([])
  const [traceEvents, setTraceEvents] = useState<TraceStep[]>([])
  const [status, setStatus] = useState<WarRoomStatus>('empty')
  const [error, setError] = useState<ApiErrorState | undefined>()
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [lastPrompt, setLastPrompt] = useState('')

  const traceMap = useMemo(() => {
    return new Map(traceEvents.map((item) => [item.id, item]))
  }, [traceEvents])

  const selectedTrace = selectedTraceId ? traceMap.get(selectedTraceId) ?? null : null

  const sendPrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) return

    const trimmed = prompt.trim()
    setLastPrompt(trimmed)
    setStatus('loading')
    setError(undefined)
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    setMessages((current) => [...current, userMessage])
    setIsSending(true)

    try {
      const response = await postChatRequest({
        message: trimmed,
        strategy: 'react',
        reflect: true,
      }, baseUrl)

      const traceId = response.trace[0]?.id ?? crypto.randomUUID()
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        traceId,
      }

      setTraceEvents(response.trace)
      setMessages((current) => [...current, assistantMessage])
      setSelectedTraceId(traceId)
      setStatus('success')

      const decision: DecisionCard = {
        id: crypto.randomUUID(),
        title: 'Recommended action',
        summary: response.answer.length > 140 ? `${response.answer.slice(0, 140)}…` : response.answer,
        status: 'pending',
        createdAt: new Date().toISOString(),
        traceId,
      }

      setDecisions((current) => [decision, ...current])
    } catch (caughtError) {
      const apiError = caughtError as ApiErrorState
      setError(apiError)
      setStatus('error')

      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'system',
        content: apiError.message,
        timestamp: new Date().toISOString(),
      }
      setMessages((current) => [...current, fallbackMessage])
    } finally {
      setIsSending(false)
    }
  }, [baseUrl])

  const updateDecision = useCallback((cardId: string, nextStatus: DecisionCard['status']) => {
    setDecisions((current) => current.map((card) => card.id === cardId ? { ...card, status: nextStatus, decisionBy: 'Operator' } : card))
  }, [])

  const retryLastPrompt = useCallback(async () => {
    if (!lastPrompt) return
    await sendPrompt(lastPrompt)
  }, [lastPrompt, sendPrompt])

  return {
    messages,
    decisions,
    status,
    error,
    traceEvents,
    selectedTraceId,
    setSelectedTraceId,
    isSending,
    selectedTrace,
    sendPrompt,
    updateDecision,
    retryLastPrompt,
    lastPrompt,
  }
}
