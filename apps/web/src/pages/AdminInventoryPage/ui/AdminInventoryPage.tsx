import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  bulkMoveInventoryItems,
  createInventoryItem,
  createInventoryType,
  deleteInventoryItem,
  deleteInventoryType,
  getBarcode,
  listInventoryItems,
  listInventoryTypes,
  type InventoryItem,
  type InventoryType,
  updateInventoryItem,
  updateInventoryType,
} from '@/shared/api/inventory'
import { printLabel } from '@/shared/api/print'
import { getInventoryStatusLabel } from '@/shared/lib/inventoryStatus'
import { listAdminUsers, type AdminUser } from '@/shared/api/admin'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import { InventoryItemForm, type InventoryItemFormPayload } from './InventoryItemForm'

type AdminTab = 'items' | 'types' | 'move'

type ModalState =
  | { type: 'item-view'; item: InventoryItem }
  | { type: 'item-edit'; item: InventoryItem }
  | { type: 'type-create' }
  | { type: 'type-edit'; item: InventoryType }
  | { type: 'move-bulk' }
  | null

export function AdminInventoryPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [activeTab, setActiveTab] = useState<AdminTab>('items')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [locations, setLocations] = useState<Cabinet[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [printNotice, setPrintNotice] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [selectedMoveItemIds, setSelectedMoveItemIds] = useState<number[]>([])
  const [moveSuccess, setMoveSuccess] = useState<string | null>(null)
  const [bulkMoveLocationId, setBulkMoveLocationId] = useState('')
  const [bulkMoveLocationSearch, setBulkMoveLocationSearch] = useState('')
  const [showBulkMoveLocationList, setShowBulkMoveLocationList] = useState(false)
  const [bulkMoveResponsibleId, setBulkMoveResponsibleId] = useState('')
  const [bulkMoveResponsibleSearch, setBulkMoveResponsibleSearch] = useState('')
  const [showBulkMoveResponsibleList, setShowBulkMoveResponsibleList] = useState(false)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const printerHost =
    (import.meta.env.VITE_PRINTER_HOST as string | undefined) ?? '192.168.112.169'
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const loadData = () => {
    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([listInventoryItems(), listInventoryTypes()])
      .then(([itemsData, typesData]) => {
        if (!active) {
          return
        }
        setItems(itemsData)
        setTypes(typesData)
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
    setUsersLoading(true)
    setUsersError(null)
    listAdminUsers()
      .then((data) => {
        if (!active) {
          return
        }
        setUsers(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setUsersError(err instanceof Error ? err.message : 'Не удалось загрузить пользователей')
      })
      .finally(() => {
        if (active) {
          setUsersLoading(false)
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
        setLocationsError(err instanceof Error ? err.message : 'Не удалось загрузить кабинеты')
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

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const locationsById = useMemo(
    () => new Map(locations.map((location) => [location.id, location])),
    [locations]
  )
  const typesById = useMemo(() => new Map(types.map((type) => [type.id, type])), [types])

  const getUserLabel = (user: AdminUser) => {
    if (user.full_name) {
      return user.full_name
    }
    const parts = [user.first_name, user.last_name].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(' ')
    }
    return user.email
  }

  const getUserDisplayInfo = (user: AdminUser) => {
    const name = getUserLabel(user)
    if (name === user.email) {
      return user.email
    }
    return `${name} · ${user.email}`
  }

  const getUserMeta = (user: AdminUser) => {
    const parts = [user.email]
    if (user.department_id) parts.push(`dep #${user.department_id}`)
    if (user.role) parts.push(user.role)
    return parts.filter(Boolean).join(' · ')
  }

  const getLocationLabel = (location: Cabinet) => location.name

  const getLocationMeta = (location: Cabinet) => {
    const parts = [location.room_type, location.status, `ID: ${location.id}`].filter(Boolean)
    return parts.join(' · ')
  }

  const selectedMoveSet = useMemo(() => new Set(selectedMoveItemIds), [selectedMoveItemIds])
  const selectedMoveItems = useMemo(
    () => items.filter((item) => selectedMoveSet.has(item.id)),
    [items, selectedMoveSet]
  )

  const allMoveItemIds = useMemo(() => items.map((item) => item.id), [items])
  const isAllMoveSelected = allMoveItemIds.length > 0 && allMoveItemIds.every((id) => selectedMoveSet.has(id))

  const toggleMoveItem = (itemId: number) => {
    setSelectedMoveItemIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const toggleAllMoveItems = () => {
    setSelectedMoveItemIds((prev) => (prev.length === allMoveItemIds.length ? [] : allMoveItemIds))
  }

  const filteredBulkMoveLocations = useMemo(() => {
    const query = bulkMoveLocationSearch.trim().toLowerCase()
    const candidates = query
      ? locations.filter((location) => {
          const label = getLocationLabel(location).toLowerCase()
          const meta = getLocationMeta(location).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : locations
    return candidates.slice(0, 8)
  }, [locations, bulkMoveLocationSearch])

  const filteredBulkMoveUsers = useMemo(() => {
    const query = bulkMoveResponsibleSearch.trim().toLowerCase()
    const candidates = query
      ? users.filter((user) => {
          const label = getUserLabel(user).toLowerCase()
          const meta = getUserMeta(user).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : users
    return candidates.slice(0, 8)
  }, [users, bulkMoveResponsibleSearch])

  const resetBulkMoveForm = () => {
    setBulkMoveLocationId('')
    setBulkMoveLocationSearch('')
    setShowBulkMoveLocationList(false)
    setBulkMoveResponsibleId('')
    setBulkMoveResponsibleSearch('')
    setShowBulkMoveResponsibleList(false)
  }

  const openBulkMoveModal = () => {
    if (selectedMoveItemIds.length === 0) {
      setActionError('Выберите хотя бы одно оборудование')
      return
    }
    setActionError(null)
    setMoveSuccess(null)
    resetBulkMoveForm()
    setModal({ type: 'move-bulk' })
  }

  const handleBulkMove = async () => {
    if (selectedMoveItemIds.length === 0) {
      setActionError('Выберите хотя бы одно оборудование')
      return
    }
    const locationId = Number(bulkMoveLocationId.trim())
    if (!Number.isFinite(locationId) || locationId <= 0) {
      setActionError('Выберите аудиторию')
      return
    }

    const responsibleId = Number(bulkMoveResponsibleId.trim())
    if (!Number.isFinite(responsibleId) || responsibleId <= 0) {
      setActionError('Выберите ответственного')
      return
    }
    const responsiblePatch = { responsible_id: responsibleId }

    setActionBusy(true)
    setActionError(null)
    setMoveSuccess(null)
    try {
      const result = await bulkMoveInventoryItems({
        item_ids: selectedMoveItemIds,
        location_id: locationId,
        ...responsiblePatch,
      })

      const updatedItems = await listInventoryItems()
      setItems(updatedItems)

      if (result.not_found_item_ids.length > 0) {
        setActionError(`Часть позиций не найдена: ${result.not_found_item_ids[0]}`)
      } else {
        setMoveSuccess(`Перемещено: ${result.moved_count}`)
      }

      setSelectedMoveItemIds([])
      setModal(null)
    } finally {
      setActionBusy(false)
    }
  }

  const openTypeCreate = () => {
    setActionError(null)
    setModal({ type: 'type-create' })
  }

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Удалить инвентарь?')) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteInventoryItem(itemId)
      const data = await listInventoryItems()
      setItems(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить инвентарь')
    } finally {
      setActionBusy(false)
    }
  }

  const handleDeleteType = async (typeId: number) => {
    if (!window.confirm('Удалить тип инвентаря?')) {
      return
    }
    setActionBusy(true)
    setActionError(null)
    try {
      await deleteInventoryType(typeId)
      const data = await listInventoryTypes()
      setTypes(data)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось удалить тип')
    } finally {
      setActionBusy(false)
    }
  }

  const handleItemSubmit = async (payload: InventoryItemFormPayload, itemId?: number) => {
    setActionBusy(true)
    setActionError(null)
    try {
      if (itemId) {
        await updateInventoryItem(itemId, payload)
      } else {
        const title = payload.title?.trim()
        if (!title) {
          setActionError('Название обязательно')
          return
        }
        await createInventoryItem({ ...payload, title })
      }
      const data = await listInventoryItems()
      setItems(data)
      setModal(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Не удалось сохранить инвентарь')
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
        <section className="admin admin--inventory">
          <header className="admin__header admin__header--with-tabs">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Инвентарь</span>
              </nav>
              <h1>Инвентарь</h1>
              <p>CRUD инвентаря и типов инвентаря.</p>
            </div>
            <div className="admin__header-side">
              <section className="admin__tabs" aria-label="Inventory filters">
                <button
                  type="button"
                  className={activeTab === 'items' ? 'is-active' : undefined}
                  onClick={() => {
                    setActionError(null)
                    setMoveSuccess(null)
                    setActiveTab('items')
                  }}
                >
                  Инвентарь
                </button>
                <button
                  type="button"
                  className={activeTab === 'types' ? 'is-active' : undefined}
                  onClick={() => {
                    setActionError(null)
                    setMoveSuccess(null)
                    setActiveTab('types')
                  }}
                >
                  Типы инвентаря
                </button>
                <button
                  type="button"
                  className={activeTab === 'move' ? 'is-active' : undefined}
                  onClick={() => {
                    setActionError(null)
                    setMoveSuccess(null)
                    setActiveTab('move')
                  }}
                >
                  Перемещение оборудования
                </button>
              </section>
              <div className="admin__actions">
                {activeTab === 'items' && (
                  <button type="button" className="is-primary" onClick={() => navigate('/admin/inventory/create')}>
                    Добавить инвентарь
                  </button>
                )}
                {activeTab === 'types' && (
                  <button type="button" className="is-primary" onClick={openTypeCreate}>
                    Создать тип
                  </button>
                )}
              </div>
            </div>
          </header>

          <section className="admin__grid" key={activeTab}>
            {activeTab === 'items' && (
              <article className="admin__card">
                <div className="admin__table-head">
                  <div>
                    <h2>Инвентарь</h2>
                    <span>Создание и учет единиц инвентаря.</span>
                  </div>
                  <button type="button">Список</button>
                </div>
                <div className="admin__table">
                  {isLoading && <p>Загрузка инвентаря...</p>}
                  {!isLoading && error && <p>{error}</p>}
                  {!isLoading &&
                    !error &&
                    items.map((item) => (
                      <div className="admin__row" key={item.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{item.title}</div>
                          <div className="admin__row-sub">
                            {item.category || 'Без категории'} ·{' '}
                            {item.status ? getInventoryStatusLabel(item.status) : 'Статус не задан'}
                          </div>
                        </div>
                        <div className="admin__row-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setActionError(null)
                              setPrintNotice(null)
                              setModal({ type: 'item-view', item })
                            }}
                          >
                            Просмотр
                          </button>
                          <button type="button" onClick={() => setModal({ type: 'item-edit', item })}>
                            Редактировать
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => handleDeleteItem(item.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  {actionError && <p>{actionError}</p>}
                </div>
              </article>
            )}

            {activeTab === 'types' && (
              <article className="admin__card">
                <div className="admin__table-head">
                  <div>
                    <h2>Типы инвентаря</h2>
                    <span>Справочник типов для инвентаря.</span>
                  </div>
                  <button type="button">Список</button>
                </div>
                <div className="admin__table">
                  {isLoading && <p>Загрузка типов...</p>}
                  {!isLoading && error && <p>{error}</p>}
                  {!isLoading &&
                    !error &&
                    types.map((item) => (
                      <div className="admin__row" key={item.id}>
                        <div className="admin__row-info">
                          <div className="admin__row-title">{item.name}</div>
                          <div className="admin__row-sub">
                            {item.description || 'Описание отсутствует'}
                          </div>
                        </div>
                        <div className="admin__row-actions">
                          <button type="button" onClick={() => setModal({ type: 'type-edit', item })}>
                            Редактировать
                          </button>
                          <button type="button" disabled={actionBusy} onClick={() => handleDeleteType(item.id)}>
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  {actionError && <p>{actionError}</p>}
                </div>
              </article>
            )}

            {activeTab === 'move' && (
              <article className="admin__card">
                <div className="inventory-move__head">
                  <div>
                    <h2>Перемещение оборудования</h2>
                    <span>Выберите оборудование и укажите аудиторию и ответственного.</span>
                  </div>
                  <div className="admin__actions">
                    <button
                      type="button"
                      className="is-primary"
                      disabled={selectedMoveItemIds.length === 0}
                      onClick={openBulkMoveModal}
                    >
                      Переместить оборудование ({selectedMoveItemIds.length})
                    </button>
                  </div>
                </div>

                {locationsError ? <p className="admin__error">{locationsError}</p> : null}
                {usersError ? <p className="admin__error">{usersError}</p> : null}
                {actionError ? <p className="admin__error">{actionError}</p> : null}
                {moveSuccess ? <p>{moveSuccess}</p> : null}

                <div className="inventory__table-card inventory-move__table-card">
                  <div className="inventory-move__table-head">
                    <label className="inventory-move__check">
                      <input type="checkbox" checked={isAllMoveSelected} onChange={toggleAllMoveItems} />
                    </label>
                    <span>Наименование</span>
                    <span>Местоположение</span>
                    <span>Статус</span>
                    <span>Тип</span>
                    <span>Ответственное лицо</span>
                  </div>

                  {isLoading && (
                    <div className="inventory-move__table-row">
                      <span />
                      <span>Загрузка...</span>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  {!isLoading && error && (
                    <div className="inventory-move__table-row">
                      <span />
                      <span>{error}</span>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  {!isLoading && !error && items.length === 0 && (
                    <div className="inventory-move__table-row">
                      <span />
                      <span>Инвентарь не найден</span>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  )}

                  {!isLoading &&
                    !error &&
                    items.map((item) => {
                      const location = item.location_id ? locationsById.get(item.location_id) ?? null : null
                      const responsible = item.responsible_id ? usersById.get(item.responsible_id) ?? null : null
                      const inventoryType = item.inventory_type_id ? typesById.get(item.inventory_type_id) ?? null : null
                      const checked = selectedMoveSet.has(item.id)
                      return (
                        <div
                          key={item.id}
                          className="inventory-move__table-row"
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleMoveItem(item.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              toggleMoveItem(item.id)
                            }
                          }}
                        >
                          <label className="inventory-move__check" onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" checked={checked} onChange={() => toggleMoveItem(item.id)} />
                          </label>
                          <span>{item.title}</span>
                          <span>{location ? `${location.name} (ID ${location.id})` : '—'}</span>
                          <span className="inventory__status">
                            {getInventoryStatusLabel(item.status)}
                          </span>
                          <span>{inventoryType ? inventoryType.name : item.inventory_type_id ? `Тип #${item.inventory_type_id}` : '—'}</span>
                          <span>
                            {responsible ? getUserDisplayInfo(responsible) : item.responsible_id ? `ID ${item.responsible_id}` : '—'}
                          </span>
                        </div>
                      )
                    })}
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
            {modal.type === 'item-edit' && (
              <InventoryItemForm
                types={types}
                initial={modal.item}
                mode="edit"
                users={users}
                usersLoading={usersLoading}
                usersError={usersError}
                locations={locations}
                locationsLoading={locationsLoading}
                locationsError={locationsError}
                onCancel={() => setModal(null)}
                onSubmit={(payload) => handleItemSubmit(payload, modal.item.id)}
                busy={actionBusy}
                error={actionError}
              />
            )}
            {modal.type === 'item-view' && (
              <>
                <h2>{modal.item.title}</h2>
                <p>{modal.item.category || 'Без категории'}</p>
                <div className="room__modal-grid">
                  <span>Статус</span>
                  <strong>{getInventoryStatusLabel(modal.item.status)}</strong>
                  <span>Тип инвентаря</span>
                  <strong>
                    {modal.item.inventory_type_id
                      ? typesById.get(modal.item.inventory_type_id)?.name ??
                        `Тип #${modal.item.inventory_type_id}`
                      : '—'}
                  </strong>
                  <span>Категория</span>
                  <strong>{modal.item.category || '—'}</strong>
                  <span>Ответственный</span>
                  <strong>
                    {modal.item.responsible_id
                      ? usersById.get(modal.item.responsible_id)
                        ? getUserDisplayInfo(usersById.get(modal.item.responsible_id)!)
                        : `ID ${modal.item.responsible_id}`
                      : '—'}
                  </strong>
                  <span>Локация</span>
                  <strong>
                    {modal.item.location_id
                      ? locationsById.get(modal.item.location_id)?.name ??
                        `Кабинет #${modal.item.location_id}`
                      : '—'}
                  </strong>
                  <span>Последняя инвентаризация</span>
                  <strong>{modal.item.last_inventory_at || '—'}</strong>
                  <span>Последний аудит</span>
                  <strong>{modal.item.last_audit_at || '—'}</strong>
                  <span>Создан</span>
                  <strong>{modal.item.created_at || '—'}</strong>
                  <span>Обновлен</span>
                  <strong>{modal.item.updated_at || '—'}</strong>
                </div>
                {(usersLoading || locationsLoading) && (
                  <p className="inventory-create__loading">
                    Подгружаем справочники для отображения
                  </p>
                )}
                {usersError ? <p className="inventory-create__error">{usersError}</p> : null}
                {locationsError ? <p className="inventory-create__error">{locationsError}</p> : null}
                <div className="inventory__actions">
                  {actionError ? <p className="admin__error">{actionError}</p> : null}
                  {printNotice ? <p className="admin__success">{printNotice}</p> : null}
                  <button
                    type="button"
                    className="is-primary"
                    disabled={actionBusy}
                    onClick={async () => {
                      setActionBusy(true)
                      setActionError(null)
                      setPrintNotice(null)
                      try {
                        const candidates = modal.item.barcodes ?? []
                        const primary =
                          candidates.find((b) => b.id === modal.item.barcode_id) ??
                          candidates[0] ??
                          null

                        const fallbackBarcodeId =
                          (typeof modal.item.barcode_id === 'number' && modal.item.barcode_id > 0
                            ? modal.item.barcode_id
                            : null) ?? primary?.id ?? null

                        if (!fallbackBarcodeId) {
                          throw new Error('У оборудования не указан штрих-код')
                        }

                        const zpl =
                          primary?.zpl_barcode ?? (await getBarcode(fallbackBarcodeId)).zpl_barcode

                        if (!zpl) {
                          throw new Error('ZPL для штрих-кода не найден')
                        }

                        await printLabel({
                          zpl_data: zpl,
                          printer_host: printerHost,
                        })
                        setPrintNotice('Отправлено на печать')
                      } catch (err) {
                        setActionError(
                          err instanceof Error ? err.message : 'Не удалось отправить на печать'
                        )
                      } finally {
                        setActionBusy(false)
                      }
                    }}
                  >
                    Распечатать штрих-код
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModal(null)
                      setActionError(null)
                      setPrintNotice(null)
                    }}
                  >
                    Закрыть
                  </button>
                </div>
              </>
            )}
            {modal.type === 'move-bulk' && (
              <form
                className="admin__form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleBulkMove()
                }}
              >
                <h2>Перемещение оборудования</h2>
                <p>Выбрано: {selectedMoveItemIds.length}</p>

                {selectedMoveItems.length > 0 && (
                  <div className="inventory-move__selected">
                    <div className="inventory-move__selected-title">Список оборудования</div>
                    <div className="inventory-move__selected-list">
                      {selectedMoveItems.map((item) => (
                        <div key={item.id} className="inventory-move__selected-item">
                          <span className="inventory-move__selected-name">{item.title}</span>
                          <span className="inventory-move__selected-meta">ID {item.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label>
                  Аудитория
                  <div className="inventory-user-picker">
                    <input
                      value={bulkMoveLocationSearch}
                      onChange={(event) => {
                        setBulkMoveLocationSearch(event.target.value)
                        setBulkMoveLocationId('')
                      }}
                      onFocus={() => setShowBulkMoveLocationList(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowBulkMoveLocationList(false), 120)
                      }}
                      placeholder="Номер или название аудитории"
                    />
                    {locationsLoading && (
                      <div className="inventory-user-picker__hint">Загрузка кабинетов...</div>
                    )}
                    {!locationsLoading && locationsError && (
                      <div className="inventory-user-picker__error">{locationsError}</div>
                    )}
                    {!locationsLoading &&
                      !locationsError &&
                      showBulkMoveLocationList &&
                      filteredBulkMoveLocations.length > 0 && (
                        <div className="inventory-user-picker__list">
                          {filteredBulkMoveLocations.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              className="inventory-user-picker__option"
                              onClick={() => {
                                setBulkMoveLocationId(String(location.id))
                                setBulkMoveLocationSearch(getLocationLabel(location))
                                setShowBulkMoveLocationList(false)
                              }}
                            >
                              <span className="inventory-user-picker__name">{getLocationLabel(location)}</span>
                              <span className="inventory-user-picker__meta">{getLocationMeta(location)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    {bulkMoveLocationId && (
                      <div className="inventory-user-picker__value">Выбрано: ID {bulkMoveLocationId}</div>
                    )}
                  </div>
                </label>

                <label>
                  На кого переместить
                  <div className="inventory-user-picker">
                    <input
                      value={bulkMoveResponsibleSearch}
                      onChange={(event) => {
                        setBulkMoveResponsibleSearch(event.target.value)
                        setBulkMoveResponsibleId('')
                      }}
                      onFocus={() => setShowBulkMoveResponsibleList(true)}
                      onBlur={() => {
                        window.setTimeout(() => setShowBulkMoveResponsibleList(false), 120)
                      }}
                      placeholder="ФИО, почта или отдел"
                    />
                    {usersLoading && (
                      <div className="inventory-user-picker__hint">Загрузка пользователей...</div>
                    )}
                    {!usersLoading && usersError && (
                      <div className="inventory-user-picker__error">{usersError}</div>
                    )}
                    {!usersLoading &&
                      !usersError &&
                      showBulkMoveResponsibleList &&
                      filteredBulkMoveUsers.length > 0 && (
                        <div className="inventory-user-picker__list">
                          {filteredBulkMoveUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="inventory-user-picker__option"
                              onClick={() => {
                                setBulkMoveResponsibleId(String(user.id))
                                setBulkMoveResponsibleSearch(getUserLabel(user))
                                setShowBulkMoveResponsibleList(false)
                              }}
                            >
                              <span className="inventory-user-picker__name">{getUserLabel(user)}</span>
                              <span className="inventory-user-picker__meta">{getUserMeta(user)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    {bulkMoveResponsibleId && (
                      <div className="inventory-user-picker__value">Выбрано: ID {bulkMoveResponsibleId}</div>
                    )}
                  </div>
                </label>

                {actionError ? <p className="admin__error">{actionError}</p> : null}

                <div className="inventory__actions">
                  <button
                    type="button"
                    onClick={() => {
                      setModal(null)
                      setActionError(null)
                    }}
                    disabled={actionBusy}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="is-primary" disabled={actionBusy}>
                    Переместить
                  </button>
                </div>
              </form>
            )}
            {modal.type === 'type-create' && (
              <InventoryTypeForm
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  const name = payload.name?.trim()
                  if (!name) {
                    setActionError('Название обязательно')
                    return
                  }
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    await createInventoryType({ name, description: payload.description })
                    const data = await listInventoryTypes()
                    setTypes(data)
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось создать тип')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
              />
            )}
            {modal.type === 'type-edit' && (
              <InventoryTypeForm
                initial={modal.item}
                mode="edit"
                onCancel={() => setModal(null)}
                onSubmit={async (payload) => {
                  setActionBusy(true)
                  setActionError(null)
                  try {
                    await updateInventoryType(modal.item.id, payload)
                    const data = await listInventoryTypes()
                    setTypes(data)
                    setModal(null)
                  } catch (err) {
                    setActionError(err instanceof Error ? err.message : 'Не удалось обновить тип')
                  } finally {
                    setActionBusy(false)
                  }
                }}
                busy={actionBusy}
                error={actionError}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

type InventoryTypeFormProps = {
  initial?: InventoryType
  mode?: 'create' | 'edit'
  onSubmit: (payload: { name?: string | null; description?: string | null }) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

function InventoryTypeForm({
  initial,
  mode = 'create',
  onSubmit,
  onCancel,
  busy,
  error,
}: InventoryTypeFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      name: name || undefined,
      description: description || undefined,
    })
  }

  return (
    <form className="admin__form" onSubmit={handleSubmit}>
      <h2>{mode === 'edit' ? 'Редактировать тип' : 'Создать тип'}</h2>
      <label>
        Название
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      {error && <p>{error}</p>}
      <div className="inventory__actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="is-primary" disabled={busy}>
          {mode === 'edit' ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
