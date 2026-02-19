import { useEffect, useState, type ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { hasSystemAdminRole } from '@/shared/lib/authStorage'
import { ensureSession } from '@/shared/lib/authSession'

type RequireAdminProps = {
  children: ReactElement
}

export function RequireAdmin({ children }: RequireAdminProps) {
  const location = useLocation()
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    ensureSession()
      .then((ok) => {
        if (!active) {
          return
        }
        if (!ok) {
          setIsAllowed(false)
          return
        }
        setIsAllowed(true)
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

  if (!hasSystemAdminRole()) {
    return <Navigate to="/403" replace />
  }

  return children
}
