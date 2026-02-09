import { loadTokens } from '@/shared/lib/authStorage'

export type InventoryType = {
  id: number
  name: string
  description?: string | null
  created_at?: string | null
}

export type InventoryItem = {
  id: number
  title: string
  description?: string | null
  image?: string | null
  barcode_id?: number | null
  location_id?: number | null
  responsible_id?: number | null
  status?: string | null
  category?: string | null
  last_inventory_at?: string | null
  last_audit_at?: string | null
  inventory_type_id?: number | null
  created_at?: string | null
  updated_at?: string | null
}

const INVENTORY_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestInventory<T>(path: string, init?: RequestInit) {
  const token = loadTokens()?.accessToken

  const response = await fetch(`${INVENTORY_BASE}/inventory${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export function listInventoryTypes() {
  return requestInventory<InventoryType[]>('/types')
}

export function createInventoryType(payload: { name: string; description?: string | null }) {
  return requestInventory<InventoryType>('/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateInventoryType(
  typeId: number,
  payload: { name?: string | null; description?: string | null }
) {
  return requestInventory<InventoryType>(`/types/${typeId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteInventoryType(typeId: number) {
  return requestInventory<{ status: string }>(`/types/${typeId}`, {
    method: 'DELETE',
  })
}

export function listInventoryItems() {
  return requestInventory<InventoryItem[]>('/items')
}

export function listMyInventoryItems() {
  return requestInventory<InventoryItem[]>('/items/my')
}

export function listInventoryItemsByRoom(roomId: number) {
  return requestInventory<InventoryItem[]>(`/items/room/${roomId}`)
}

export function createInventoryItem(payload: {
  title: string
  description?: string | null
  image?: string | null
  barcode_id?: number | null
  location_id?: number | null
  responsible_id?: number | null
  status?: string | null
  category?: string | null
  last_inventory_at?: string | null
  last_audit_at?: string | null
  inventory_type_id?: number | null
}) {
  return requestInventory<InventoryItem>('/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateInventoryItem(
  itemId: number,
  payload: {
    title?: string | null
    description?: string | null
    image?: string | null
    barcode_id?: number | null
    location_id?: number | null
    responsible_id?: number | null
    status?: string | null
    category?: string | null
    last_inventory_at?: string | null
    last_audit_at?: string | null
    inventory_type_id?: number | null
  }
) {
  return requestInventory<InventoryItem>(`/items/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteInventoryItem(itemId: number) {
  return requestInventory<{ status: string }>(`/items/${itemId}`, {
    method: 'DELETE',
  })
}
