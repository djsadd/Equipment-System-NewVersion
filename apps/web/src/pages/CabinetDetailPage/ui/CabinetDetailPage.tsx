import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, lookupUsers, type CurrentUser, type UserLookup } from '@/shared/api/auth'
import { getMyCabinet, type Cabinet } from '@/shared/api/cabinets'
import { listInventoryItemsByRoom, listInventoryTypes, type InventoryItem, type InventoryType } from '@/shared/api/inventory'

function getUserDisplay(user: UserLookup) {
  const fullName = (user.full_name ?? '').trim()
  const combinedName = [user.first_name, user.last_name]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim()
  return fullName.length > 0 ? fullName : combinedName.length > 0 ? combinedName : user.email
}

function toUserLookup(user: CurrentUser): UserLookup {
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name ?? null,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
    department_id: user.department_id ?? null,
    role: user.role ?? null,
    is_active: user.is_active,
  }
}

function getResponsibleLabel(item: InventoryItem, usersById: Record<number, UserLookup>) {
  const responsibleId = item.responsible_id
  if (typeof responsibleId !== 'number') {
    return '-'
  }
  const user = usersById[responsibleId]
  if (!user) {
    return `#${responsibleId}`
  }
  return getUserDisplay(user)
}

export function CabinetDetailPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })

  const params = useParams()
  const roomId = Number(params.id)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const [room, setRoom] = useState<Cabinet | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [usersById, setUsersById] = useState<Record<number, UserLookup>>({})
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      setError('Некорректный кабинет')
      setIsLoading(false)
      return
    }

    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([getMyCabinet(roomId), listInventoryItemsByRoom(roomId), listInventoryTypes(), getCurrentUser()])
      .then(([roomData, itemsData, typesData, userData]) => {
        if (!active) {
          return
        }
        setRoom(roomData)
        setItems(itemsData)
        setTypes(typesData)
        setUsersById((prev) => ({ ...prev, [userData.id]: toUserLookup(userData) }))
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинет')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [roomId])

  useEffect(() => {
    const ids = Array.from(
      new Set(
        [
          ...items.map((item) => item.responsible_id),
          room?.responsible_id,
        ].filter((id): id is number => typeof id === 'number')
      )
    )
    const toFetch = ids.filter((id) => usersById[id] === undefined)
    if (toFetch.length === 0) {
      return
    }

    let cancelled = false
    lookupUsers(toFetch.slice(0, 200))
      .then((users) => {
        if (cancelled) {
          return
        }
        setUsersById((prev) => {
          const next = { ...prev }
          users.forEach((user) => {
            next[user.id] = user
          })
          return next
        })
      })
      .catch(() => {
        // ignore lookup errors, keep IDs as fallback
      })

    return () => {
      cancelled = true
    }
  }, [items, room, usersById])

  const typeMap = useMemo(() => new Map(types.map((type) => [type.id, type.name])), [types])
  const selectedTypeLabel = useMemo(() => {
    if (!selectedItem) {
      return '-'
    }
    return (
      selectedItem.category ||
      (typeof selectedItem.inventory_type_id === 'number' ? typeMap.get(selectedItem.inventory_type_id) : undefined) ||
      '-'
    )
  }, [selectedItem, typeMap])
  const roomResponsibleLabel = useMemo(() => {
    if (!room || typeof room.responsible_id !== 'number') {
      return '-'
    }
    const user = usersById[room.responsible_id]
    return user ? getUserDisplay(user) : `#${room.responsible_id}`
  }, [room, usersById])

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
        active="cabinets"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <div className="room">
          <div className="room__header">
            <div>
              <nav className="breadcrumb">
                <span role="button" tabIndex={0} onClick={() => navigate('/cabinets')} onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate('/cabinets')
                  }
                }}>
                  Кабинеты
                </span>
                <span> / </span>
                <span>{room?.name ?? `Кабинет #${roomId}`}</span>
              </nav>
              <h1>{room?.name ?? `Кабинет #${roomId}`}</h1>
              <p className="room__meta">
                Тип: {room?.room_type ?? '-'} | Ответственный: {roomResponsibleLabel}
              </p>
            </div>
          </div>

          <div className="room__table is-five">
            <div className="room__table-head">
              <span>Наименование</span>
              <span>Тип</span>
              <span>Ответственный</span>
              <span>Статус</span>
              <span />
            </div>
            <div className="room__table-body">
              {isLoading && <div className="room__table-row is-message">Загрузка...</div>}
              {!isLoading && error && <div className="room__table-row is-message">{error}</div>}
              {!isLoading && !error && items.length === 0 ? (
                <div className="room__table-row is-message">В кабинете нет оборудования</div>
              ) : null}
              {!isLoading && !error
                ? items.map((item) => (
                    <div
                      className="room__table-row is-clickable"
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedItem(item)
                        }
                      }}
                    >
                      <span>{item.title}</span>
                      <span>
                        {item.category ||
                          (typeof item.inventory_type_id === 'number' ? typeMap.get(item.inventory_type_id) : undefined) ||
                          '-'}
                      </span>
                      <span>{getResponsibleLabel(item, usersById)}</span>
                      <span>{item.status ?? '-'}</span>
                      <button type="button" onClick={() => setSelectedItem(item)}>
                        Детали
                      </button>
                    </div>
                  ))
                : null}
            </div>
          </div>
        </div>
      </main>

      {selectedItem ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="room__modal" role="dialog" aria-modal="true">
            <div className="room__modal-media">
              <div
                className="room__modal-image"
                style={
                  selectedItem.image
                    ? {
                        backgroundImage: `url(${selectedItem.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }
                    : undefined
                }
              />
            </div>
            <div className="room__modal-content">
              <div className="room__modal-header">
                <h2>{selectedItem.title}</h2>
                <button className="room__modal-close" type="button" onClick={() => setSelectedItem(null)}>
                  x
                </button>
              </div>
              <p className="room__modal-subtitle">Оборудование кабинета</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedTypeLabel}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{getResponsibleLabel(selectedItem, usersById)}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>{selectedItem.status ?? '-'}</strong>
                </div>
                <div>
                  <span>Кабинет</span>
                  <strong>{room?.name ?? `#${roomId}`}</strong>
                </div>
              </div>
              {selectedItem.description ? <p className="room__modal-note">{selectedItem.description}</p> : null}
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
