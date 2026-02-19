import { useEffect, useState, type ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ensureSession } from '@/shared/lib/authSession'

type RequireAuthProps = {
  children: ReactElement
}

export function RequireAuth({ children }: RequireAuthProps) {
  const location = useLocation()
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    ensureSession()
      .then((ok) => {
        if (active) {
          setIsAllowed(ok)
        }
      })
      .catch(() => {
        if (active) {
          setIsAllowed(false)
        }
      })
    return () => {
      active = false
    }
  }, [])

  if (isAllowed === null) {
    return null
  }

  if (!isAllowed) {
    return <Navigate to="/401" replace state={{ from: location.pathname }} />
  }

  return children
}
