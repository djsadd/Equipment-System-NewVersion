import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type InventoryType = {
  id: number
  name: string
  description?: string | null
  created_at?: string | null
}

export type Barcode = {
  id: number
  value?: string | null
  title?: string | null
  image_filename?: string | null
  zpl_barcode?: string | null
  created_at?: string | null
}

export type InventoryItem = {
  id: number
  title: string
  description?: string | null
  image?: string | null
  barcode_id?: number | null
  barcodes?: Barcode[]
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

export type InventoryBulkMoveResult = {
  moved_count: number
  moved_item_ids: number[]
  not_found_item_ids: number[]
}

const INVENTORY_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestInventory<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${INVENTORY_BASE}/inventory${path}`, init, 'optional')

  if (!response.ok) {
    let detail = 'Ошибка запроса'
    try {
      const data = await response.json()
      if (data && typeof data.detail === 'string') {
        detail = data.detail
      } else if (data && Array.isArray((data as { detail?: unknown }).detail)) {
        detail = formatFastApiValidationError((data as { detail: unknown[] }).detail)
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  return (await response.json()) as T
}

function formatFastApiValidationError(detail: unknown[]) {
  const parts: string[] = []
  for (const item of detail) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const typed = item as { loc?: unknown; msg?: unknown }
    const loc = Array.isArray(typed.loc) ? typed.loc : []
    const field = loc.filter((x) => typeof x === 'string').slice(1).join('.')
    const msg = typeof typed.msg === 'string' ? typed.msg : 'Validation error'
    parts.push(field ? `${field}: ${msg}` : msg)
  }
  return parts.length > 0 ? parts.join('; ') : 'Validation error'
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

export function getInventoryItem(itemId: number) {
  return requestInventory<InventoryItem>(`/items/${itemId}`)
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

export function bulkMoveInventoryItems(payload: {
  item_ids: number[]
  location_id: number
  responsible_id?: number | null
}) {
  return requestInventory<InventoryBulkMoveResult>('/items/bulk-move', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteInventoryItem(itemId: number) {
  return requestInventory<{ status: string }>(`/items/${itemId}`, {
    method: 'DELETE',
  })
}

export function getBarcode(barcodeId: number) {
  return requestInventory<Barcode>(`/barcodes/${barcodeId}`)
}

export function scanMyInventoryItem(payload: { barcode_value: string }) {
  return requestInventory<InventoryItem>('/items/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
