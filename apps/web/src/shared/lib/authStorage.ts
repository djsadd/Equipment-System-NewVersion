export type StoredTokens = {
  accessToken: string
  refreshToken: string
  tokenType: string
  accessExpiresAt: string
  refreshExpiresAt: string
}

const STORAGE_KEY = 'auth_tokens'

export function saveTokens(tokens: StoredTokens) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
}

export function loadTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as StoredTokens
  } catch {
    return null
  }
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEY)
}

export function hasValidAccessToken() {
  const tokens = loadTokens()
  if (!tokens) {
    return false
  }
  const expires = new Date(tokens.accessExpiresAt).getTime()
  if (!Number.isFinite(expires)) {
    return false
  }
  return Date.now() < expires
}

type JwtPayload = {
  roles?: unknown
  permissions?: unknown
  sub?: string
  exp?: number
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) {
    return null
  }
  const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padded = raw.padEnd(Math.ceil(raw.length / 4) * 4, '=')
  try {
    const json = atob(padded)
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

export function getAccessTokenRoles(): string[] {
  const tokens = loadTokens()
  if (!tokens) {
    return []
  }
  const payload = decodeJwtPayload(tokens.accessToken)
  if (!payload || !Array.isArray(payload.roles)) {
    return []
  }
  return payload.roles.filter((role) => typeof role === 'string') as string[]
}

export function hasSystemAdminRole(roleName = 'system_admin') {
  const roles = getAccessTokenRoles()
  return roles.includes(roleName)
}
