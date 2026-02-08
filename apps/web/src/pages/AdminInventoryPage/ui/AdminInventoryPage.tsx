import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  createInventoryItem,
  createInventoryType,
  deleteInventoryItem,
  deleteInventoryType,
  listInventoryItems,
  listInventoryTypes,
  type InventoryItem,
  type InventoryType,
  updateInventoryItem,
  updateInventoryType,
} from '@/shared/api/inventory'
import { InventoryItemForm, type InventoryItemFormPayload } from './InventoryItemForm'

type AdminTab = 'items' | 'types'

type ModalState =
  | { type: 'item-edit'; item: InventoryItem }
  | { type: 'type-create' }
  | { type: 'type-edit'; item: InventoryType }
  | null

export function AdminInventoryPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<AdminTab>('items')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [modal, setModal] = useState<ModalState>(null)
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
        reportsOpen={reportsOpen}
        onToggleReports={() => setReportsOpen((prev) => !prev)}
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
                <span>Администрирование / Инвентарь</span>
              </nav>
              <h1>Инвентарь</h1>
              <p>CRUD инвентаря и типов инвентаря.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/dashboard')}>
                Вернуться в кабинет
              </button>
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
          </header>

          <section className="admin__tabs">
            <button
              type="button"
              className={activeTab === 'items' ? 'is-active' : undefined}
              onClick={() => setActiveTab('items')}
            >
              Инвентарь
            </button>
            <button
              type="button"
              className={activeTab === 'types' ? 'is-active' : undefined}
              onClick={() => setActiveTab('types')}
            >
              Типы инвентаря
            </button>
          </section>

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
                            {item.category || 'Без категории'} · {item.status || 'Статус не задан'}
                          </div>
                        </div>
                        <div className="admin__row-actions">
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
                onCancel={() => setModal(null)}
                onSubmit={(payload) => handleItemSubmit(payload, modal.item.id)}
                busy={actionBusy}
                error={actionError}
              />
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
