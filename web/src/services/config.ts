export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'war-room-config'
const MIN_REQUEST_TIMEOUT_MS = 5_000
const MAX_REQUEST_TIMEOUT_MS = 300_000

export interface AppConfig {
  baseUrl: string
  theme: ThemeMode
  requestTimeoutMs: number
}

export const DEFAULT_BASE_URL = 'http://localhost:3000'
export const DEFAULT_THEME: ThemeMode = 'dark'
export const DEFAULT_REQUEST_TIMEOUT_MS = 60_000

function normalizeRequestTimeoutMs(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_REQUEST_TIMEOUT_MS
  return Math.min(MAX_REQUEST_TIMEOUT_MS, Math.max(MIN_REQUEST_TIMEOUT_MS, Math.round(parsed)))
}

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
    return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME, requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME, requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS }
    }

    const parsed = JSON.parse(raw) as Partial<AppConfig>
    return {
      baseUrl: normalizeBaseUrl(parsed.baseUrl ?? DEFAULT_BASE_URL),
      theme: parsed.theme === 'light' || parsed.theme === 'system' ? parsed.theme : DEFAULT_THEME,
      requestTimeoutMs: normalizeRequestTimeoutMs(parsed.requestTimeoutMs),
    }
  } catch {
    return { baseUrl: DEFAULT_BASE_URL, theme: DEFAULT_THEME, requestTimeoutMs: DEFAULT_REQUEST_TIMEOUT_MS }
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

export function getApiTimeoutMs(): number {
  return readStoredConfig().requestTimeoutMs
}
