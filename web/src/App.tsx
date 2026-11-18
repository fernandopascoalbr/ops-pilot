import { useEffect, useState } from 'react'
import { ChatPanel } from './components/chat/ChatPanel'
import { DecisionCard } from './components/decision-card/DecisionCard'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useWarRoom } from './features/war-room/use-war-room'
import {
  DEFAULT_BASE_URL,
  DEFAULT_REQUEST_TIMEOUT_MS,
  DEFAULT_THEME,
  readStoredConfig,
  writeStoredConfig,
  type ThemeMode,
} from './services/config'
import './App.css'

function App() {
  const initialConfig = readStoredConfig()
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl)
  const [theme, setTheme] = useState<ThemeMode>(initialConfig.theme)
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(initialConfig.requestTimeoutMs)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [decisionsOpen, setDecisionsOpen] = useState(false)
  const handleRequestTimeoutMsChange = (value: number) => {
    if (!Number.isFinite(value)) return
    const bounded = Math.min(300_000, Math.max(5_000, Math.round(value)))
    setRequestTimeoutMs(bounded)
  }

  const {
    messages,
    decisions,
    status,
    error,
    traceEvents,
    selectedTraceId,
    setSelectedTraceId,
    isSending,
    sendPrompt,
    updateDecision,
    retryLastPrompt,
  } = useWarRoom(baseUrl, requestTimeoutMs)

  useEffect(() => {
    const effectiveTheme = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

    document.documentElement.dataset.theme = effectiveTheme
    writeStoredConfig({
      baseUrl: baseUrl || DEFAULT_BASE_URL,
      theme,
      requestTimeoutMs: Number.isFinite(requestTimeoutMs) ? requestTimeoutMs : DEFAULT_REQUEST_TIMEOUT_MS,
    })
  }, [baseUrl, theme, requestTimeoutMs])

  const selectedTrace = traceEvents.find((step) => step.id === selectedTraceId) ?? traceEvents[0] ?? null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">OpsPilot</span>
          <h1>War room</h1>
        </div>

        <div className="toolbar">
          <button type="button" className="ghost-button" onClick={() => setDecisionsOpen(true)}>
            Ver decisões
          </button>
          <button type="button" className="ghost-button" onClick={() => setSettingsOpen(true)} aria-label="Abrir configurações da API">
            ⚙
          </button>
        </div>
      </header>

      {error ? (
        <div className="error-banner" role="alert">
          <strong>Falha operacional</strong>
          <p>{error.message}</p>
          {error.actions.length > 0 && (
            <button type="button" className="secondary-button" onClick={() => retryLastPrompt()}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : null}

      <main className="war-room-layout">
        <div className="primary-column">
          <ChatPanel messages={messages} isSending={isSending} onSubmit={sendPrompt} />
        </div>
      </main>

      <SettingsPanel
        baseUrl={baseUrl || DEFAULT_BASE_URL}
        theme={theme || DEFAULT_THEME}
        requestTimeoutMs={requestTimeoutMs || DEFAULT_REQUEST_TIMEOUT_MS}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onBaseUrlChange={setBaseUrl}
        onThemeChange={setTheme}
        onRequestTimeoutMsChange={handleRequestTimeoutMsChange}
      />

      {decisionsOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Decisões">
          <div className="modal-panel">
            <div className="settings-header">
              <div>
                <span className="eyebrow">Ação</span>
                <h3>Decisões</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setDecisionsOpen(false)} aria-label="Fechar decisões">
                ×
              </button>
            </div>
            {decisions.length === 0 ? (
              <div className="empty-panel">
                <p>Nenhuma recomendação pendente.</p>
              </div>
            ) : (
              <div className="decision-stack">
                {decisions.map((card) => (
                  <DecisionCard
                    key={card.id}
                    card={card}
                    isSelected={selectedTrace?.id === card.traceId}
                    onSelect={(cardId) => {
                      const activeCard = decisions.find((item) => item.id === cardId)
                      if (activeCard?.traceId) setSelectedTraceId(activeCard.traceId)
                    }}
                    onApprove={(cardId) => updateDecision(cardId, 'approved')}
                    onReject={(cardId) => updateDecision(cardId, 'rejected')}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {status === 'loading' ? <div className="loading-overlay" aria-live="polite">Processando resposta…</div> : null}
    </div>
  )
}

export default App
