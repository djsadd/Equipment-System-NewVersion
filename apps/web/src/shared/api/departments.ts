import { loadTokens } from '@/shared/lib/authStorage'

export type Department = {
  id: number
  name: string
  location_id?: number | null
  status?: string | null
  created_at?: string | null
  updated_at?: string | null
}

const DEPARTMENTS_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestDepartments<T>(path: string, init?: RequestInit) {
  const token = loadTokens()?.accessToken
  if (!token) {
    throw new Error('access_token_missing')
  }

  const response = await fetch(`${DEPARTMENTS_BASE}/departments${path}`, {
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

export function listDepartments() {
  return requestDepartments<Department[]>('')
}

export function getDepartment(departmentId: number) {
  return requestDepartments<Department>(`/${departmentId}`)
}

export function createDepartment(payload: {
  name: string
  location_id?: number | null
  status?: string | null
}) {
  return requestDepartments<Department>('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateDepartment(
  departmentId: number,
  payload: { name?: string | null; location_id?: number | null; status?: string | null }
) {
  return requestDepartments<Department>(`/${departmentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteDepartment(departmentId: number) {
  return requestDepartments<{ status: string }>(`/${departmentId}`, {
    method: 'DELETE',
  })
}
