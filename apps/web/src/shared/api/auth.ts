import { loadTokens } from '@/shared/lib/authStorage'

export type TokenPairResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  access_expires_at: string
  refresh_expires_at: string
}

export type RegisterPayload = {
  email: string
  password: string
  full_name?: string
}

export type LoginPayload = {
  email: string
  password: string
}

export type CurrentUser = {
  id: number
  email: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  department_id?: number | null
  role?: string | null
  is_active: boolean
  created_at?: string | null
  roles: string[]
  permissions: string[]
}

const AUTH_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestJson<T>(path: string, payload: unknown) {
  const response = await fetch(`${AUTH_BASE}/auth${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    let detail = 'Ошибка запроса'
    try {
      const data = await response.json()
      if (data && typeof data.detail === 'string') {
        detail = data.detail
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  return (await response.json()) as T
}

async function requestAuth<T>(path: string, init?: RequestInit) {
  const token = loadTokens()?.accessToken
  if (!token) {
    throw new Error('access_token_missing')
  }

  const response = await fetch(`${AUTH_BASE}/auth${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    let detail = 'Ошибка запроса'
    try {
      const data = await response.json()
      if (data && typeof data.detail === 'string') {
        detail = data.detail
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  return (await response.json()) as T
}

export function registerUser(payload: RegisterPayload) {
  return requestJson<unknown>('/register', payload)
}

export function loginUser(payload: LoginPayload) {
  return requestJson<TokenPairResponse>('/login', payload)
}

export function getCurrentUser() {
  return requestAuth<CurrentUser>('/me')
}
