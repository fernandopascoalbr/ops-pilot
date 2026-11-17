import { useEffect, useState } from 'react'
import { ChatPanel } from './components/chat/ChatPanel'
import { DecisionCard } from './components/decision-card/DecisionCard'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { TracePanel } from './components/trace-panel/TracePanel'
import { useWarRoom } from './features/war-room/use-war-room'
import { DEFAULT_BASE_URL, DEFAULT_THEME, readStoredConfig, writeStoredConfig, type ThemeMode } from './services/config'
import './App.css'

function App() {
  const initialConfig = readStoredConfig()
  const [baseUrl, setBaseUrl] = useState(initialConfig.baseUrl)
  const [theme, setTheme] = useState<ThemeMode>(initialConfig.theme)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
  } = useWarRoom(baseUrl)

  useEffect(() => {
    const effectiveTheme = theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

    document.documentElement.dataset.theme = effectiveTheme
    writeStoredConfig({ baseUrl: baseUrl || DEFAULT_BASE_URL, theme })
  }, [baseUrl, theme])

  const selectedTrace = traceEvents.find((step) => step.id === selectedTraceId) ?? traceEvents[0] ?? null

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">OpsPilot</span>
          <h1>War room</h1>
        </div>

        <div className="toolbar">
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

        <aside className="secondary-column">
          <section className="panel">
            <div className="panel-header">
              <span className="eyebrow">Ação</span>
              <h3>Decisões</h3>
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
          </section>

          <TracePanel trace={traceEvents} selectedTraceId={selectedTraceId} onSelect={setSelectedTraceId} />
        </aside>
      </main>

      <SettingsPanel
        baseUrl={baseUrl || DEFAULT_BASE_URL}
        theme={theme || DEFAULT_THEME}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onBaseUrlChange={setBaseUrl}
        onThemeChange={setTheme}
      />

      {status === 'loading' ? <div className="loading-overlay" aria-live="polite">Processando resposta…</div> : null}
    </div>
  )
}

export default App
