/**
 * Thin fetch wrapper around the backend REST API.
 *
 * - API base URL from NEXT_PUBLIC_API_URL (see lib/env.ts).
 * - Stores the JWT access/refresh tokens in localStorage.
 * - Transparently refreshes an expired access token once per request.
 */

import { PUBLIC_API_URL } from "./env"

const API_URL = PUBLIC_API_URL

const ACCESS_KEY = "ielts_access_token"
const REFRESH_KEY = "ielts_refresh_token"

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ACCESS_KEY)
}
export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(REFRESH_KEY)
}
export function setTokens(access: string, refresh?: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ACCESS_KEY, access)
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh)
}
export function clearTokens(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ACCESS_KEY)
  window.localStorage.removeItem(REFRESH_KEY)
}

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  auth?: boolean
  /** internal: prevents infinite refresh loops */
  _retry?: boolean
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return false
    const data = await res.json()
    setTokens(data.accessToken, data.refreshToken)
    return true
  } catch {
    return false
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  { method = "GET", body, auth = true, _retry = false }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Attempt a single transparent refresh on 401.
  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch<T>(path, { method, body, auth, _retry: true })
    }
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText
    throw new ApiError(res.status, message, data?.details)
  }
  return data as T
}

export async function apiUpload<T = unknown>(
  path: string,
  form: FormData,
  auth = true,
  _retry = false,
): Promise<T> {
  const headers: Record<string, string> = {}
  if (auth) {
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers,
    body: form,
  })

  if (res.status === 401 && auth && !_retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return apiUpload<T>(path, form, auth, true)
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || res.statusText
    throw new ApiError(res.status, message, data?.details)
  }
  return data as T
}

export const api = {
  get: <T>(path: string, auth = true) => apiFetch<T>(path, { method: "GET", auth }),
  post: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "POST", body, auth }),
  patch: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "PATCH", body, auth }),
  del: <T>(path: string, body?: unknown, auth = true) =>
    apiFetch<T>(path, { method: "DELETE", body, auth }),
}

export { API_URL }
