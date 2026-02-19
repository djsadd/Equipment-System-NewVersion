import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  createInventoryType,
  deleteInventoryType,
  listInventoryTypes,
  type InventoryType,
  updateInventoryType,
} from '@/shared/api/inventory'

type ModalState =
  | { type: 'view'; item: InventoryType }
  | { type: 'create' }
  | { type: 'edit'; item: InventoryType }
  | null

export function AdminInventoryTypesPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
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

  const loadTypes = () => {
    let active = true
    setIsLoading(true)
    setError(null)
    listInventoryTypes()
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
        setError(err instanceof Error ? err.message : 'Не удалось загрузить типы')
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

  useEffect(() => loadTypes(), [])

  const totalTypes = types.length

  const openCreate = () => {
    setActionError(null)
    setModal({ type: 'create' })
  }

  const handleDelete = async (typeId: number) => {
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
                <span>Администрирование / Типы инвентаря</span>
              </nav>
              <h1>Типы инвентаря</h1>
              <p>Создание и управление справочником типов оборудования.</p>
            </div>
            <div className="admin__actions">
              <button type="button" className="is-primary" onClick={openCreate}>
                Создать тип
              </button>
            </div>
          </header>

          <section className="admin__summary">
            <div>
              <div className="admin__summary-value">{totalTypes}</div>
              <div className="admin__summary-label">Всего типов</div>
            </div>
          </section>

          <section className="admin__grid">
            <article className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>Справочник типов</h2>
                  <span>Используется при создании инвентаря.</span>
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
                        <button type="button" onClick={() => setModal({ type: 'view', item })}>
                          Просмотр
                        </button>
                        <button type="button" onClick={() => setModal({ type: 'edit', item })}>
                          Редактировать
                        </button>
                        <button type="button" disabled={actionBusy} onClick={() => handleDelete(item.id)}>
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                {actionError && <p>{actionError}</p>}
              </div>
            </article>
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
            {modal.type === 'view' && (
              <>
                <h2>{modal.item.name}</h2>
                <p>{modal.item.description || 'Описание отсутствует'}</p>
                <div className="room__modal-grid">
                  <span>ID</span>
                  <strong>{modal.item.id}</strong>
                  <span>Создан</span>
                  <strong>{modal.item.created_at ?? '—'}</strong>
                </div>
                <div className="inventory__actions">
                  <button type="button" onClick={() => setModal(null)}>
                    Закрыть
                  </button>
                </div>
              </>
            )}
            {modal.type === 'create' && (
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
                    await createInventoryType({
                      name,
                      description: payload.description,
                    })
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
            {modal.type === 'edit' && (
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
