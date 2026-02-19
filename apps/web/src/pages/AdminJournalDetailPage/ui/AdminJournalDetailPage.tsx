import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getInventoryEvent, type InventoryEvent } from '@/shared/api/operations'
import { listInventoryItems, type InventoryItem } from '@/shared/api/inventory'
import { listAdminUsers, type AdminUser } from '@/shared/api/admin'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'

const detailCopy: Record<
  Lang,
  {
    breadcrumbJournal: string
    eventTitle: (id: string | undefined) => string
    eventDescription: string
    loading: string
    back: string
    copyJson: string
    copied: string
    invalidId: string
    loadError: string
    showByItem: string
    metadataTitle: string
    empty: string
    fields: {
      id: string
      eventType: string
      item: string
      actor: string
      fromLocation: string
      toLocation: string
      fromResponsible: string
      toResponsible: string
      created: string
    }
  }
> = {
  ru: {
    breadcrumbJournal: 'Администрирование / Журнал',
    eventTitle: (eventId) => `Событие #${eventId ?? '—'}`,
    eventDescription: 'Детали записи журнала и действия.',
    loading: 'Загрузка...',
    back: 'Назад',
    copyJson: 'Скопировать JSON',
    copied: 'Скопировано',
    invalidId: 'Некорректный ID события',
    loadError: 'Не удалось загрузить событие',
    showByItem: 'Показать события по инвентарю',
    metadataTitle: 'Метаданные',
    empty: '—',
    fields: {
      id: 'ID',
      eventType: 'Тип события',
      item: 'Инвентарь',
      actor: 'Автор',
      fromLocation: 'Из кабинета',
      toLocation: 'В кабинет',
      fromResponsible: 'От ответственного',
      toResponsible: 'К ответственному',
      created: 'Создано',
    },
  },
  en: {
    breadcrumbJournal: 'Administration / Journal',
    eventTitle: (eventId) => `Event #${eventId ?? '—'}`,
    eventDescription: 'Journal entry details.',
    loading: 'Loading...',
    back: 'Back',
    copyJson: 'Copy JSON',
    copied: 'Copied',
    invalidId: 'Invalid event ID',
    loadError: 'Failed to load event',
    showByItem: 'Show events for item',
    metadataTitle: 'Metadata',
    empty: '—',
    fields: {
      id: 'ID',
      eventType: 'Event type',
      item: 'Item',
      actor: 'Actor',
      fromLocation: 'From location',
      toLocation: 'To location',
      fromResponsible: 'From responsible',
      toResponsible: 'To responsible',
      created: 'Created',
    },
  },
  kk: {
    breadcrumbJournal: 'Әкімшілендіру / Журнал',
    eventTitle: (eventId) => `Оқиға #${eventId ?? '—'}`,
    eventDescription: 'Журнал жазбасының толық мәліметі.',
    loading: 'Жүктелуде...',
    back: 'Артқа',
    copyJson: 'JSON көшіру',
    copied: 'Көшірілді',
    invalidId: 'Оқиға ID қате',
    loadError: 'Оқиғаны жүктеу мүмкін болмады',
    showByItem: 'Инвентарь бойынша оқиғалар',
    metadataTitle: 'Метадеректер',
    empty: '—',
    fields: {
      id: 'ID',
      eventType: 'Оқиға түрі',
      item: 'Инвентарь',
      actor: 'Автор',
      fromLocation: 'Қайдан (кабинет)',
      toLocation: 'Қайда (кабинет)',
      fromResponsible: 'Кімнен (жауапты)',
      toResponsible: 'Кімге (жауапты)',
      created: 'Құрылған уақыты',
    },
  },
  id: {
    breadcrumbJournal: 'Administration / Journal',
    eventTitle: (eventId) => `Event #${eventId ?? '—'}`,
    eventDescription: 'Journal entry details.',
    loading: 'Loading...',
    back: 'Back',
    copyJson: 'Copy JSON',
    copied: 'Copied',
    invalidId: 'Invalid event ID',
    loadError: 'Failed to load event',
    showByItem: 'Show events for item',
    metadataTitle: 'Metadata',
    empty: '—',
    fields: {
      id: 'ID',
      eventType: 'Event type',
      item: 'Item',
      actor: 'Actor',
      fromLocation: 'From location',
      toLocation: 'To location',
      fromResponsible: 'From responsible',
      toResponsible: 'To responsible',
      created: 'Created',
    },
  },
}

