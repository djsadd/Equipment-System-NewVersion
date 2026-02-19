import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type NotificationType = 'system' | 'alert' | 'info' | 'task'

export type Notification = {
  id: number
  user_id: number
  type: NotificationType
  title: string
  message: string
  payload?: Record<string, unknown> | null
  source_service?: string | null
  source_event?: string | null
  created_at?: string | null
  read_at?: string | null
  archived_at?: string | null
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestNotifications<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${API_BASE}/notifications${path}`, init, 'required')

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

export function listNotifications(params?: {
  unread_only?: boolean
  type?: NotificationType
  limit?: number
  offset?: number
}) {
  const searchParams = new URLSearchParams()
  if (params?.unread_only) {
    searchParams.set('unread_only', 'true')
  }
  if (params?.type) {
    searchParams.set('type', params.type)
  }
  if (typeof params?.limit === 'number') {
    searchParams.set('limit', String(params.limit))
  }
  if (typeof params?.offset === 'number') {
    searchParams.set('offset', String(params.offset))
  }
  const query = searchParams.toString()
  return requestNotifications<Notification[]>(`/${query ? `?${query}` : ''}`)
}

export function getUnreadCount() {
  return requestNotifications<{ count: number }>('/unread-count')
}

export function markRead(ids: number[]) {
  return requestNotifications<{ updated: number }>('/mark-read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  })
}

export function markAllRead() {
  return requestNotifications<{ updated: number }>('/mark-all-read', { method: 'POST' })
}
