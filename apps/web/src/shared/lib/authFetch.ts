import { clearTokens, loadTokens } from '@/shared/lib/authStorage'
import { getValidAccessToken, refreshTokens, shouldLogoutAfterUnauthorized } from '@/shared/lib/authSession'

type AuthMode = 'required' | 'optional' | 'none'

function withAuthHeader(init: RequestInit | undefined, token: string | null) {
  const headers = new Headers(init?.headers ?? {})
  headers.set('Accept', headers.get('Accept') ?? 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return { ...(init ?? {}), headers }
}

export async function fetchWithAuthRetry(url: string, init?: RequestInit, authMode: AuthMode = 'optional') {
  if (authMode === 'none') {
    return fetch(url, withAuthHeader(init, null))
  }

  const token = await getValidAccessToken()
  if (!token && authMode === 'required') {
    throw new Error('access_token_missing')
  }

  let response = await fetch(url, withAuthHeader(init, token))
  if (response.status !== 401) {
    return response
  }

  const existing = loadTokens()
  if (!existing?.refreshToken) {
    return response
  }

  const refreshed = await refreshTokens()
  if (!refreshed?.accessToken) {
    if (await shouldLogoutAfterUnauthorized(response.clone())) {
      clearTokens()
    }
    return response
  }

  response = await fetch(url, withAuthHeader(init, refreshed.accessToken))
  if (response.status === 401 && (await shouldLogoutAfterUnauthorized(response.clone()))) {
    clearTokens()
  }
  return response
}
