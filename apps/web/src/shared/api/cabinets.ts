import { loadTokens } from '@/shared/lib/authStorage'

export type Cabinet = {
  id: number
  name: string
  room_type: string
  responsible_id?: number | null
  status?: string | null
  last_inventory_at?: string | null
  last_audit_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type CabinetType = {
  id: number
  name: string
  status?: string | null
  count?: number
  created_at?: string | null
  updated_at?: string | null
}

const CABINETS_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestCabinets<T>(path: string, init?: RequestInit) {
  const token = loadTokens()?.accessToken
  if (!token) {
    throw new Error('access_token_missing')
  }

  const response = await fetch(`${CABINETS_BASE}/cabinets${path}`, {
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

export function listCabinets() {
  return requestCabinets<Cabinet[]>('/rooms')
}

export function listMyCabinets() {
  return requestCabinets<Cabinet[]>('/rooms/my')
}

export function getMyCabinet(roomId: number) {
  return requestCabinets<Cabinet>(`/rooms/my/${roomId}`)
}

export function createCabinet(payload: {
  name: string
  room_type: string
  responsible_id?: number | null
  status?: string | null
}) {
  return requestCabinets<Cabinet>('/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listCabinetTypes() {
  return requestCabinets<CabinetType[]>('/room-types')
}

export function createCabinetType(payload: { name: string; status?: string | null }) {
  return requestCabinets<CabinetType>('/room-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
