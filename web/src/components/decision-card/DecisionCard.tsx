import type { DecisionCard as DecisionCardType } from '../../types/decision'
import { MarkdownContent } from '../markdown/MarkdownContent'

interface DecisionCardProps {
  card: DecisionCardType
  isSelected: boolean
  onSelect: (id: string) => void
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function DecisionCard({ card, isSelected, onSelect, onApprove, onReject }: DecisionCardProps) {
  return (
    <article className={`decision-card ${isSelected ? 'selected' : ''}`} aria-label={`Cartão de decisão ${card.title}`}>
      <button type="button" className="decision-header" onClick={() => onSelect(card.id)}>
        <span className="eyebrow">Decisão</span>
        <h3>{card.title}</h3>
      </button>

      <MarkdownContent content={card.summary} className="markdown-content" />

      <div className="decision-meta">
        <span className={`pill status-${card.status}`}>{card.status}</span>
        <time>{new Date(card.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
      </div>

      <div className="decision-actions">
        <button type="button" className="approve-button" onClick={() => onApprove(card.id)}>
          Aprovar
        </button>
        <button type="button" className="reject-button" onClick={() => onReject(card.id)}>
          Negar
        </button>
      </div>
    </article>
  )
}
