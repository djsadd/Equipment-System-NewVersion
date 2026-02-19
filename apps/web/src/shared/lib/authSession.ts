import { clearTokens, loadTokens, saveTokens, type StoredTokens } from '@/shared/lib/authStorage'

type RefreshResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  access_expires_at: string
  refresh_expires_at: string
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
const ACCESS_TOKEN_SKEW_MS = 30_000
const REFRESH_TOKEN_SKEW_MS = 30_000

let refreshInFlight: Promise<StoredTokens | null> | null = null

function isStillValid(expiresAt: string, skewMs: number) {
  const expires = new Date(expiresAt).getTime()
  if (!Number.isFinite(expires)) {
    return false
  }
  return Date.now() < expires - skewMs
}

async function parseErrorDetail(response: Response): Promise<string | null> {
  try {
    const data = (await response.json()) as unknown
    if (data && typeof data === 'object' && 'detail' in data && typeof (data as any).detail === 'string') {
      return (data as any).detail as string
    }
  } catch {
    // ignore parse errors
  }
  return null
}

export function hasValidRefreshTokenSync() {
  const tokens = loadTokens()
  if (!tokens) {
    return false
  }
  return isStillValid(tokens.refreshExpiresAt, REFRESH_TOKEN_SKEW_MS)
}

export function shouldRefreshAccessTokenSync() {
  const tokens = loadTokens()
  if (!tokens) {
    return false
  }
  return !isStillValid(tokens.accessExpiresAt, ACCESS_TOKEN_SKEW_MS)
}

export async function refreshTokens(): Promise<StoredTokens | null> {
  const tokens = loadTokens()
  if (!tokens?.refreshToken) {
    return null
  }
  if (!isStillValid(tokens.refreshExpiresAt, REFRESH_TOKEN_SKEW_MS)) {
    clearTokens()
    return null
  }

  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: tokens.refreshToken }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          clearTokens()
        }
        return null
      }

      const data = (await response.json()) as RefreshResponse
      const next: StoredTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        accessExpiresAt: data.access_expires_at,
        refreshExpiresAt: data.refresh_expires_at,
      }
      saveTokens(next)
      return next
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

export async function getValidAccessToken(): Promise<string | null> {
  const tokens = loadTokens()
  if (!tokens?.accessToken) {
    return null
  }

  if (isStillValid(tokens.accessExpiresAt, ACCESS_TOKEN_SKEW_MS)) {
    return tokens.accessToken
  }

  const refreshed = await refreshTokens()
  return refreshed?.accessToken ?? null
}

export async function ensureSession(): Promise<boolean> {
  const token = await getValidAccessToken()
  return Boolean(token)
}

export async function refreshTokensIfPossible(): Promise<boolean> {
  const existing = loadTokens()
  if (!existing?.refreshToken) {
    return false
  }
  const refreshed = await refreshTokens()
  return Boolean(refreshed?.accessToken)
}

export async function shouldLogoutAfterUnauthorized(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false
  }
  const detail = await parseErrorDetail(response)
  return detail === 'invalid_token' || detail === 'refresh_expired'
}

