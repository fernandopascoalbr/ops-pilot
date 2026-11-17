export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'war-room-config'

export interface AppConfig {
  baseUrl: string
  theme: ThemeMode
}

export const DEFAULT_BASE_URL = 'http://localhost:3000'
export const DEFAULT_THEME: ThemeMode = 'dark'

export function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return DEFAULT_BASE_URL
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`
  return withScheme.replace(/\/+$/, '')
}

export function buildChatUrl(baseUrl: string): string {
  const normalized = normalizeBaseUrl(baseUrl)
  return `${normalized}/chat`
}

export function readStoredConfig(): AppConfig {
  if (typeof window === 'undefined') {
    return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME }
    }

    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      baseUrl: normalizeBaseUrl(parsed.baseUrl ?? DEFAULT_BASE_URL),
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : DEFAULT_THEME,
    }
  } catch {
    return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME }
  }
}

export function writeStoredConfig(config: AppConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

export function getApiBaseUrl(): string {
  return readStoredConfig().baseUrl
}

export function getThemePreference(): ThemeMode {
  return readStoredConfig().theme
}
