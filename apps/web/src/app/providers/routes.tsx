import { Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage/ui/HomePage'
import { DashboardPage } from '@/pages/DashboardPage/ui/DashboardPage'
import { InventoryPage } from '@/pages/InventoryPage/ui/InventoryPage'
import { RoomDetailPage } from '@/pages/RoomDetailPage/ui/RoomDetailPage'
import { AdminPage } from '@/pages/AdminPage/ui/AdminPage'
import { MyEquipmentPage } from '@/pages/MyEquipmentPage/ui/MyEquipmentPage'
import { IssueEquipmentPage } from '@/pages/IssueEquipmentPage/ui/IssueEquipmentPage'
import { ReturnEquipmentPage } from '@/pages/ReturnEquipmentPage/ui/ReturnEquipmentPage'
import { NotificationsPage } from '@/pages/NotificationsPage/ui/NotificationsPage'
import { CabinetsPage } from '@/pages/CabinetsPage/ui/CabinetsPage'
import { RoomAuditPage } from '@/pages/RoomAuditPage/ui/RoomAuditPage'
import { ReportsPage } from '@/pages/ReportsPage/ui/ReportsPage'
import { MaintenancePage } from '@/pages/MaintenancePage/ui/MaintenancePage'
import { InventoryReportsPage } from '@/pages/InventoryReportsPage/ui/InventoryReportsPage'
import { InventoryReportDetailPage } from '@/pages/InventoryReportsPage/ui/InventoryReportDetailPage'
import { AdminCabinetsPage } from '@/pages/AdminCabinetsPage/ui/AdminCabinetsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage/ui/AdminUsersPage'
import { RequireAdmin } from '@/app/providers/RequireAdmin'
import { RequireAuth } from '@/app/providers/RequireAuth'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/inventory"
        element={
          <RequireAuth>
            <InventoryPage />
          </RequireAuth>
        }
      />
      <Route
        path="/inventory/room/:id"
        element={
          <RequireAuth>
            <RoomDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/my-equipment"
        element={
          <RequireAuth>
            <MyEquipmentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/issue-equipment"
        element={
          <RequireAuth>
            <IssueEquipmentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/return-equipment"
        element={
          <RequireAuth>
            <ReturnEquipmentPage />
          </RequireAuth>
        }
      />
      <Route
        path="/notifications"
        element={
          <RequireAuth>
            <NotificationsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/cabinets"
        element={
          <RequireAuth>
            <CabinetsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/cabinets/room/:id"
        element={
          <RequireAuth>
            <RoomAuditPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin/cabinets"
        element={
          <RequireAdmin>
            <AdminCabinetsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AdminUsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/reports/inventory"
        element={
          <RequireAuth>
            <InventoryReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reports/inventory/:id"
        element={
          <RequireAuth>
            <InventoryReportDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/reports/:module"
        element={
          <RequireAuth>
            <ReportsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/maintenance"
        element={
          <RequireAuth>
            <MaintenancePage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}
