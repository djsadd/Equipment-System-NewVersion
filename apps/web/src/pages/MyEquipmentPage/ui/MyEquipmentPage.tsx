import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import {
  listInventoryTypes,
  listMyInventoryItems,
  scanMyInventoryItem,
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

function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, '').trim()
}

export function MyEquipmentPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [selectedItem, setSelectedItem] = useState<EquipmentRow | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [locations, setLocations] = useState<Cabinet[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const scanBufferRef = useRef('')
  const scanLastKeyAtRef = useRef<number>(0)
  const scanFinalizeTimerRef = useRef<number | null>(null)
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

  const processScannedBarcode = useCallback(
    async (rawValue: string) => {
      const code = normalizeBarcode(rawValue)
      if (!code) {
        return
      }

      setLastScannedCode(code)

      if (isLoading) {
        setScanError('Данные ещё загружаются. Попробуйте чуть позже.')
        setScanOpen(true)
        return
      }

      let scanned: InventoryItem | null = null
      try {
        scanned = await scanMyInventoryItem({ barcode_value: code })
      } catch {
        scanned = null
      }

      const match = scanned ? rows.find((row) => row.id === scanned.id) ?? null : null

      if (!match) {
        setScanError(`Инвентарь по коду "${code}" не найден.`)
        setScanOpen(true)
        return
      }

      setScanError(null)
      setScanOpen(false)
      setSelectedItem(match)
    },
    [isLoading, rows]
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target as HTMLElement).isContentEditable) {
          return
        }
      }

      const now = typeof event.timeStamp === 'number' ? event.timeStamp : Date.now()
      const gap = now - scanLastKeyAtRef.current
      scanLastKeyAtRef.current = now

      if (gap > 120) {
        scanBufferRef.current = ''
        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
          scanFinalizeTimerRef.current = null
        }
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const buffer = scanBufferRef.current
        scanBufferRef.current = ''
        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
          scanFinalizeTimerRef.current = null
        }

        const normalized = normalizeBarcode(buffer)
        if (normalized.length < 6) {
          return
        }

        event.preventDefault()
        processScannedBarcode(normalized)
        return
      }

      if (event.key.length === 1) {
        scanBufferRef.current += event.key
        if (scanBufferRef.current.length > 128) {
          scanBufferRef.current = scanBufferRef.current.slice(-128)
        }

        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
        }
        scanFinalizeTimerRef.current = window.setTimeout(() => {
          const buffer = scanBufferRef.current
          scanBufferRef.current = ''
          scanFinalizeTimerRef.current = null

          const normalized = normalizeBarcode(buffer)
          if (normalized.length < 6) {
            return
          }
          processScannedBarcode(normalized)
        }, 180)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (scanFinalizeTimerRef.current !== null) {
        window.clearTimeout(scanFinalizeTimerRef.current)
        scanFinalizeTimerRef.current = null
      }
    }
  }, [processScannedBarcode])

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
              <button
                className="my-equipment__scan"
                type="button"
                onClick={() => {
                  setScanError(null)
                  setLastScannedCode(null)
                  setScanOpen(true)
                }}
              >
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
              <span>Отсканируйте штрих‑код сканером</span>
              {lastScannedCode ? (
                <span className="scan-modal__hint">Последний код: {lastScannedCode}</span>
              ) : (
                <span className="scan-modal__hint">Ожидание сканирования…</span>
              )}
              {scanError ? <span className="scan-modal__error">{scanError}</span> : null}
            </div>
            <div className="scan-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setScanOpen(false)
                  setScanError(null)
                }}
              >
                Закрыть
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => {
                  setScanOpen(false)
                  setScanError(null)
                }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
