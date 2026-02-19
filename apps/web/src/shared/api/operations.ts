import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type InventoryEvent = {
  id: number
  item_id: number
  event_type: string
  actor_user_id?: number | null
  from_location_id?: number | null
  to_location_id?: number | null
  from_responsible_id?: number | null
  to_responsible_id?: number | null
  metadata?: Record<string, unknown> | null
  created_at?: string | null
}

type InventoryEventPayload = {
  item_id: number
  event_type: string
  from_location_id?: number | null
  to_location_id?: number | null
  from_responsible_id?: number | null
  to_responsible_id?: number | null
  metadata?: Record<string, unknown> | null
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestOperations<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${API_BASE}/operations${path}`, init, 'optional')

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

export function createInventoryEvent(payload: InventoryEventPayload) {
  return requestOperations('/inventory/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listInventoryEvents(params?: {
  item_id?: number
  actor_user_id?: number
  event_type?: string
  limit?: number
  offset?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.item_id) {
    searchParams.set('item_id', String(params.item_id))
  }
  if (params?.actor_user_id) {
    searchParams.set('actor_user_id', String(params.actor_user_id))
  }
  if (params?.event_type) {
    searchParams.set('event_type', params.event_type)
  }
  if (typeof params?.limit === 'number') {
    searchParams.set('limit', String(params.limit))
  }
  if (typeof params?.offset === 'number') {
    searchParams.set('offset', String(params.offset))
  }
  const query = searchParams.toString()
  return requestOperations<InventoryEvent[]>(`/inventory/events${query ? `?${query}` : ''}`)
}

export function getInventoryEvent(eventId: number) {
  return requestOperations<InventoryEvent>(`/inventory/events/${eventId}`)
}
