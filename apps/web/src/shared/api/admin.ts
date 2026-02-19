import { fetchWithAuthRetry } from '@/shared/lib/authFetch'

export type AdminUser = {
  id: number
  email: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  department_id?: number | null
  role?: string | null
  is_active: boolean
  created_at?: string | null
  roles: string[]
  permissions: string[]
}

export type AdminRole = {
  id: number
  name: string
  description?: string | null
  permissions: { id: number; name: string; description?: string | null }[]
}

export type AdminPermission = {
  id: number
  name: string
  description?: string | null
}

const ADMIN_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function requestAdmin<T>(path: string, init?: RequestInit) {
  const response = await fetchWithAuthRetry(`${ADMIN_BASE}/auth/admin${path}`, init, 'required')

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

export function listAdminUsers() {
  return requestAdmin<AdminUser[]>('/users')
}

export function listAdminRoles() {
  return requestAdmin<AdminRole[]>('/roles')
}

export function listAdminPermissions() {
  return requestAdmin<AdminPermission[]>('/permissions')
}

export type AdminUserCreatePayload = {
  email: string
  password: string
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  department_id?: number | null
  role?: string | null
  is_active?: boolean
  role_ids?: number[]
}

export type AdminUserUpdatePayload = {
  email?: string | null
  password?: string | null
  full_name?: string | null
  first_name?: string | null
  last_name?: string | null
  department_id?: number | null
  role?: string | null
  is_active?: boolean | null
  role_ids?: number[] | null
}

type AdminRolePayload = {
  name: string
  description?: string | null
}

export function createAdminUser(payload: AdminUserCreatePayload) {
  return requestAdmin<AdminUser>('/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(userId: number, payload: AdminUserUpdatePayload) {
  return requestAdmin<AdminUser>(`/users/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(userId: number) {
  return requestAdmin<{ status: string }>(`/users/${userId}`, {
    method: 'DELETE',
  })
}

export function createAdminRole(payload: AdminRolePayload) {
  return requestAdmin<AdminRole>('/roles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateAdminRole(roleId: number, payload: AdminRolePayload) {
  return requestAdmin<AdminRole>(`/roles/${roleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteAdminRole(roleId: number) {
  return requestAdmin<{ status: string }>(`/roles/${roleId}`, {
    method: 'DELETE',
  })
}
