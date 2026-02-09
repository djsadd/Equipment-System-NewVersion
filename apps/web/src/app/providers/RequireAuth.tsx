import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hasValidAccessToken } from '@/shared/lib/authStorage'

type RequireAuthProps = {
  children: ReactElement
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()

  if (!hasValidAccessToken()) {
    return <Navigate to="/401" replace state={{ from: location.pathname }} />
  }

  return children
}
