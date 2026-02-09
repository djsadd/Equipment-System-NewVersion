import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listDepartments, type Department } from '@/shared/api/departments'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'

export function AdminDepartmentsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    setIsLoading(true)
    setError(null)
    listDepartments()
      .then((data) => {
        if (!active) {
          return
        }
        if (!Array.isArray(data)) {
          throw new Error('Некорректный ответ сервиса департаментов')
        }
        setDepartments(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить департаменты')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

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

  const totalDepartments = departments.length
  const activeDepartments = departments.filter((item) => item.status === 'Активен').length
  const locationsById = useMemo(() => {
    return new Map(locations.map((item) => [item.id, item]))
  }, [locations])

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
                <span>Администрирование / Департаменты</span>
              </nav>
              <h1>Справочник департаментов</h1>
              <p>Создавайте отделы, привязывайте их к локациям и следите за статусами.</p>
            </div>
            <div className="admin__actions">
              <button type="button" className="is-primary" onClick={() => navigate('/admin/departments/create')}>
                Добавить департамент
              </button>
            </div>
          </header>

          <section className="admin__summary">
            <div>
              <div className="admin__summary-value">{totalDepartments}</div>
              <div className="admin__summary-label">Всего департаментов</div>
            </div>
            <div>
              <div className="admin__summary-value">{activeDepartments}</div>
              <div className="admin__summary-label">Активные</div>
            </div>
            <div>
              <div className="admin__summary-value">{totalDepartments - activeDepartments}</div>
              <div className="admin__summary-label">Неактивные</div>
            </div>
          </section>

          <section className="admin__grid">
            <article className="admin__card">
              <div className="admin__table-head">
                <span>Департамент</span>
                <span>Локация</span>
                <span>Статус</span>
                <span>Действия</span>
              </div>
              <div className="admin__table">
                {isLoading ? (
                  <div className="admin__row">
                    <div className="admin__row-info">
                      <div className="admin__row-title">Загрузка...</div>
                    </div>
                  </div>
                ) : null}
                {error ? (
                  <div className="admin__row">
                    <div className="admin__row-info">
                      <div className="admin__row-title">{error}</div>
                    </div>
                  </div>
                ) : null}
                {!isLoading && !error && departments.length === 0 ? (
                  <div className="admin__row">
                    <div className="admin__row-info">
                      <div className="admin__row-title">Департаменты пока не созданы</div>
                      <div className="admin__row-sub">Нажмите «Добавить департамент»</div>
                    </div>
                  </div>
                ) : null}
                {!isLoading && !error
                  ? departments.map((department) => (
                      <div className="admin__row" key={department.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{department.name}</div>
                          <div className="admin__row-sub">ID: {department.id}</div>
                        </div>
                        <div className="admin__row-info">
                          <div className="admin__row-title">
                            {department.location_id
                              ? locationsById.get(department.location_id)?.name ??
                                `Локация #${department.location_id}`
                              : 'Не указана'}
                          </div>
                          {locationsLoading ? (
                            <div className="admin__row-sub">Загрузка локаций...</div>
                          ) : null}
                          {locationsError ? (
                            <div className="admin__row-sub">{locationsError}</div>
                          ) : null}
                        </div>
                        <div className="admin__row-info">
                          <span className="admin__status">{department.status ?? '—'}</span>
                        </div>
                        <div className="admin__row-actions">
                          <button type="button" onClick={() => navigate(`/admin/departments/${department.id}`)}>
                            Открыть
                          </button>
                        </div>
                      </div>
                    ))
                  : null}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
