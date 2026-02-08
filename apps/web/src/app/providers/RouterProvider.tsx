import { BrowserRouter } from 'react-router-dom'
import { AppRoutes } from '@/app/providers/routes'

export function RouterProvider() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
