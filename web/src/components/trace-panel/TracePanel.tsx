import type { TraceStep } from '../../types/trace'
import { MarkdownContent } from '../markdown/MarkdownContent'

interface TracePanelProps {
  trace: TraceStep[]
  selectedTraceId: string | null
  onSelect: (id: string) => void
}

export function TracePanel({ trace, selectedTraceId, onSelect }: TracePanelProps) {
  return (
    <aside className="trace-panel" aria-label="Detalhes do raciocínio">
      <div className="trace-header">
        <span className="eyebrow">Raciocínio</span>
        <h3>Trace tipado</h3>
      </div>

      {trace.length === 0 ? (
        <div className="empty-panel">
          <p>Sem evidências de raciocínio disponíveis.</p>
        </div>
      ) : (
        <ul className="trace-list">
          {trace.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                className={`trace-item ${selectedTraceId === step.id ? 'active' : ''}`}
                onClick={() => onSelect(step.id)}
              >
                <span className={`trace-dot ${step.type}`} />
                <div>
                  <strong>{step.type}</strong>
                  <MarkdownContent content={step.message} className="markdown-content trace-markdown" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
