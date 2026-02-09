import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  deleteDepartment,
  getDepartment,
  updateDepartment,
  type Department,
} from '@/shared/api/departments'
import { DepartmentForm, type DepartmentFormPayload } from '@/pages/AdminDepartmentsPage/ui/DepartmentForm'

export function AdminDepartmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const departmentId = Number(id)
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [department, setDepartment] = useState<Department | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    if (!Number.isFinite(departmentId)) {
      setError('Некорректный идентификатор')
      setIsLoading(false)
      return
    }
    getDepartment(departmentId)
      .then((data) => {
        if (!active) {
          return
        }
        setDepartment(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить департамент')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [departmentId])

  const handleSubmit = async (payload: DepartmentFormPayload) => {
    if (!department) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      const updated = await updateDepartment(department.id, payload)
      setDepartment(updated)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить департамент')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!department) {
      return
    }
    const confirmed = window.confirm('Удалить департамент без возможности восстановления?')
    if (!confirmed) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteDepartment(department.id)
      navigate('/admin/departments')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить департамент')
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="dashboard">
      <Sidebar
        lang={lang}
        onLangChange={(nextLang) => {
          localStorage.setItem('dashboard_lang', nextLang)
          setLang(nextLang)
          window.location.reload()
        }}
        reportsOpen={reportsOpen}
        onToggleReports={() => setReportsOpen((prev) => !prev)}
        copy={t}
        active="admin"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="admin">
          <header className="admin__header">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Департаменты / Карточка</span>
              </nav>
              <h1>{department?.name ?? 'Карточка департамента'}</h1>
              <p>Обновляйте данные департамента, меняйте статус и локацию.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/admin/departments')}>
                К списку
              </button>
              <button type="button" onClick={handleDelete} disabled={!department || actionBusy}>
                Удалить
              </button>
            </div>
          </header>

          <section className="admin__grid">
            <article className="admin__card">
              {isLoading ? (
                <p>Загрузка...</p>
              ) : null}
              {error ? <p>{error}</p> : null}
              {!isLoading && !error && department ? (
                <DepartmentForm
                  title="Данные департамента"
                  initial={{
                    name: department.name,
                    location_id: department.location_id ?? null,
                    status: department.status ?? 'Активен',
                  }}
                  onSubmit={handleSubmit}
                  busy={actionBusy}
                  error={actionError}
                  submitLabel="Сохранить изменения"
                />
              ) : null}
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
