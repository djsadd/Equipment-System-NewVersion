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
import { CabinetDetailPage } from '@/pages/CabinetDetailPage/ui/CabinetDetailPage'
import { ReportsPage } from '@/pages/ReportsPage/ui/ReportsPage'
import { MaintenancePage } from '@/pages/MaintenancePage/ui/MaintenancePage'
import { InventoryReportsPage } from '@/pages/InventoryReportsPage/ui/InventoryReportsPage'
import { InventoryReportDetailPage } from '@/pages/InventoryReportsPage/ui/InventoryReportDetailPage'
import { AdminCabinetsPage } from '@/pages/AdminCabinetsPage/ui/AdminCabinetsPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage/ui/AdminUsersPage'
import { AdminDepartmentsPage } from '@/pages/AdminDepartmentsPage/ui/AdminDepartmentsPage'
import { AdminDepartmentCreatePage } from '@/pages/AdminDepartmentCreatePage/ui/AdminDepartmentCreatePage'
import { AdminDepartmentDetailPage } from '@/pages/AdminDepartmentDetailPage/ui/AdminDepartmentDetailPage'
import { AdminInventoryPage } from '@/pages/AdminInventoryPage/ui/AdminInventoryPage'
import { AdminInventoryCreatePage } from '@/pages/AdminInventoryCreatePage/ui/AdminInventoryCreatePage'
import { AdminJournalPage } from '@/pages/AdminJournalPage/ui/AdminJournalPage'
import { AdminJournalDetailPage } from '@/pages/AdminJournalDetailPage/ui/AdminJournalDetailPage'
import { ErrorPage } from '@/pages/ErrorPage/ui/ErrorPage'
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
            <CabinetDetailPage />
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
        path="/admin/departments"
        element={
          <RequireAdmin>
            <AdminDepartmentsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/departments/create"
        element={
          <RequireAdmin>
            <AdminDepartmentCreatePage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/departments/:id"
        element={
          <RequireAdmin>
            <AdminDepartmentDetailPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/inventory"
        element={
          <RequireAdmin>
            <AdminInventoryPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/inventory/create"
        element={
          <RequireAdmin>
            <AdminInventoryCreatePage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/journal"
        element={
          <RequireAdmin>
            <AdminJournalPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/journal/:id"
        element={
          <RequireAdmin>
            <AdminJournalDetailPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/reports/inventory"
        element={
          <RequireAdmin>
            <InventoryReportsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/reports/inventory/:id"
        element={
          <RequireAdmin>
            <InventoryReportDetailPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/reports/:module"
        element={
          <RequireAdmin>
            <ReportsPage />
          </RequireAdmin>
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
      <Route path="/401" element={<ErrorPage status={401} />} />
      <Route path="/403" element={<ErrorPage status={403} />} />
      <Route path="/404" element={<ErrorPage status={404} />} />
      <Route path="/500" element={<ErrorPage status={500} />} />
      <Route path="*" element={<ErrorPage status={404} />} />
    </Routes>
  )
}
