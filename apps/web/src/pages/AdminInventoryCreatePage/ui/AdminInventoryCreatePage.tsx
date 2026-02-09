import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listAdminUsers, type AdminUser } from '@/shared/api/admin'
import { getCurrentUser } from '@/shared/api/auth'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import { createInventoryItem, listInventoryTypes, type InventoryType } from '@/shared/api/inventory'
import { InventoryItemForm, type InventoryItemFormPayload } from '@/pages/AdminInventoryPage/ui/InventoryItemForm'

export function AdminInventoryCreatePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [types, setTypes] = useState<InventoryType[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [locations, setLocations] = useState<Cabinet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
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

    listInventoryTypes()
      .then((data) => {
        if (!active) {
          return
        }
        setTypes(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить типы')
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
    const loadUsers = async () => {
      setUsersLoading(true)
      setUsersError(null)
      try {
        const currentUser = await getCurrentUser()
        if (!active) {
          return
        }
        if (!currentUser.roles?.includes('system_admin')) {
          setUsersError('Недостаточно прав для получения списка пользователей')
          return
        }
        const data = await listAdminUsers()
        if (!active) {
          return
        }
        setUsers(data)
      } catch (err) {
        if (!active) {
          return
        }
        setUsersError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей')
      } finally {
        if (active) {
          setUsersLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadLocations = async () => {
      setLocationsLoading(true)
      setLocationsError(null)
      try {
        const data = await listCabinets()
        if (!active) {
          return
        }
        setLocations(data)
      } catch (err) {
        if (!active) {
          return
        }
        setLocationsError(err instanceof Error ? err.message : 'Не удалось загрузить кабинеты')
      } finally {
        if (active) {
          setLocationsLoading(false)
        }
      }
    }

    loadLocations()

    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (payload: InventoryItemFormPayload) => {
    const title = payload.title?.trim()
    if (!title) {
      setActionError('Название обязательно')
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await createInventoryItem({ ...payload, title })
      navigate('/admin/inventory')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать инвентарь')
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
        <section className="inventory-create">
          <header className="inventory-create__header">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Инвентарь / Создание</span>
              </nav>
              <h1>Новый объект инвентаря</h1>
              <p>Заполните карточку, чтобы инвентарь сразу появился в списке учета.</p>
            </div>
            <div className="inventory-create__actions">
              <button type="button" onClick={() => navigate('/admin/inventory')}>
                К списку
              </button>
            </div>
          </header>

          <div className="inventory-create__layout">
            <aside className="inventory-create__hero">
              <div className="inventory-create__hero-card">
                <div className="inventory-create__hero-top">
                  <span className="inventory-create__badge">Новая запись</span>
                  <span className="inventory-create__meta">Шаг 1 из 1</span>
                </div>
                <h2>Соберите карточку оборудования</h2>
                <p>
                  Добавьте название, категорию и тип, чтобы инвентарю было проще найти свое место в
                  отчетах.
                </p>
                <div className="inventory-create__stats">
                  <div>
                    <span className="inventory-create__stat-value">{types.length}</span>
                    <span className="inventory-create__stat-label">Типов доступно</span>
                  </div>
                  <div>
                    <span className="inventory-create__stat-value">
                      {types.length > 0 ? 'Да' : 'Нет'}
                    </span>
                    <span className="inventory-create__stat-label">Категоризация готова</span>
                  </div>
                </div>
                <div className="inventory-create__chips">
                  {types.slice(0, 3).map((type) => (
                    <span key={type.id}>{type.name}</span>
                  ))}
                  {types.length === 0 && <span>Типы пока не созданы</span>}
                </div>
              </div>
              <div className="inventory-create__hero-note">
                <strong>Совет:</strong> если нужно больше типов, сначала создайте их в разделе
                «Типы инвентаря».
              </div>
            </aside>

            <section className="inventory-create__form-card">
              {isLoading && <p className="inventory-create__loading">Загружаем справочник типов...</p>}
              {!isLoading && error && <p className="inventory-create__error">{error}</p>}
              {!isLoading && !error && (
                <InventoryItemForm
                  types={types}
                  users={users}
                  usersLoading={usersLoading}
                  usersError={usersError}
                  locations={locations}
                  locationsLoading={locationsLoading}
                  locationsError={locationsError}
                  heading="Детали объекта"
                  className="inventory-create__form"
                  onCancel={() => navigate('/admin/inventory')}
                  onSubmit={handleSubmit}
                  busy={actionBusy}
                  error={actionError}
                />
              )}
            </section>
          </div>
        </section>
      </main>
    </div>
  )
}
