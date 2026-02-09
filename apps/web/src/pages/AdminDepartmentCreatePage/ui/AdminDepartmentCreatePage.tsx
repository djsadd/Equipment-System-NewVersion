import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { createDepartment } from '@/shared/api/departments'
import { DepartmentForm, type DepartmentFormPayload } from '@/pages/AdminDepartmentsPage/ui/DepartmentForm'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'

export function AdminDepartmentCreatePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [locations, setLocations] = useState<Cabinet[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  useEffect(() => {
    let active = true
    setLocationsLoading(true)
    setLocationsError(null)
    listCabinets()
      .then((data) => {
        if (!active) {
          return
        }
        setLocations(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setLocationsError(err instanceof Error ? err.message : 'Не удалось загрузить локации')
      })
      .finally(() => {
        if (active) {
          setLocationsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (payload: DepartmentFormPayload) => {
    const name = payload.name.trim()
    if (!name) {
      setActionError('Название обязательно')
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await createDepartment({ ...payload, name })
      navigate('/admin/departments')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать департамент')
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
                <span>Администрирование / Департаменты / Создание</span>
              </nav>
              <h1>Новый департамент</h1>
              <p>Добавьте название отдела и привязку к локации.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/admin/departments')}>
                К списку
              </button>
            </div>
          </header>

          <section className="admin__grid">
            <article className="admin__card">
              <DepartmentForm
                title="Карточка департамента"
                onSubmit={handleSubmit}
                onCancel={() => navigate('/admin/departments')}
                busy={actionBusy}
                error={actionError}
                submitLabel="Создать"
                locations={locations}
                locationsLoading={locationsLoading}
                locationsError={locationsError}
              />
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
