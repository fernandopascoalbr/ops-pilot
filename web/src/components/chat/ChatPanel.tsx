import { useState, type FormEvent } from 'react'
import type { ChatMessage } from '../../types/chat'
import { MarkdownContent } from '../markdown/MarkdownContent'
import { TracePanel } from '../trace-panel/TracePanel'

interface ChatPanelProps {
  messages: ChatMessage[]
  isSending: boolean
  onSubmit: (prompt: string) => Promise<void>
}

export function ChatPanel({ messages, isSending, onSubmit }: ChatPanelProps) {
  const [draft, setDraft] = useState('')
  const [traceModalMessageId, setTraceModalMessageId] = useState<string | null>(null)
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!draft.trim()) return
    const value = draft.trim()
    setDraft('')
    await onSubmit(value)
  }

  const activeTraceMessage = traceModalMessageId
    ? messages.find((message) => message.id === traceModalMessageId && message.trace && message.trace.length > 0) ?? null
    : null

  return (
    <section className="chat-shell" aria-label="Chat principal da sala de guerra">
      <div className="chat-header">
        <div>
          <span className="eyebrow">Operações</span>
          <h2>War room chat</h2>
        </div>
        <span className="status-pill">{isSending ? 'Processando…' : 'Disponível'}</span>
      </div>

      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty-state">
            <strong>Sem conversa ativa</strong>
            <p>Envie a primeira pergunta para iniciar a análise operacional.</p>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className={`message-row ${message.role}`}>
              <div className="message-bubble">
                <span className="message-role">{message.role === 'assistant' ? 'OpsPilot' : message.role === 'user' ? 'Você' : 'Sistema'}</span>
                {message.role === 'assistant' || message.role === 'system' ? (
                  <MarkdownContent content={message.content} className="markdown-content" />
                ) : (
                  <p>{message.content}</p>
                )}
                {message.role === 'assistant' && message.trace && message.trace.length > 0 ? (
                  <div className="message-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => {
                        setTraceModalMessageId(message.id)
                        setSelectedTraceId(message.trace?.[0]?.id ?? null)
                      }}
                    >
                      Ver raciocínio
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <label className="sr-only" htmlFor="war-room-input">Mensagem para o OpsPilot</label>
        <textarea
          id="war-room-input"
          aria-label="Mensagem para o OpsPilot"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Descreva o incidente, o impacto ou a decisão que precisa de revisão…"
          disabled={isSending}
        />
        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={isSending || !draft.trim()}>
            {isSending ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>

      {activeTraceMessage ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Raciocínio da resposta">
          <div className="modal-panel">
            <div className="settings-header">
              <div>
                <span className="eyebrow">Raciocínio</span>
                <h3>Trace da resposta</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setTraceModalMessageId(null)}
                aria-label="Fechar raciocínio"
              >
                ×
              </button>
            </div>
            <TracePanel trace={activeTraceMessage.trace ?? []} selectedTraceId={selectedTraceId} onSelect={setSelectedTraceId} />
          </div>
        </div>
      ) : null}
    </section>
  )
}
