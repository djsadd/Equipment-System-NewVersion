import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'
import { getMyCabinet, type Cabinet } from '@/shared/api/cabinets'
import {
  listInventoryItemsByRoom,
  listInventoryTypes,
  type InventoryItem,
  type InventoryType,
} from '@/shared/api/inventory'

type RoomItem = {
  id: number
  name: string
  type: string
  status: string | null
  item: InventoryItem
}

function getUserLabel(user: CurrentUser | null) {
  if (!user) {
    return 'Ответственный не указан'
  }
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

export function RoomDetailPage() {
  const [finishOpen, setFinishOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RoomItem | null>(null)
  const [room, setRoom] = useState<Cabinet | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const params = useParams()
  const roomId = Number(params.roomId ?? params.id)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
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
    Promise.all([
      getMyCabinet(roomId),
      listInventoryItemsByRoom(roomId),
      listInventoryTypes(),
      getCurrentUser(),
    ])
      .then(([roomData, itemsData, typesData, userData]) => {
        if (!active) {
          return
        }
        setRoom(roomData)
        setItems(itemsData)
        setTypes(typesData)
        setCurrentUser(userData)
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

  const roomItems = useMemo(() => {
    const typeMap = new Map(types.map((type) => [type.id, type.name]))
    return items.map((item) => ({
      id: item.id,
      name: item.title,
      type:
        item.category ||
        (item.inventory_type_id ? typeMap.get(item.inventory_type_id) : undefined) ||
        '—',
      status: item.status ?? null,
      item,
    }))
  }, [items, types])

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
        active="inventory"
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <main className="dashboard__main">
        <div className="room">
          <div className="room__header">
            <div>
              <h1>{room?.name ?? 'Кабинет'}</h1>
              <p>Тип кабинета: {room?.room_type ?? '—'}</p>
            </div>
            <button className="room__finish" type="button" onClick={() => setFinishOpen(true)}>
              Завершить аудиторию
            </button>
          </div>

          <div className="room__table is-four">
            <div className="room__table-head">
              <span>Наименование</span>
              <span>Отв. сотрудник</span>
              <span>Тип оборудования</span>
              <span>Статус</span>
            </div>
            <div className="room__table-body">
              {isLoading && (
                <div className="room__table-row is-message">Загрузка...</div>
              )}
              {!isLoading && error && (
                <div className="room__table-row is-message">{error}</div>
              )}
              {!isLoading &&
                !error &&
                roomItems.map((item) => (
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
                    <span>{item.name}</span>
                    <span>{getUserLabel(currentUser)}</span>
                    <span>{item.type}</span>
                    <span className="room__status">{item.status ?? 'Статус не задан'}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </main>

      {finishOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Завершить аудиторию</h2>
            <p>Вы уверены, что хотите завершить аудит кабинета {room?.name ?? ''}?</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setFinishOpen(false)}>
                Отмена
              </button>
              <button className="is-primary" type="button" onClick={() => setFinishOpen(false)}>
                Завершить
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedItem ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="room__modal" role="dialog" aria-modal="true">
            <div className="room__modal-media">
              <div
                className="room__modal-image"
                style={
                  selectedItem.item.image
                    ? {
                        backgroundImage: `url(${selectedItem.item.image})`,
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
                <h2>{selectedItem.name}</h2>
                <button
                  className="room__modal-close"
                  type="button"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕
                </button>
              </div>
              <p className="room__modal-subtitle">Инвентарное оборудование</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{getUserLabel(currentUser)}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>{selectedItem.status ?? 'Статус не задан'}</strong>
                </div>
                <div>
                  <span>Местоположение</span>
                  <strong>{room?.name ?? '—'}</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство закреплено за кабинетом и должно находиться на рабочем месте.
              </p>
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
                <button className="is-primary" type="button" onClick={() => setSelectedItem(null)}>
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
