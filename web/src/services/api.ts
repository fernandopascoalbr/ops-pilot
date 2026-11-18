import type { ChatRequest, ChatResponse } from '../types/chat'
import { buildChatUrl, getApiBaseUrl, getApiTimeoutMs, normalizeBaseUrl } from './config'
import type { ApiErrorState } from '../features/war-room/states'

export async function postChatRequest(
  payload: ChatRequest,
  baseUrl: string = getApiBaseUrl(),
  requestTimeoutMs: number = getApiTimeoutMs(),
): Promise<ChatResponse> {
  const url = buildChatUrl(baseUrl)
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), requestTimeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const raw = await response.text()
    const data = raw ? JSON.parse(raw) : {}

    if (!response.ok) {
      const issues = Array.isArray(data.issues) ? data.issues : []
      const message = issues[0]?.message ?? data.error ?? 'The API request failed.'
      throw {
        code: response.status === 504 ? 'timeout' : response.status === 400 ? 'invalid-config' : 'api-error',
        message,
        retryable: response.status !== 422,
        actions: ['Review the backend URL', 'Retry the request'],
      } satisfies ApiErrorState
    }

    return data as ChatResponse
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSeconds = Math.round(requestTimeoutMs / 1000)
      throw {
        code: 'timeout',
        message: `The request exceeded the configured ${timeoutSeconds}s limit. Check backend availability/latency or increase timeout in settings.`,
        retryable: true,
        actions: ['Retry the request', 'Check the backend status'],
      } satisfies ApiErrorState
    }

    if (error instanceof TypeError || (error as ApiErrorState)?.code === 'api-error') {
      const normalized = normalizeBaseUrl(baseUrl)
      throw {
        code: 'cors',
        message: `The browser cannot reach ${normalized}. Verify the API base URL and CORS policy.`,
        retryable: true,
        actions: ['Update the API base URL', 'Check CORS configuration'],
      } satisfies ApiErrorState
    }

    if (typeof error === 'object' && error && 'code' in error && 'message' in error) {
      throw error as ApiErrorState
    }

    throw {
      code: 'network',
      message: 'A connection problem occurred while sending the prompt.',
      retryable: true,
      actions: ['Retry the request', 'Check the network status'],
    } satisfies ApiErrorState
  } finally {
    window.clearTimeout(timeoutId)
  }
}
