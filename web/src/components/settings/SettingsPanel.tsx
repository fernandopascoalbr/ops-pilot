import type { ThemeMode } from '../../services/config'

interface SettingsPanelProps {
  baseUrl: string
  theme: ThemeMode
  isOpen: boolean
  onClose: () => void
  onBaseUrlChange: (value: string) => void
  onThemeChange: (value: ThemeMode) => void
}

export function SettingsPanel({ baseUrl, theme, isOpen, onClose, onBaseUrlChange, onThemeChange }: SettingsPanelProps) {
  if (!isOpen) return null

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Configurações da API">
      <div className="settings-panel">
        <div className="settings-header">
          <div>
            <span className="eyebrow">Configuração</span>
            <h3>API do incidente</h3>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar configurações">
            ×
          </button>
        </div>

        <label>
          URL base da API
          <input
            type="text"
            value={baseUrl}
            onChange={(event) => onBaseUrlChange(event.target.value)}
            placeholder="https://api.example.com/opspilot"
          />
        </label>

        <label>
          Tema
          <select value={theme} onChange={(event) => onThemeChange(event.target.value as ThemeMode)}>
            <option value="dark">Escuro</option>
            <option value="light">Claro</option>
            <option value="system">Sistema</option>
          </select>
        </label>

        <p className="settings-help">
          A API é montada como <code>{baseUrl}/chat</code> e qualquer falha de CORS ou disponibilidade é exibida explicitamente para o operador.
        </p>
      </div>
    </div>
  )
}
