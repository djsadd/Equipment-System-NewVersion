import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hasSystemAdminRole, hasValidAccessToken } from '@/shared/lib/authStorage'

type RequireAdminProps = {
  children: ReactElement
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()

  if (!hasValidAccessToken()) {
    return <Navigate to="/401" replace state={{ from: location.pathname }} />
  }

  if (!hasSystemAdminRole()) {
    return <Navigate to="/403" replace />
  }

  return children
}
