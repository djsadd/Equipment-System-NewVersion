import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  createDepartmentType,
  deleteDepartmentType,
  listDepartmentTypes,
  type DepartmentType,
} from '@/shared/api/departments'

export function AdminDepartmentTypesPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [types, setTypes] = useState<DepartmentType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('Активен')

  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const load = () => {
    let active = true
    setIsLoading(true)
    setError(null)
    listDepartmentTypes()
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
        setError(err instanceof Error ? err.message : 'Не удалось загрузить типы отделов')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })
    return () => {
      active = false
    }
  }

  useEffect(() => {
    return load()
  }, [])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await createDepartmentType({ name: trimmed, status })
      setName('')
      setStatus('Активен')
      await listDepartmentTypes().then(setTypes)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать тип')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDelete = async (type: DepartmentType) => {
    const confirmed = window.confirm(`Удалить тип «${type.name}»?`)
    if (!confirmed) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteDepartmentType(type.id)
      await listDepartmentTypes().then(setTypes)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить тип')
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
                <span>Администрирование / Департаменты / Типы</span>
              </nav>
              <h1>Типы отделов</h1>
              <p>Справочник типов, которые можно привязать к отделам.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/admin/departments')}>
                К отделам
              </button>
            </div>
          </header>

          <section className="admin__grid">
            <article className="admin__card">
              <form className="admin__form" onSubmit={handleCreate}>
                <h2>Новый тип</h2>
                <label>
                  Название
                  <input value={name} onChange={(event) => setName(event.target.value)} required />
                </label>
                <label>
                  Статус
                  <select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="Активен">Активен</option>
                    <option value="Приостановлен">Приостановлен</option>
                  </select>
                </label>
                {actionError ? <p className="admin__error">{actionError}</p> : null}
                <div className="admin__actions">
                  <button type="submit" className="is-primary" disabled={actionBusy}>
                    Создать
                  </button>
                </div>
              </form>
            </article>

            <article className="admin__card">
              <h2>Список типов</h2>
              {isLoading ? <p>Загрузка...</p> : null}
              {error ? <p className="admin__error">{error}</p> : null}
              {!isLoading && !error ? (
                <div>
                  <div className="admin__table-head">
                    <span>Тип</span>
                    <span>Статус</span>
                    <span>Используется</span>
                    <span>Действия</span>
                  </div>
                  <div className="admin__table">
                    {types.length === 0 ? (
                      <div className="admin__row">
                        <div className="admin__row-info">
                          <div className="admin__row-title">Типы пока не созданы</div>
                          <div className="admin__row-sub">Добавьте первый тип сверху</div>
                        </div>
                      </div>
                    ) : null}
                    {types.map((type) => (
                      <div className="admin__row" key={type.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{type.name}</div>
                          <div className="admin__row-sub">ID: {type.id}</div>
                        </div>
                        <div className="admin__row-info">
                          <span className="admin__status">{type.status ?? '—'}</span>
                        </div>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{type.count ?? 0}</div>
                        </div>
                        <div className="admin__row-actions">
                          <button type="button" onClick={() => handleDelete(type)} disabled={actionBusy}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}

