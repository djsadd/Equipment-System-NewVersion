import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type AuditPlanStatus = 'draft' | 'scheduled' | 'active' | 'closed' | 'canceled'
export type AuditScopeType = 'location' | 'department' | 'custom'

export type AuditSessionStatus =
  | 'draft'
  | 'in_progress'
  | 'reconciling'
  | 'awaiting_approval'
  | 'approved'
  | 'applied'
  | 'closed'
  | 'canceled'

export type DiscrepancyType =
  | 'missing'
  | 'misplaced'
  | 'unexpected'
  | 'duplicate'
  | 'unknown_barcode'

export type ResolutionStatus = 'open' | 'resolved' | 'ignored'

export type AuditActionType = 'move' | 'assign_responsible' | 'clear_responsible'
export type AuditActionStatus = 'pending' | 'sent' | 'done' | 'failed'

export type AuditItemResultStatus = 'missing' | 'found' | 'found_in_place'

export type AuditPlan = {
  id: number
  title: string
  scope_type: AuditScopeType
  scope_payload: Record<string, unknown>
  start_date?: string | null
  end_date?: string | null
  status: AuditPlanStatus
  created_by: number
  created_at?: string | null
  updated_at?: string | null
}

export type AuditSession = {
  id: number
  plan_id?: number | null
  location_id: number
  status: AuditSessionStatus
  started_by?: number | null
  started_at?: string | null
  closed_by?: number | null
  closed_at?: string | null
  approved_by?: number | null
  approved_at?: string | null
  applied_at?: string | null
  expected_snapshot_version?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AuditExpectedItem = {
  id: number
  session_id: number
  item_id: number
  expected_location_id?: number | null
  expected_responsible_id?: number | null
  barcode_id?: number | null
  captured_at?: string | null
}

export type AuditScan = {
  id: number
  session_id: number
  scanner_user_id: number
  scan_time?: string | null
  barcode_value?: string | null
  item_id?: number | null
  found_location_id: number
  notes?: string | null
  photo_url?: string | null
  client_scan_id: string
  extra?: Record<string, unknown> | null
}

export type AuditDiscrepancy = {
  id: number
  session_id: number
  type: DiscrepancyType
  item_id?: number | null
  barcode_value?: string | null
  expected_location_id?: number | null
  found_location_id?: number | null
  resolution_status: ResolutionStatus
  resolution_payload?: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

export type AuditAction = {
  id: number
  session_id: number
  action_type: AuditActionType
  payload: Record<string, unknown>
  status: AuditActionStatus
  idempotency_key: string
  last_error?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AuditItemResult = {
  id: number
  session_id: number
  item_id: number
  status: AuditItemResultStatus
  expected_location_id?: number | null
  found_location_id?: number | null
  first_found_at?: string | null
  last_scan_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type AuditReportDiscrepancyTotals = {
  total: number
  open: number
  resolved: number
  ignored: number
}

export type AuditReportSessionRow = {
  session_id: number
  location_id: number
  status: AuditSessionStatus

  started_at?: string | null
  closed_at?: string | null
  approved_at?: string | null
  applied_at?: string | null
  updated_at?: string | null

  expected_total: number
  scan_count: number

  found_total: number
  found_in_place: number
  found_wrong_location: number
  missing: number

  found_rate: number
  in_place_rate: number

  unexpected: number
  duplicate: number
  unknown_barcode: number

  discrepancies: AuditReportDiscrepancyTotals
}

export type AuditReportPlanSummary = {
  plan_id: number
  generated_at: string

  rooms_total: number
  rooms_done: number

  expected_total: number
  scan_count: number

  found_total: number
  found_in_place: number
  found_wrong_location: number
  missing: number

  found_rate: number
  in_place_rate: number

  unexpected: number
  duplicate: number
  unknown_barcode: number

  discrepancies: AuditReportDiscrepancyTotals

  sessions: AuditReportSessionRow[]
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestAudit<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${API_BASE}/audit${path}`, init, 'required')

  if (!response.ok) {
    let detail = '\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u043F\u0440\u043E\u0441\u0430'
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

export function listAuditPlans(params?: { limit?: number; offset?: number }) {
  const searchParams = new URLSearchParams()
  if (typeof params?.limit === 'number') {
    searchParams.set('limit', String(params.limit))
  }
  if (typeof params?.offset === 'number') {
    searchParams.set('offset', String(params.offset))
  }
  const query = searchParams.toString()
  return requestAudit<AuditPlan[]>(`/plans${query ? `?${query}` : ''}`)
}

export function createAuditPlan(payload: {
  title: string
  scope_type: AuditScopeType
  scope_payload: Record<string, unknown>
  start_date?: string | null
  end_date?: string | null
}) {
  return requestAudit<AuditPlan>('/plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listAuditSessions(params?: {
  location_id?: number
  plan_id?: number
  status?: AuditSessionStatus
  limit?: number
  offset?: number
}) {
  const MAX_LIMIT = 500
  const searchParams = new URLSearchParams()
  if (typeof params?.location_id === 'number') {
    searchParams.set('location_id', String(params.location_id))
  }
  if (typeof params?.plan_id === 'number') {
    searchParams.set('plan_id', String(params.plan_id))
  }
  if (typeof params?.status === 'string') {
    searchParams.set('status', params.status)
  }
  if (typeof params?.limit === 'number') {
    searchParams.set('limit', String(Math.min(MAX_LIMIT, params.limit)))
  }
  if (typeof params?.offset === 'number') {
    searchParams.set('offset', String(params.offset))
  }
  const query = searchParams.toString()
  return requestAudit<AuditSession[]>(`/sessions${query ? `?${query}` : ''}`)
}

export function createAuditSession(payload: { plan_id?: number | null; location_id: number }) {
  return requestAudit<AuditSession>('/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function startAuditSession(sessionId: number) {
  return requestAudit<AuditSession>(`/sessions/${sessionId}/start`, { method: 'POST' })
}

export function closeAuditSession(sessionId: number) {
  return requestAudit<AuditSession>(`/sessions/${sessionId}/close`, { method: 'POST' })
}

export function approveAuditSession(sessionId: number) {
  return requestAudit<AuditSession>(`/sessions/${sessionId}/approve`, { method: 'POST' })
}

export function buildAuditActions(sessionId: number) {
  return requestAudit<AuditAction[]>(`/sessions/${sessionId}/build-actions`, { method: 'POST' })
}

export function applyAuditSession(sessionId: number) {
  return requestAudit<AuditSession>(`/sessions/${sessionId}/apply`, { method: 'POST' })
}

export function listAuditExpected(sessionId: number) {
  return requestAudit<AuditExpectedItem[]>(`/sessions/${sessionId}/expected`)
}

export function listAuditDiscrepancies(sessionId: number) {
  return requestAudit<AuditDiscrepancy[]>(`/sessions/${sessionId}/discrepancies`)
}

export function listAuditItemResults(sessionId: number) {
  return requestAudit<AuditItemResult[]>(`/sessions/${sessionId}/results`)
}

export function resolveAuditDiscrepancy(
  discrepancyId: number,
  payload: { resolution_status: ResolutionStatus; resolution_payload?: Record<string, unknown> | null }
) {
  return requestAudit<AuditDiscrepancy>(`/discrepancies/${discrepancyId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function listAuditActions(sessionId: number) {
  return requestAudit<AuditAction[]>(`/sessions/${sessionId}/actions`)
}

export function getAuditPlanReport(planId: number) {
  return requestAudit<AuditReportPlanSummary>(`/reports/plans/${planId}`)
}

export function createAuditScan(
  sessionId: number,
  payload: {
    barcode_value?: string | null
    item_id?: number | null
    found_location_id: number
    notes?: string | null
    photo_url?: string | null
    client_scan_id: string
    extra?: Record<string, unknown> | null
  }
) {
  return requestAudit<AuditScan>(`/sessions/${sessionId}/scans`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
