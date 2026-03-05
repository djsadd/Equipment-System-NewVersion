import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type DocumentType = {
  code: string
  name: string
}

export type DocumentTemplate = {
  id: number
  type_code: string
  version: string
  effective_from?: string | null
  status: 'active' | 'archived' | string
  original_filename?: string | null
  created_at?: string | null
  archived_at?: string | null
}

export type GeneratedDocument = {
  id: number
  doc_number: string
  type_code: string
  template_id: number
  template_version: string
  generated_at: string
  generated_by_user_id: number
  status: string
  target_type: string
  target_id: number
  notes?: string | null
  room_id?: number | null
  room_name?: string | null
  responsible_user_id?: number | null
  responsible_user_name?: string | null
  to_room_id?: number | null
  to_room_name?: string | null
  to_responsible_user_id?: number | null
  to_responsible_user_name?: string | null
  equipment_name?: string | null
  inventory_number?: string | null
  equipment_count?: number | null
  equipment_ids?: number[] | null
  equipment_list_text?: string | null
  created_at?: string | null
  archived_at?: string | null
}

export type GeneratedDocumentsPage = {
  items: GeneratedDocument[]
  total: number
  limit: number
  offset: number
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestDocuments<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${API_BASE}/documents${path}`, init, 'required')

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

export function listDocumentTypes() {
  return requestDocuments<DocumentType[]>('/v1/document-types')
}

export function listDocumentTemplates(params?: { type_code?: string; include_archived?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.type_code) qs.set('type_code', params.type_code)
  if (params?.include_archived) qs.set('include_archived', 'true')
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return requestDocuments<DocumentTemplate[]>(`/v1/templates${suffix}`)
}

export async function uploadDocumentTemplate(payload: {
  type_code: string
  version: string
  effective_from?: string
  make_active?: boolean
  file: File
}) {
  const form = new FormData()
  form.set('type_code', payload.type_code)
  form.set('version', payload.version)
  if (payload.effective_from) form.set('effective_from', payload.effective_from)
  form.set('make_active', payload.make_active === false ? 'false' : 'true')
  form.set('file', payload.file)

  return requestDocuments<DocumentTemplate>('/v1/templates', { method: 'POST', body: form })
}

export function activateDocumentTemplate(templateId: number) {
  return requestDocuments<DocumentTemplate>(`/v1/templates/${templateId}/activate`, { method: 'POST' })
}

export function archiveDocumentTemplate(templateId: number) {
  return requestDocuments<DocumentTemplate>(`/v1/templates/${templateId}/archive`, { method: 'POST' })
}

export function listGeneratedDocuments(params?: {
  type_code?: string
  target_type?: string
  target_id?: number
  room_id?: number
  responsible_user_id?: number
  generated_from?: string
  generated_to?: string
  q?: string
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams()
  if (params?.type_code) qs.set('type_code', params.type_code)
  if (params?.target_type) qs.set('target_type', params.target_type)
  if (typeof params?.target_id === 'number') qs.set('target_id', String(params.target_id))
  if (typeof params?.room_id === 'number') qs.set('room_id', String(params.room_id))
  if (typeof params?.responsible_user_id === 'number') qs.set('responsible_user_id', String(params.responsible_user_id))
  if (params?.generated_from) qs.set('generated_from', params.generated_from)
  if (params?.generated_to) qs.set('generated_to', params.generated_to)
  if (params?.q) qs.set('q', params.q)
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return requestDocuments<GeneratedDocument[]>(`/v1/documents${suffix}`)
}

export function getGeneratedDocument(documentId: number) {
  return requestDocuments<GeneratedDocument>(`/v1/documents/${documentId}`)
}

export function listGeneratedDocumentsPage(params?: {
  type_code?: string
  equipment_id?: number
  room_id?: number
  responsible_user_id?: number
  generated_from?: string
  generated_to?: string
  limit?: number
  offset?: number
}) {
  const qs = new URLSearchParams()
  if (params?.type_code) qs.set('type_code', params.type_code)
  if (typeof params?.equipment_id === 'number') qs.set('equipment_id', String(params.equipment_id))
  if (typeof params?.room_id === 'number') qs.set('room_id', String(params.room_id))
  if (typeof params?.responsible_user_id === 'number') qs.set('responsible_user_id', String(params.responsible_user_id))
  if (params?.generated_from) qs.set('generated_from', params.generated_from)
  if (params?.generated_to) qs.set('generated_to', params.generated_to)
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  if (typeof params?.offset === 'number') qs.set('offset', String(params.offset))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return requestDocuments<GeneratedDocumentsPage>(`/v1/documents/page${suffix}`)
}

export function generateDocument(payload: {
  type_code: string
  target_type: 'equipment' | 'room'
  target_id: number
  to_room_id?: number
  to_responsible_id?: number
  notes?: string
  include_pdf?: boolean
}) {
  return requestDocuments<GeneratedDocument>('/v1/documents/admin/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      include_pdf: payload.include_pdf ?? true,
    }),
  })
}

export function generateDocumentBatch(payload: {
  type_code: string
  target_type: 'equipment' | 'room'
  target_ids: number[]
  to_room_id?: number
  to_responsible_id?: number
  notes?: string
  include_pdf?: boolean
}) {
  return requestDocuments<GeneratedDocument>('/v1/documents/admin/generate-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      include_pdf: payload.include_pdf ?? true,
    }),
  })
}

export async function downloadGeneratedDocumentFile(documentId: number, format: 'docx' | 'pdf') {
  const response = await fetchWithAuthRetry(
    `${API_BASE}/documents/v1/documents/${documentId}/file?format=${format}`,
    undefined,
    'required'
  )
  if (!response.ok) {
    let detail = 'Ошибка скачивания'
    try {
      const data = await response.json()
      if (data && typeof data.detail === 'string') detail = data.detail
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }
  return await response.blob()
}
