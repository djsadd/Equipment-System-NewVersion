import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type PrintRequest = {
  zpl_data: string
  printer_host?: string | null
  printer_port?: string | null
  printer_name?: string | null
  printer_timeout?: number | null
  backend?: string | null
  verify_tcp?: boolean | null
  return_diagnostics?: boolean | null
}

export type PrintResponse = Record<string, unknown>

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
const PRINT_BASE =
  (import.meta.env.VITE_PRINT_SERVICE_BASE as string | undefined) ?? `${API_BASE}/operations`

async function requestPrint<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${PRINT_BASE}${path}`, init, 'optional')

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

export function printLabel(payload: PrintRequest) {
  return requestPrint<PrintResponse>('/print', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
