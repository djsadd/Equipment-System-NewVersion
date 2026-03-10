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

export type InventoryItemPageResponse = {
  items: InventoryItem[]
  total: number
  page: number
  page_size: number
}

export type InventoryImportItemData = {
  id?: number | null
  title?: string | null
  description?: string | null
  category?: string | null
  location?: string | null
  location_id?: number | null
  responsible_username?: string | null
  responsible_first_name?: string | null
  responsible_last_name?: string | null
  responsible_id?: number | null
  status?: string | null
  barcode_id?: number | null
  barcode_data_12?: string | null
}

export type InventoryImportPreviewRow = {
  row_number: number
  action: 'create' | 'skip_existing' | 'error'
  data: InventoryImportItemData
  errors: string[]
  warnings: string[]
}

export type InventoryImportPreviewResponse = {
  total_rows: number
  to_create_count: number
  skip_count: number
  error_count: number
  rows: InventoryImportPreviewRow[]
}

export type InventoryImportConfirmResponse = {
  created_count: number
  skipped_count: number
  error_count: number
  created_item_ids: number[]
  errors: Array<Record<string, unknown>>
}

export type InventoryImportStreamInit = {
  total_rows: number
  to_create_count: number
  skip_count: number
  error_count: number
}

export type InventoryImportStreamRow = {
  index: number
  total: number
  row_number: number
  result: 'created' | 'skipped' | 'error'
  item_id?: number
  title?: string | null
  detail?: string
  errors?: string[]
  status_code?: number
}

export type InventoryBulkMoveResult = {
  moved_count: number
  moved_item_ids: number[]
  not_found_item_ids: number[]
  generated_document_id?: number | null
  generated_document_number?: string | null
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

async function requestInventoryStream(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${INVENTORY_BASE}/inventory${path}`, init, 'optional')

  if (!response.ok) {
    let detail = 'РћС€РёР±РєР° Р·Р°РїСЂРѕСЃР°'
    try {
      const data = await response.json()
      if (data && typeof (data as { detail?: unknown }).detail === 'string') {
        detail = (data as { detail: string }).detail
      } else if (data && Array.isArray((data as { detail?: unknown }).detail)) {
        detail = formatFastApiValidationError((data as { detail: unknown[] }).detail)
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  const body = response.body
  if (!body) {
    throw new Error('stream_not_supported')
  }

  return body
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

export function listInventoryItemsPaged(params: {
  page: number
  page_size: number
  q?: string
  status?: string
  category?: string
  inventory_type_id?: number
  location_id?: number
  responsible_id?: number
}) {
  const search = new URLSearchParams()
  search.set('page', String(params.page))
  search.set('page_size', String(params.page_size))

  if (params.q) search.set('q', params.q)
  if (params.status) search.set('status', params.status)
  if (params.category) search.set('category', params.category)
  if (typeof params.inventory_type_id === 'number') search.set('inventory_type_id', String(params.inventory_type_id))
  if (typeof params.location_id === 'number') search.set('location_id', String(params.location_id))
  if (typeof params.responsible_id === 'number') search.set('responsible_id', String(params.responsible_id))

  return requestInventory<InventoryItemPageResponse>(`/items/search?${search.toString()}`)
}

export function listInventoryItemCategories() {
  return requestInventory<string[]>('/items/categories')
}

export function createInventoryItemCategory(payload: { name: string }) {
  return requestInventory<{ id: number; name: string; created_at?: string | null }>('/items/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
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
  generate_document?: boolean
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

export function previewInventoryImport(file: File) {
  const form = new FormData()
  form.append('file', file)
  return requestInventory<InventoryImportPreviewResponse>('/items/import/preview', {
    method: 'POST',
    body: form,
  })
}

export function confirmInventoryImport(
  file: File,
  options?: { create_missing_locations?: boolean; create_missing_users?: boolean }
) {
  const form = new FormData()
  form.append('file', file)

  const params = new URLSearchParams()
  if (typeof options?.create_missing_locations === 'boolean') {
    params.set('create_missing_locations', String(options.create_missing_locations))
  }
  if (typeof options?.create_missing_users === 'boolean') {
    params.set('create_missing_users', String(options.create_missing_users))
  }

  const query = params.toString()
  const path = query ? `/items/import/confirm?${query}` : '/items/import/confirm'

  return requestInventory<InventoryImportConfirmResponse>(path, {
    method: 'POST',
    body: form,
  })
}

export async function confirmInventoryImportStream(
  file: File,
  options: { create_missing_locations?: boolean; create_missing_users?: boolean } | undefined,
  handlers: {
    onInit?: (data: InventoryImportStreamInit) => void
    onRow?: (data: InventoryImportStreamRow) => void
  }
) {
  const form = new FormData()
  form.append('file', file)

  const params = new URLSearchParams()
  if (typeof options?.create_missing_locations === 'boolean') {
    params.set('create_missing_locations', String(options.create_missing_locations))
  }
  if (typeof options?.create_missing_users === 'boolean') {
    params.set('create_missing_users', String(options.create_missing_users))
  }

  const query = params.toString()
  const path = query ? `/items/import/confirm-stream?${query}` : '/items/import/confirm-stream'

  const stream = await requestInventoryStream(path, {
    method: 'POST',
    headers: { Accept: 'text/event-stream' },
    body: form,
  })
  const reader = stream.getReader()
  const decoder = new TextDecoder()

  let buffer = ''
  let donePayload: InventoryImportConfirmResponse | null = null

  const flush = (chunk: string) => {
    buffer += chunk
    while (true) {
      const sepIndex = buffer.indexOf('\n\n')
      if (sepIndex === -1) {
        return
      }
      const block = buffer.slice(0, sepIndex)
      buffer = buffer.slice(sepIndex + 2)

      const lines = block.split('\n').map((line) => line.trimEnd())
      let eventName: string | null = null
      let dataLine: string | null = null
      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventName = line.slice('event:'.length).trim()
        }
        if (line.startsWith('data:')) {
          dataLine = line.slice('data:'.length).trim()
        }
      }
      if (!eventName || !dataLine) {
        continue
      }

      try {
        const data = JSON.parse(dataLine) as unknown
        if (eventName === 'init' && data && typeof data === 'object') {
          handlers.onInit?.(data as InventoryImportStreamInit)
        }
        if (eventName === 'row' && data && typeof data === 'object') {
          handlers.onRow?.(data as InventoryImportStreamRow)
        }
        if (eventName === 'done' && data && typeof data === 'object') {
          donePayload = data as InventoryImportConfirmResponse
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    flush(decoder.decode(value, { stream: true }))
  }

  if (!donePayload) {
    throw new Error('import_stream_incomplete')
  }
  return donePayload
}
