import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import {
  listInventoryTypes,
  listMyInventoryItems,
  type InventoryItem,
  type InventoryType,
} from '@/shared/api/inventory'

type EquipmentStatus = 'active' | 'service' | 'reserve'

const statusLabel: Record<EquipmentStatus, string> = {
  active: 'В работе',
  service: 'На сервисе',
  reserve: 'Резерв',
}

type EquipmentRow = {
  id: number
  name: string
  type: string
  location: string
  status: string | null
  statusKey: EquipmentStatus | 'other'
  item: InventoryItem
}

function normalizeStatus(status?: string | null): EquipmentStatus | 'other' {
  const value = status?.trim().toLowerCase() ?? ''
  if (!value) {
    return 'other'
  }
  if (value.includes('service') || value.includes('сервис')) {
    return 'service'
  }
  if (value.includes('reserve') || value.includes('резерв')) {
    return 'reserve'
  }
  if (value.includes('active') || value.includes('work') || value.includes('работ')) {
    return 'active'
  }
  return 'other'
}

function getUserLabel(user: CurrentUser | null) {
  if (!user) {
    return 'Пользователь'
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

function buildRows(
  items: InventoryItem[],
  types: InventoryType[],
  locations: Cabinet[]
): EquipmentRow[] {
  const typeMap = new Map(types.map((type) => [type.id, type.name]))
  const locationMap = new Map(locations.map((location) => [location.id, location.name]))
  return items.map((item) => {
    const statusKey = normalizeStatus(item.status)
    const typeLabel =
      item.category ||
      (item.inventory_type_id ? typeMap.get(item.inventory_type_id) : undefined) ||
      '—'
    const locationLabel =
      (item.location_id ? locationMap.get(item.location_id) : undefined) || '—'
    return {
      id: item.id,
      name: item.title,
      type: typeLabel,
      location: locationLabel,
      status: item.status ?? null,
      statusKey,
      item,
    }
  })
}

export function MyEquipmentPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<EquipmentRow | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [locations, setLocations] = useState<Cabinet[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    Promise.all([listMyInventoryItems(), listInventoryTypes(), listCabinets(), getCurrentUser()])
      .then(([itemsData, typesData, locationsData, userData]) => {
        if (!active) {
          return
        }
        setItems(itemsData)
        setTypes(typesData)
        setLocations(locationsData)
        setCurrentUser(userData)
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
  }, [])

  const rows = useMemo(() => buildRows(items, types, locations), [items, types, locations])

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
        active="my-equipment"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main dashboard__main--my-equipment">
        <section className="my-equipment">
          <header className="my-equipment__header">
            <div>
              <h1>Моё оборудование</h1>
              <p>Отчёт по оборудованию пользователя: {getUserLabel(currentUser)}</p>
            </div>
            <div className="my-equipment__actions">
              <button className="my-equipment__scan" type="button" onClick={() => setScanOpen(true)}>
                Сканировать код
              </button>
              <button className="my-equipment__export" type="button">
                Экспорт отчёта
              </button>
            </div>
          </header>

          <div className="room__table">
            <div className="room__table-head">
              <span>Оборудование</span>
              <span>Тип</span>
              <span>Локация</span>
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
                rows.map((row) => (
                  <div
                    className="room__table-row is-clickable"
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(row)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setSelectedItem(row)
                      }
                    }}
                  >
                    <span>{row.name}</span>
                    <span>{row.type}</span>
                    <span>{row.location}</span>
                    <span className="room__status">
                      {row.statusKey === 'other'
                        ? row.status || 'Статус не задан'
                        : statusLabel[row.statusKey]}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </main>

      {selectedItem ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="room__modal" role="dialog" aria-modal="true">
            <div className="room__modal-media">
              <div className="room__modal-image" />
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
              <p className="room__modal-subtitle">Оборудование пользователя</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>
                    {selectedItem.statusKey === 'other'
                      ? selectedItem.status || 'Статус не задан'
                      : statusLabel[selectedItem.statusKey]}
                  </strong>
                </div>
                <div>
                  <span>Локация</span>
                  <strong>{selectedItem.location}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{getUserLabel(currentUser)}</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство закреплено за пользователем и доступно в личной ведомости.
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

      {scanOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="scan-modal" role="dialog" aria-modal="true">
            <div className="scan-modal__preview">
              <div className="scan-modal__frame" />
              <span>Наведи камеру на штрих-код</span>
            </div>
            <div className="scan-modal__actions">
              <button type="button" onClick={() => setScanOpen(false)}>
                Закрыть
              </button>
              <button className="is-primary" type="button" onClick={() => setScanOpen(false)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
