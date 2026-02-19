import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listInventoryEvents, type InventoryEvent } from '@/shared/api/operations'
import { listInventoryItems, type InventoryItem } from '@/shared/api/inventory'
import { listAdminUsers, type AdminUser } from '@/shared/api/admin'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.floor(parsed)
  if (rounded <= 0) return fallback
  return rounded
}

export function AdminJournalPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const [searchParams, setSearchParams] = useSearchParams()
  const itemIdFromQuery = searchParams.get('item_id')

  const [itemId, setItemId] = useState<string>(() => itemIdFromQuery ?? '')
  const [actorUserId, setActorUserId] = useState<string>(() => searchParams.get('actor_user_id') ?? '')
  const [eventType, setEventType] = useState<string>(() => searchParams.get('event_type') ?? '')
  const [limit, setLimit] = useState<number>(() => parsePositiveInt(searchParams.get('limit'), 50))
  const [itemSearch, setItemSearch] = useState<string>('')
  const [actorSearch, setActorSearch] = useState<string>('')
  const [showItemList, setShowItemList] = useState(false)
  const [showActorList, setShowActorList] = useState(false)

  const [events, setEvents] = useState<InventoryEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<Cabinet[]>([])

  const normalizeSearch = (value: string) => value.trim().toLowerCase()

  const parseLeadingId = (value: string) => {
    const match = /^\s*#?\s*(\d+)/.exec(value)
    if (!match) return null
    const parsed = Number(match[1])
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return String(Math.floor(parsed))
  }

  const resolveItemId = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const leading = parseLeadingId(trimmed)
    if (leading) return leading

    const needle = normalizeSearch(trimmed)
    const candidates = items.filter((it) => normalizeSearch(it.title) === needle)
    if (candidates.length === 1) return String(candidates[0].id)
    return ''
  }

  const resolveActorUserId = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    const leading = parseLeadingId(trimmed)
    if (leading) return leading

    const needle = normalizeSearch(trimmed)
    const candidates = users.filter((user) => {
      const label = normalizeSearch(getUserLabel(user))
      const email = normalizeSearch(user.email)
      return label === needle || email === needle
    })
    if (candidates.length === 1) return String(candidates[0].id)
    return ''
  }

  const syncQuery = (nextPage?: number) => {
    const next = new URLSearchParams()
    const resolvedItemId = itemId.trim() || resolveItemId(itemSearch) || (parseLeadingId(itemSearch) ?? '')
    const resolvedActorId = actorUserId.trim() || resolveActorUserId(actorSearch) || (parseLeadingId(actorSearch) ?? '')

    if (resolvedItemId) next.set('item_id', resolvedItemId)
    if (resolvedActorId) next.set('actor_user_id', resolvedActorId)
    if (eventType.trim()) next.set('event_type', eventType.trim())
    if (Number.isFinite(limit) && limit > 0) next.set('limit', String(limit))
    next.set('page', String(nextPage ?? 1))
    setSearchParams(next, { replace: true })
  }

  const load = () => {
    let active = true
    setIsLoading(true)
    setError(null)

    const appliedItemId = searchParams.get('item_id')
    const appliedActorUserId = searchParams.get('actor_user_id')
    const appliedEventType = searchParams.get('event_type')
    const appliedLimit = parsePositiveInt(searchParams.get('limit'), 50)
    const appliedPage = parsePositiveInt(searchParams.get('page'), 1)
    const offset = (appliedPage - 1) * appliedLimit

    const item = Number(appliedItemId)
    const actor = Number(appliedActorUserId)
    listInventoryEvents({
      item_id: Number.isFinite(item) && item > 0 ? item : undefined,
      actor_user_id: Number.isFinite(actor) && actor > 0 ? actor : undefined,
      event_type: appliedEventType?.trim() ? appliedEventType.trim() : undefined,
      limit: appliedLimit,
      offset,
    })
      .then((data) => {
        if (!active) return
        setEvents(data)
        setHasNextPage(data.length === appliedLimit)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }

  useEffect(() => load(), [searchParams.toString()])

  useEffect(() => {
    let active = true
    Promise.allSettled([listAdminUsers(), listInventoryItems(), listCabinets()]).then((results) => {
      if (!active) return
      const [usersRes, itemsRes, locationsRes] = results
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value)
      if (itemsRes.status === 'fulfilled') setItems(itemsRes.value)
      if (locationsRes.status === 'fulfilled') setLocations(locationsRes.value)
    })
    return () => {
      active = false
    }
  }, [])

  const appliedLimit = parsePositiveInt(searchParams.get('limit'), limit)
  const appliedPage = parsePositiveInt(searchParams.get('page'), 1)
  const appliedOffset = (appliedPage - 1) * appliedLimit
  const isEmpty = !isLoading && !error && events.length === 0

  const getUserLabel = (user: AdminUser) => {
    if (user.full_name) return user.full_name
    const parts = [user.first_name, user.last_name].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
    return user.email
  }

  const getUserMeta = (user: AdminUser) => {
    const parts = [user.email]
    if (user.department_id) parts.push(`dep #${user.department_id}`)
    if (user.role) parts.push(user.role)
    return parts.filter(Boolean).join(' · ')
  }

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const locationsById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )

  useEffect(() => {
    const nextItemId = searchParams.get('item_id') ?? ''
    const nextActorId = searchParams.get('actor_user_id') ?? ''
    const nextEventType = searchParams.get('event_type') ?? ''
    const nextLimit = parsePositiveInt(searchParams.get('limit'), 50)

    setItemId(nextItemId)
    setActorUserId(nextActorId)
    setEventType(nextEventType)
    setLimit(nextLimit)

    if (nextItemId) {
      const item = itemsById.get(Number(nextItemId))
      setItemSearch(item ? `${item.title} (#${item.id})` : `#${nextItemId}`)
    } else {
      setItemSearch('')
    }

    if (nextActorId) {
      const user = usersById.get(Number(nextActorId))
      setActorSearch(user ? `${getUserLabel(user)} (#${user.id})` : `#${nextActorId}`)
    } else {
      setActorSearch('')
    }
  }, [searchParams.toString(), itemsById, usersById])

  const formatUser = (userId: number | null | undefined) => {
    if (!userId) return '—'
    const user = usersById.get(userId)
    if (!user) return `#${userId}`
    return `${getUserLabel(user)}`
  }

  const formatLocation = (locationId: number | null | undefined) => {
    if (!locationId) return '—'
    const location = locationsById.get(locationId)
    if (!location) return `#${locationId}`
    return location.name
  }

  const formatItem = (itemIdValue: number) => {
    const item = itemsById.get(itemIdValue)
    if (!item) return `инвентарь #${itemIdValue}`
    return item.title
  }

  const formatEventType = (value: string) => {
    if (value === 'MOVE') return 'Перемещение'
    return value
  }

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : lang === 'id' ? 'id-ID' : 'en-US'
    return date.toLocaleString(locale)
  }

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase()
    const candidates = query
      ? items.filter((item) => {
          const byId = String(item.id).includes(query.replace('#', ''))
          const label = item.title.toLowerCase()
          return byId || label.includes(query)
        })
      : items
    return candidates.slice(0, 8)
  }, [items, itemSearch])

  const filteredActors = useMemo(() => {
    const query = actorSearch.trim().toLowerCase()
    const candidates = query
      ? users.filter((user) => {
          const label = getUserLabel(user).toLowerCase()
          const meta = getUserMeta(user).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : users
    return candidates.slice(0, 8)
  }, [users, actorSearch])

  const changePage = (nextPage: number) => {
    const safePage = Math.max(1, Math.floor(nextPage))
    const next = new URLSearchParams(searchParams)
    next.set('page', String(safePage))
    if (!next.get('limit')) next.set('limit', String(appliedLimit))
    setSearchParams(next, { replace: true })
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
                <span>Администрирование / Журнал</span>
              </nav>
              <h1>Журнал</h1>
              <p>События и действия по инвентарю.</p>
            </div>
          </header>

          <section className="admin__grid admin__grid--single">
            <article className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>Фильтры</h2>
                  <span>Поиск по item_id / actor_user_id / event_type.</span>
                </div>
              </div>

              <form
                className="admin__form admin__form--compact"
                onSubmit={(event) => {
                  event.preventDefault()
                  syncQuery(1)
                }}
              >
                <label>
                  Инвентарь
                  <div className="inventory-user-picker">
                    <input
                      value={itemSearch}
                      onChange={(event) => {
                        const next = event.target.value
                        setItemSearch(next)
                        setItemId(parseLeadingId(next) ?? '')
                      }}
                      onFocus={() => setShowItemList(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowItemList(false), 120)
                      }}
                      placeholder="Введите название или ID"
                    />
                    {showItemList && filteredItems.length > 0 && (
                      <div className="inventory-user-picker__list">
                        {filteredItems.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="inventory-user-picker__option"
                            onClick={() => {
                              setItemId(String(item.id))
                              setItemSearch(`${item.title} (#${item.id})`)
                              setShowItemList(false)
                            }}
                          >
                            <span className="inventory-user-picker__name">{item.title}</span>
                            <span className="inventory-user-picker__meta">ID: {item.id}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {itemId && <div className="inventory-user-picker__value">Выбрано: ID {itemId}</div>}
                  </div>
                </label>

                <label>
                  Автор
                  <div className="inventory-user-picker">
                    <input
                      value={actorSearch}
                      onChange={(event) => {
                        const next = event.target.value
                        setActorSearch(next)
                        setActorUserId(parseLeadingId(next) ?? '')
                      }}
                      onFocus={() => setShowActorList(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowActorList(false), 120)
                      }}
                      placeholder="ФИО, почта или ID"
                    />
                    {showActorList && filteredActors.length > 0 && (
                      <div className="inventory-user-picker__list">
                        {filteredActors.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            className="inventory-user-picker__option"
                            onClick={() => {
                              setActorUserId(String(user.id))
                              setActorSearch(`${getUserLabel(user)} (#${user.id})`)
                              setShowActorList(false)
                            }}
                          >
                            <span className="inventory-user-picker__name">{getUserLabel(user)}</span>
                            <span className="inventory-user-picker__meta">{getUserMeta(user)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {actorUserId && <div className="inventory-user-picker__value">Выбрано: ID {actorUserId}</div>}
                  </div>
                </label>

                <label>
                  Тип события
                  <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
                    <option value="">Все</option>
                    <option value="MOVE">Перемещение</option>
                  </select>
                </label>

                <label>
                  На странице
                  <select value={String(limit)} onChange={(event) => setLimit(parsePositiveInt(event.target.value, 50))}>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                  </select>
                </label>

                <div className="admin__actions">
                  <button
                    type="button"
                    onClick={() => {
                      setItemId('')
                      setItemSearch('')
                      setActorUserId('')
                      setActorSearch('')
                      setEventType('')
                      setLimit(50)
                      setSearchParams(new URLSearchParams(), { replace: true })
                    }}
                  >
                    Сбросить
                  </button>
                  <button type="submit" className="is-primary">
                    Применить
                  </button>
                </div>
              </form>
            </article>

            <article className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>События</h2>
                  <span>
                    Показано: {events.length}
                    {!isLoading && !error && events.length > 0 ? ` (с ${appliedOffset + 1})` : ''}
                  </span>
                </div>
                <div className="admin__pagination">
                  <button type="button" onClick={() => changePage(appliedPage - 1)} disabled={appliedPage <= 1 || isLoading}>
                    ←
                  </button>
                  <span>{appliedPage}</span>
                  <button type="button" onClick={() => changePage(appliedPage + 1)} disabled={!hasNextPage || isLoading}>
                    →
                  </button>
                </div>
              </div>

              <div className="admin__table">
                {isLoading && <p>Загрузка...</p>}
                {!isLoading && error && <p className="admin__error">{error}</p>}
                {isEmpty && <p>Ничего не найдено.</p>}
                {!isLoading &&
                  !error &&
                  events.map((evt) => (
                    <div className="admin__row" key={evt.id}>
                      <div className="admin__row-info">
                        <div className="admin__row-title">
                          {formatEventType(evt.event_type)} · {formatItem(evt.item_id)} <span className="admin__muted">#{evt.item_id}</span>
                        </div>
                        <div className="admin__row-sub">
                          #{evt.id} · автор {formatUser(evt.actor_user_id ?? null)} · кабинет {formatLocation(evt.from_location_id ?? null)} →{' '}
                          {formatLocation(evt.to_location_id ?? null)} · ответственный {formatUser(evt.from_responsible_id ?? null)} →{' '}
                          {formatUser(evt.to_responsible_id ?? null)} · {formatDateTime(evt.created_at ?? null)}
                        </div>
                      </div>
                      <div className="admin__row-actions">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/journal/${evt.id}`)}
                        >
                          Детали
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