export function AdminJournalDetailPage() {
  const { id } = useParams()
  const eventId = Number(id)

  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const c = useMemo(() => detailCopy[lang] ?? detailCopy.ru, [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const [event, setEvent] = useState<InventoryEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [locations, setLocations] = useState<Cabinet[]>([])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)

    if (!Number.isFinite(eventId) || eventId <= 0) {
      setIsLoading(false)
      setError(c.invalidId)
      return () => {
        active = false
      }
    }

    getInventoryEvent(eventId)
      .then((data) => {
        if (!active) return
        setEvent(data)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : c.loadError)
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [eventId, c.invalidId, c.loadError])

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

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items])
  const locationsById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )

  const getUserLabel = (user: AdminUser) => {
    if (user.full_name) return user.full_name
    const parts = [user.first_name, user.last_name].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
    return user.email
  }

  const formatUser = (userId: number | null | undefined) => {
    if (!userId) return c.empty
    const user = usersById.get(userId)
    if (!user) return `#${userId}`
    return `${getUserLabel(user)} (${user.email})`
  }

  const formatLocation = (locationId: number | null | undefined) => {
    if (!locationId) return c.empty
    const location = locationsById.get(locationId)
    if (!location) return `#${locationId}`
    return `${location.name} (#${location.id})`
  }

  const formatItem = (itemIdValue: number) => {
    const item = itemsById.get(itemIdValue)
    if (!item) return `#${itemIdValue}`
    return `${item.title} (#${item.id})`
  }

  const formatEventType = (value: string) => {
    if (value === 'MOVE') {
      if (lang === 'kk') return 'Орын ауыстыру'
      if (lang === 'en' || lang === 'id') return 'Move'
      return 'Перемещение'
    }
    return value
  }

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return c.empty
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    const locale = lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : lang === 'id' ? 'id-ID' : 'en-US'
    return date.toLocaleString(locale)
  }

  const copyJson = async () => {
    if (!event) return
    const json = JSON.stringify(event, null, 2)
    try {
      await navigator.clipboard.writeText(json)
      alert(c.copied)
    } catch {
      alert(json)
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
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/admin/journal')}
                >
                  {c.breadcrumbJournal}
                </span>
                <span> / {c.eventTitle(id)}</span>
              </nav>
              <h1>{c.eventTitle(id)}</h1>
              <p>{c.eventDescription}</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/admin/journal')}>
                {c.back}
              </button>
              <button type="button" className="is-primary" onClick={() => void copyJson()}>
                {c.copyJson}
              </button>
            </div>
          </header>

          <section className="admin__grid">
            <article className="admin__card">
              {isLoading && <p>{c.loading}</p>}
              {!isLoading && error && <p className="admin__error">{error}</p>}
              {!isLoading && !error && event && (
                <>
                  <div className="room__modal-grid">
                    <span>{c.fields.id}</span>
                    <strong>{event.id}</strong>

                    <span>{c.fields.eventType}</span>
                    <strong>{formatEventType(event.event_type)}</strong>

                    <span>{c.fields.item}</span>
                    <strong>{formatItem(event.item_id)}</strong>

                    <span>{c.fields.actor}</span>
                    <strong>{formatUser(event.actor_user_id ?? null)}</strong>

                    <span>{c.fields.fromLocation}</span>
                    <strong>{formatLocation(event.from_location_id ?? null)}</strong>

                    <span>{c.fields.toLocation}</span>
                    <strong>{formatLocation(event.to_location_id ?? null)}</strong>

                    <span>{c.fields.fromResponsible}</span>
                    <strong>{formatUser(event.from_responsible_id ?? null)}</strong>

                    <span>{c.fields.toResponsible}</span>
                    <strong>{formatUser(event.to_responsible_id ?? null)}</strong>

                    <span>{c.fields.created}</span>
                    <strong>{formatDateTime(event.created_at ?? null)}</strong>
                  </div>

                  <div className="inventory__actions" style={{ marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/journal?item_id=${event.item_id}`)}
                    >
                      {c.showByItem}
                    </button>
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <h2 style={{ margin: 0, fontSize: 18, color: '#5e142d' }}>{c.metadataTitle}</h2>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: '12px 0 0' }}>
                      {event.metadata ? JSON.stringify(event.metadata, null, 2) : c.empty}
                    </pre>
                  </div>
                </>
              )}
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
