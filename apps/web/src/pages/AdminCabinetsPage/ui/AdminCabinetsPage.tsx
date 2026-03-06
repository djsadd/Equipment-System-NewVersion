import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import {
  createCabinetType,
  createCabinet,
  updateCabinet,
  listCabinets,
  listCabinetTypes,
  type Cabinet,
  type CabinetType,
} from '@/shared/api/cabinets'
import { listAdminUsers, type AdminUser } from '@/shared/api/admin'
import { getCurrentUser } from '@/shared/api/auth'
import { clearTokens } from '@/shared/lib/authStorage'

type CabinetAdminTab = 'cabinets' | 'types'

type ModalState =
  | { type: 'cabinet-view'; item: Cabinet }
  | { type: 'cabinet-create' }
  | { type: 'cabinet-edit'; item: Cabinet }
  | { type: 'type-view'; item: CabinetType }
  | { type: 'type-create' }
  | null

function getUserLabel(user: AdminUser) {
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

function getUserDisplayInfo(user: AdminUser) {
  const name = getUserLabel(user)
  if (name === user.email) {
    return user.email
  }
  return `${name} · ${user.email}`
}

function getUserMeta(user: AdminUser) {
  const department = user.department_id ? `Отдел ${user.department_id}` : 'Отдел не указан'
  return `${user.email} · ${department}`
}

export function AdminCabinetsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [activeTab, setActiveTab] = useState<CabinetAdminTab>('cabinets')
  const [cabinets, setCabinets] = useState<Cabinet[]>([])
  const [cabinetTypes, setCabinetTypes] = useState<CabinetType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [typeName, setTypeName] = useState('')
  const [typeStatus, setTypeStatus] = useState('Активен')
  const [cabinetName, setCabinetName] = useState('')
  const [cabinetType, setCabinetType] = useState('')
  const [cabinetResponsibleId, setCabinetResponsibleId] = useState('')
  const [responsibleSearch, setResponsibleSearch] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [cabinetStatus, setCabinetStatus] = useState('Активен')
  const [cabinetQuery, setCabinetQuery] = useState('')
  const [cabinetTypeFilter, setCabinetTypeFilter] = useState('')
  const [cabinetStatusFilter, setCabinetStatusFilter] = useState('')
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const loadData = () => {
    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([listCabinets(), listCabinetTypes()])
      .then(([roomsData, typesData]) => {
        if (!active) {
          return
        }
        setCabinets(roomsData)
        setCabinetTypes(typesData)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
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

  useEffect(() => loadData(), [])

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

  const filteredUsers = useMemo(() => {
    const query = responsibleSearch.trim().toLowerCase()
    const candidates = query
      ? users.filter((user) => {
          const label = getUserLabel(user).toLowerCase()
          const meta = getUserMeta(user).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : users
    return candidates.slice(0, 8)
  }, [users, responsibleSearch])

  const userById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]))
  }, [users])

  const cabinetTypeOptions = useMemo(() => {
    const values = new Set<string>()
    cabinetTypes.forEach((type) => {
      if (type.name) {
        values.add(type.name)
      }
    })
    cabinets.forEach((cabinet) => {
      if (cabinet.room_type) {
        values.add(cabinet.room_type)
      }
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'ru'))
  }, [cabinetTypes, cabinets])

  const filteredCabinets = useMemo(() => {
    const query = cabinetQuery.trim().toLowerCase()
    return cabinets.filter((cabinet) => {
      if (cabinetTypeFilter && cabinet.room_type !== cabinetTypeFilter) {
        return false
      }
      if (cabinetStatusFilter && (cabinet.status || '') !== cabinetStatusFilter) {
        return false
      }
      if (!query) {
        return true
      }
      const responsible =
        cabinet.responsible_id && userById.has(cabinet.responsible_id) ? userById.get(cabinet.responsible_id)! : null
      const parts = [
        cabinet.name ?? '',
        cabinet.room_type ?? '',
        cabinet.status ?? '',
        cabinet.responsible_id ? String(cabinet.responsible_id) : '',
        responsible ? getUserLabel(responsible) : '',
        responsible?.email ?? '',
      ]
      return parts.some((value) => value.toLowerCase().includes(query))
    })
  }, [cabinets, cabinetQuery, cabinetTypeFilter, cabinetStatusFilter, userById])

  const openCabinetEdit = (cabinet: Cabinet) => {
    setActionError(null)
    setCabinetName(cabinet.name ?? '')
    setCabinetType(cabinet.room_type ?? '')
    setCabinetResponsibleId(cabinet.responsible_id ? String(cabinet.responsible_id) : '')
    setResponsibleSearch(() => {
      const responsibleId = cabinet.responsible_id
      if (!responsibleId) {
        return ''
      }
      const user = userById.get(responsibleId)
      if (!user) {
        return `ID ${responsibleId}`
      }
      return getUserLabel(user)
    })
    setCabinetStatus(cabinet.status || 'Активен')
    setModal({ type: 'cabinet-edit', item: cabinet })
  }

  const handleTypeCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = typeName.trim()
    if (!name) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await createCabinetType({ name, status: typeStatus })
      const data = await listCabinetTypes()
      setCabinetTypes(data)
      setTypeName('')
      setTypeStatus('Активен')
      setModal(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать тип')
    } finally {
      setActionBusy(false)
    }
  }

  const handleCabinetCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = cabinetName.trim()
    const roomType = cabinetType.trim()
    if (!name || !roomType) {
      return
    }
    const responsibleIdRaw = cabinetResponsibleId.trim()
    const responsibleId = responsibleIdRaw ? Number(responsibleIdRaw) : null
    if (responsibleIdRaw && !Number.isFinite(responsibleId)) {
      setActionError('ID ответственного должен быть числом')
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await createCabinet({
        name,
        room_type: roomType,
        responsible_id: responsibleId,
        status: cabinetStatus,
      })
      const data = await listCabinets()
      setCabinets(data)
      setCabinetName('')
      setCabinetType('')
      setCabinetResponsibleId('')
      setCabinetStatus('Активен')
      setModal(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось создать кабинет')
    } finally {
      setActionBusy(false)
    }
  }

  const handleCabinetUpdate = async (roomId: number, event: React.FormEvent) => {
    event.preventDefault()
    const name = cabinetName.trim()
    const roomType = cabinetType.trim()
    if (!name || !roomType) {
      return
    }
    const responsibleIdRaw = cabinetResponsibleId.trim()
    const responsibleId = responsibleIdRaw ? Number(responsibleIdRaw) : null
    if (responsibleIdRaw && !Number.isFinite(responsibleId)) {
      setActionError('ID ответственного должен быть числом')
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await updateCabinet(roomId, {
        name,
        room_type: roomType,
        responsible_id: responsibleId,
        status: cabinetStatus,
      })
      const data = await listCabinets()
      setCabinets(data)
      setModal(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось обновить кабинет')
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

      <main className="dashboard__main dashboard__main--compact">
        <section className="cabinet-admin">
          <header className="cabinet-admin__header">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Кабинеты</span>
              </nav>
              <h1>Настройки кабинетов</h1>
              <p>Типы кабинетов, ответственные и параметры учета.</p>
            </div>
            <div className="cabinet-admin__actions">
              <button type="button" onClick={() => navigate('/cabinets')}>
                Перейти к списку
              </button>
              {activeTab === 'types' ? (
                <button
                  type="button"
                  className="is-primary"
                  onClick={() => {
                    setActionError(null)
                    setModal({ type: 'type-create' })
                  }}
                >
                  Добавить тип
                </button>
              ) : (
                <button
                  type="button"
                  className="is-primary"
                  onClick={() => {
                    setActionError(null)
                    setModal({ type: 'cabinet-create' })
                  }}
                >
                  Добавить кабинет
                </button>
              )}
            </div>
          </header>

          <section className="admin__tabs">
            <button
              type="button"
              className={activeTab === 'cabinets' ? 'is-active' : undefined}
              onClick={() => setActiveTab('cabinets')}
            >
              Кабинеты
            </button>
            <button
              type="button"
              className={activeTab === 'types' ? 'is-active' : undefined}
              onClick={() => setActiveTab('types')}
            >
              Типы кабинетов
            </button>
          </section>

          <section className="cabinet-admin__grid" key={`${activeTab}-grid`}>
            {activeTab === 'cabinets' && (
              <article className="cabinet-admin__card">
                <h2>Кабинеты</h2>
                <p>Поиск по названию кабинета, типу или ответственному. Фильтры применяются мгновенно.</p>

                <div className="cabinet-admin__toolbar" role="search" aria-label="Поиск и фильтры кабинетов">
                  <div className="cabinet-admin__filters">
                    <label className="cabinet-admin__filter cabinet-admin__filter--wide">
                      <span>Поиск</span>
                      <div className="cabinet-admin__search">
                        <span className="cabinet-admin__search-icon" aria-hidden="true" />
                        <input
                          value={cabinetQuery}
                          onChange={(event) => setCabinetQuery(event.target.value)}
                          placeholder="Кабинет, тип, ответственный..."
                        />
                        {cabinetQuery.trim() && (
                          <button
                            type="button"
                            className="cabinet-admin__search-clear"
                            aria-label="Очистить поиск"
                            onClick={() => setCabinetQuery('')}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </label>

                    <label className="cabinet-admin__filter cabinet-admin__filter--white">
                      <span>Тип</span>
                      <select value={cabinetTypeFilter} onChange={(event) => setCabinetTypeFilter(event.target.value)}>
                        <option value="">Все</option>
                        {cabinetTypeOptions.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="cabinet-admin__filter cabinet-admin__filter--white">
                      <span>Статус</span>
                      <select value={cabinetStatusFilter} onChange={(event) => setCabinetStatusFilter(event.target.value)}>
                        <option value="">Все</option>
                        <option value="Активен">Активен</option>
                        <option value="Неактивен">Неактивен</option>
                      </select>
                    </label>
                  </div>

                  <div className="cabinet-admin__toolbar-side">
                    <div className="cabinet-admin__summary">
                      Показано {filteredCabinets.length} из {cabinets.length}
                    </div>
                    <button
                      type="button"
                      className="cabinet-admin__reset"
                      disabled={!cabinetQuery.trim() && !cabinetTypeFilter && !cabinetStatusFilter}
                      onClick={() => {
                        setCabinetQuery('')
                        setCabinetTypeFilter('')
                        setCabinetStatusFilter('')
                      }}
                    >
                      Сбросить
                    </button>
                  </div>
                </div>

                <div className="cabinet-admin__table cabinet-admin__table--cabinets">
                  <div className="cabinet-admin__table-head">
                    <span>Кабинет</span>
                    <span>Тип кабинета</span>
                    <span>Ответственное лицо</span>
                    <span>Статус</span>
                  </div>
                  {isLoading && (
                    <div className="cabinet-admin__table-row">
                      <span>Загрузка...</span>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading && error && (
                    <div className="cabinet-admin__table-row">
                      <span>{error}</span>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading && !error && cabinets.length === 0 && (
                    <div className="cabinet-admin__table-row">
                      <span>Кабинеты не найдены</span>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading && !error && cabinets.length > 0 && filteredCabinets.length === 0 && (
                    <div className="cabinet-admin__table-row">
                      <span>Ничего не найдено. Попробуйте изменить фильтры.</span>
                      <span />
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading &&
                    !error &&
                    filteredCabinets.map((cabinet) => (
                      <div
                        className="cabinet-admin__table-row"
                        key={cabinet.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setModal({ type: 'cabinet-view', item: cabinet })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setModal({ type: 'cabinet-view', item: cabinet })
                          }
                        }}
                      >
                        <span>{cabinet.name}</span>
                        <span>{cabinet.room_type}</span>
                        <span>
                          {cabinet.responsible_id
                            ? userById.has(cabinet.responsible_id)
                              ? getUserDisplayInfo(userById.get(cabinet.responsible_id)!)
                              : `ID ${cabinet.responsible_id}`
                            : '—'}
                        </span>
                        <span>{cabinet.status || '—'}</span>
                      </div>
                    ))}
                </div>
              </article>
            )}
            {activeTab === 'types' && (
              <article className="cabinet-admin__card">
                <h2>Типы кабинетов</h2>
                <p>Настройка типов: учебный, лаборатория, административный.</p>
                <div className="cabinet-admin__table cabinet-admin__table--types">
                  <div className="cabinet-admin__table-head">
                    <span>Тип</span>
                    <span>Кол-во</span>
                    <span>Статус</span>
                  </div>
                  {isLoading && (
                    <div className="cabinet-admin__table-row">
                      <span>Загрузка...</span>
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading && error && (
                    <div className="cabinet-admin__table-row">
                      <span>{error}</span>
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading && !error && cabinetTypes.length === 0 && (
                    <div className="cabinet-admin__table-row">
                      <span>Типы не найдены</span>
                      <span />
                      <span />
                    </div>
                  )}
                  {!isLoading &&
                    !error &&
                    cabinetTypes.map((type) => (
                      <div
                        className="cabinet-admin__table-row"
                        key={type.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setModal({ type: 'type-view', item: type })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            setModal({ type: 'type-view', item: type })
                          }
                        }}
                      >
                        <span>{type.name}</span>
                        <span>{type.count ?? 0}</span>
                        <span>{type.status || '—'}</span>
                      </div>
                    ))}
                </div>
              </article>
            )}

          </section>
        </section>
      </main>

      {modal && (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="modal__close"
              onClick={() => setModal(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            {modal.type === 'cabinet-view' && (
              <>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.room_type}</p>
                <div className="room__modal-grid">
                  <span>Ответственный</span>
                  <strong>
                    {modal.item.responsible_id
                      ? userById.has(modal.item.responsible_id)
                        ? getUserDisplayInfo(userById.get(modal.item.responsible_id)!)
                        : `ID ${modal.item.responsible_id}`
                      : '—'}
                  </strong>
                  <span>Статус</span>
                  <strong>{modal.item.status || '—'}</strong>
                  <span>Инвентаризация</span>
                  <strong>{modal.item.last_inventory_at || '—'}</strong>
                  <span>Аудит</span>
                  <strong>{modal.item.last_audit_at || '—'}</strong>
                </div>
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)}>
                    Закрыть
                  </button>
                  <button type="button" className="is-primary" onClick={() => openCabinetEdit(modal.item)}>
                    Редактировать
                  </button>
                </div>
              </>
            )}
            {modal.type === 'cabinet-edit' && (
              <form className="admin__form" onSubmit={(event) => handleCabinetUpdate(modal.item.id, event)}>
                <h2>Редактировать кабинет</h2>
                <label>
                  Название
                  <input value={cabinetName} onChange={(event) => setCabinetName(event.target.value)} required />
                </label>
                <label>
                  Тип кабинета
                  {cabinetTypes.length > 0 ? (
                    <select value={cabinetType} onChange={(event) => setCabinetType(event.target.value)} required>
                      <option value="" disabled>
                        Выберите тип
                      </option>
                      {cabinetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input value={cabinetType} onChange={(event) => setCabinetType(event.target.value)} required />
                  )}
                </label>
                <label>
                  Ответственное лицо (ID)
                  {users.length > 0 ? (
                    <div className="inventory-user-picker">
                      <input
                        value={responsibleSearch}
                        onChange={(event) => {
                          setResponsibleSearch(event.target.value)
                          setCabinetResponsibleId('')
                        }}
                        onFocus={() => setShowUserList(true)}
                        onBlur={() => {
                          window.setTimeout(() => setShowUserList(false), 120)
                        }}
                        placeholder="ФИО, почта или отдел"
                      />
                      {usersLoading && <div className="inventory-user-picker__hint">Загрузка пользователей...</div>}
                      {!usersLoading && usersError && <div className="inventory-user-picker__error">{usersError}</div>}
                      {!usersLoading && !usersError && showUserList && filteredUsers.length > 0 && (
                        <div className="inventory-user-picker__list">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="inventory-user-picker__option"
                              onClick={() => {
                                setCabinetResponsibleId(String(user.id))
                                setResponsibleSearch(getUserLabel(user))
                                setShowUserList(false)
                              }}
                            >
                              <span className="inventory-user-picker__name">{getUserLabel(user)}</span>
                              <span className="inventory-user-picker__meta">{getUserMeta(user)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {cabinetResponsibleId && (
                        <div className="inventory-user-picker__value">Выбрано: ID {cabinetResponsibleId}</div>
                      )}
                    </div>
                  ) : (
                    <input
                      value={cabinetResponsibleId}
                      onChange={(event) => setCabinetResponsibleId(event.target.value)}
                      inputMode="numeric"
                      placeholder="Например, 12"
                    />
                  )}
                </label>
                <label>
                  Статус
                  <select value={cabinetStatus} onChange={(event) => setCabinetStatus(event.target.value)}>
                    <option value="Активен">Активен</option>
                    <option value="Неактивен">Неактивен</option>
                  </select>
                </label>
                {actionError && <p>{actionError}</p>}
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)} disabled={actionBusy}>
                    Отмена
                  </button>
                  <button type="submit" className="is-primary" disabled={actionBusy}>
                    Сохранить
                  </button>
                </div>
              </form>
            )}
            {modal.type === 'type-view' && (
              <>
                <h2>{modal.item.name}</h2>
                <p>Тип кабинета</p>
                <div className="room__modal-grid">
                  <span>ID</span>
                  <strong>{modal.item.id}</strong>
                  <span>Кол-во</span>
                  <strong>{modal.item.count ?? 0}</strong>
                  <span>Статус</span>
                  <strong>{modal.item.status || '—'}</strong>
                </div>
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)}>
                    Закрыть
                  </button>
                </div>
              </>
            )}
            {modal.type === 'type-create' && (
              <form className="admin__form" onSubmit={handleTypeCreate}>
                <h2>Создать тип кабинета</h2>
                <label>
                  Название
                  <input value={typeName} onChange={(event) => setTypeName(event.target.value)} required />
                </label>
                <label>
                  Статус
                  <select value={typeStatus} onChange={(event) => setTypeStatus(event.target.value)}>
                    <option value="Активен">Активен</option>
                    <option value="Неактивен">Неактивен</option>
                  </select>
                </label>
                {actionError && <p>{actionError}</p>}
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)} disabled={actionBusy}>
                    Отмена
                  </button>
                  <button type="submit" className="is-primary" disabled={actionBusy}>
                    Создать
                  </button>
                </div>
              </form>
            )}
            {modal.type === 'cabinet-create' && (
              <form className="admin__form" onSubmit={handleCabinetCreate}>
                <h2>Создать кабинет</h2>
                <label>
                  Название
                  <input
                    value={cabinetName}
                    onChange={(event) => setCabinetName(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Тип кабинета
                  {cabinetTypes.length > 0 ? (
                    <select value={cabinetType} onChange={(event) => setCabinetType(event.target.value)} required>
                      <option value="" disabled>
                        Выберите тип
                      </option>
                      {cabinetTypes.map((type) => (
                        <option key={type.id} value={type.name}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={cabinetType}
                      onChange={(event) => setCabinetType(event.target.value)}
                      required
                    />
                  )}
                </label>
                <label>
                  Ответственное лицо (ID)
                  {users.length > 0 ? (
                    <div className="inventory-user-picker">
                      <input
                        value={responsibleSearch}
                        onChange={(event) => {
                          setResponsibleSearch(event.target.value)
                          setCabinetResponsibleId('')
                        }}
                        onFocus={() => setShowUserList(true)}
                        onBlur={() => {
                          window.setTimeout(() => setShowUserList(false), 120)
                        }}
                        placeholder="ФИО, почта или отдел"
                      />
                      {usersLoading && (
                        <div className="inventory-user-picker__hint">Загрузка пользователей...</div>
                      )}
                      {!usersLoading && usersError && (
                        <div className="inventory-user-picker__error">{usersError}</div>
                      )}
                      {!usersLoading && !usersError && showUserList && filteredUsers.length > 0 && (
                        <div className="inventory-user-picker__list">
                          {filteredUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="inventory-user-picker__option"
                              onClick={() => {
                                setCabinetResponsibleId(String(user.id))
                                setResponsibleSearch(getUserLabel(user))
                                setShowUserList(false)
                              }}
                            >
                              <span className="inventory-user-picker__name">{getUserLabel(user)}</span>
                              <span className="inventory-user-picker__meta">{getUserMeta(user)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {cabinetResponsibleId && (
                        <div className="inventory-user-picker__value">
                          Выбрано: ID {cabinetResponsibleId}
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      value={cabinetResponsibleId}
                      onChange={(event) => setCabinetResponsibleId(event.target.value)}
                      inputMode="numeric"
                      placeholder="Например, 12"
                    />
                  )}
                </label>
                <label>
                  Статус
                  <select value={cabinetStatus} onChange={(event) => setCabinetStatus(event.target.value)}>
                    <option value="Активен">Активен</option>
                    <option value="Неактивен">Неактивен</option>
                  </select>
                </label>
                {actionError && <p>{actionError}</p>}
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)} disabled={actionBusy}>
                    Отмена
                  </button>
                  <button type="submit" className="is-primary" disabled={actionBusy}>
                    Создать
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
