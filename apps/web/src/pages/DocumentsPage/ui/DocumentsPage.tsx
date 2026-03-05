import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens, hasSystemAdminRole } from '@/shared/lib/authStorage'
import {
  downloadGeneratedDocumentFile,
  listDocumentTypes,
  listGeneratedDocumentsPage,
  type DocumentType,
  type GeneratedDocument,
  type GeneratedDocumentsPage,
} from '@/shared/api/documents'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import { listInventoryItems, type InventoryItem } from '@/shared/api/inventory'
import { searchUsers, type UserLookup } from '@/shared/api/auth'

function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function langToLocale(lang: Lang) {
  if (lang === 'kk') return 'kk-KZ'
  if (lang === 'id') return 'de-DE'
  if (lang === 'en') return 'en-US'
  return 'ru-RU'
}

type Filters = {
  type_code?: string
  room_id?: number
  equipment_id?: number
  responsible_user_id?: number
  generated_from?: string
  generated_to?: string
  limit: number
}

type PaginationToken = number | 'ellipsis'

function buildPagination(currentPage: number, totalPages: number): PaginationToken[] {
  const total = Math.max(1, Math.floor(totalPages))
  const current = Math.min(total, Math.max(1, Math.floor(currentPage)))

  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)

  if (current <= 3) {
    start = 2
    end = 4
  } else if (current >= total - 2) {
    start = total - 3
    end = total - 1
  }

  start = Math.max(2, start)
  end = Math.min(total - 1, end)

  const tokens: PaginationToken[] = [1]
  if (start > 2) tokens.push('ellipsis')
  for (let p = start; p <= end; p++) tokens.push(p)
  if (end < total - 1) tokens.push('ellipsis')
  tokens.push(total)
  return tokens
}

export function DocumentsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') return stored
    return 'ru'
  })

  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const [types, setTypes] = useState<DocumentType[]>([])
  const [docsPage, setDocsPage] = useState<GeneratedDocumentsPage | null>(null)
  const docs = docsPage?.items ?? ([] as GeneratedDocument[])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [availableRooms, setAvailableRooms] = useState<Cabinet[] | null>(null)
  const [availableItems, setAvailableItems] = useState<InventoryItem[] | null>(null)

  const [showCabinetList, setShowCabinetList] = useState(false)
  const [cabinetSearch, setCabinetSearch] = useState('')
  const [showInventoryList, setShowInventoryList] = useState(false)
  const [inventorySearch, setInventorySearch] = useState('')

  const [showResponsibleList, setShowResponsibleList] = useState(false)
  const [responsibleSearch, setResponsibleSearch] = useState('')
  const [responsibleOptions, setResponsibleOptions] = useState<UserLookup[]>([])
  const [responsibleLoading, setResponsibleLoading] = useState(false)
  const [responsibleError, setResponsibleError] = useState<string | null>(null)

  const [filters, setFilters] = useState<Filters>(() => ({ limit: 50 }))
  const [page, setPage] = useState(1)

  const locale = useMemo(() => langToLocale(lang), [lang])

  const typeNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of types) map.set(t.code, t.name)
    return map
  }, [types])

  const cabinetOptions = useMemo(() => {
    const rooms = availableRooms ?? []
    return rooms.map((room) => {
      const label = room.name?.trim() ? room.name.trim() : `Кабинет #${room.id}`
      const metaParts = [`ID: ${room.id}`, room.room_type ? `тип: ${room.room_type}` : null, room.status ? room.status : null]
        .filter(Boolean)
        .join(' • ')
      return { id: room.id, label, meta: metaParts }
    })
  }, [availableRooms])

  const filteredCabinetOptions = useMemo(() => {
    const q = cabinetSearch.trim().toLowerCase()
    const base = cabinetOptions
    if (!q) return base.slice(0, 20)
    return base.filter((c) => `${c.id} ${c.label} ${c.meta}`.toLowerCase().includes(q)).slice(0, 20)
  }, [cabinetOptions, cabinetSearch])

  const inventoryOptions = useMemo(() => {
    const items = availableItems ?? []
    return items.map((item) => {
      const label = item.title?.trim() ? item.title.trim() : `Оборудование #${item.id}`
      const inv = item.barcode_id ? `инв: ${item.barcode_id}` : null
      const metaParts = [`ID: ${item.id}`, inv, item.status ? item.status : null].filter(Boolean).join(' • ')
      return { id: item.id, label, meta: metaParts }
    })
  }, [availableItems])

  const filteredInventoryOptions = useMemo(() => {
    const q = inventorySearch.trim().toLowerCase()
    const base = inventoryOptions
    if (!q) return base.slice(0, 20)
    return base.filter((it) => `${it.id} ${it.label} ${it.meta}`.toLowerCase().includes(q)).slice(0, 20)
  }, [inventoryOptions, inventorySearch])

  const filteredResponsibleOptions = useMemo(() => {
    const q = responsibleSearch.trim().toLowerCase()
    const base = responsibleOptions.map((u) => ({
      id: u.id,
      label: u.full_name?.trim() ? u.full_name.trim() : u.email,
      meta: `ID: ${u.id}`,
    }))
    if (!q) return base.slice(0, 20)
    return base.filter((u) => `${u.id} ${u.label} ${u.meta}`.toLowerCase().includes(q)).slice(0, 20)
  }, [responsibleOptions, responsibleSearch])

  const total = docsPage?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / filters.limit))
  const pagination = useMemo(() => buildPagination(page, totalPages), [page, totalPages])

  const doLoad = async (next?: Partial<Filters>, nextPage?: number) => {
    const effectiveFilters = { ...filters, ...next }
    const effectivePage = typeof nextPage === 'number' && Number.isFinite(nextPage) ? Math.max(1, nextPage) : page

    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      const offset = (effectivePage - 1) * effectiveFilters.limit
      const resp = await listGeneratedDocumentsPage({
        type_code: effectiveFilters.type_code?.trim() ? effectiveFilters.type_code.trim() : undefined,
        room_id: typeof effectiveFilters.room_id === 'number' ? effectiveFilters.room_id : undefined,
        equipment_id: typeof effectiveFilters.equipment_id === 'number' ? effectiveFilters.equipment_id : undefined,
        responsible_user_id:
          typeof effectiveFilters.responsible_user_id === 'number' ? effectiveFilters.responsible_user_id : undefined,
        generated_from: effectiveFilters.generated_from?.trim() ? effectiveFilters.generated_from.trim() : undefined,
        generated_to: effectiveFilters.generated_to?.trim() ? effectiveFilters.generated_to.trim() : undefined,
        limit: effectiveFilters.limit,
        offset,
      })
      setDocsPage(resp)
      setFilters(effectiveFilters)
      setPage(effectivePage)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([listDocumentTypes(), listGeneratedDocumentsPage({ limit: 50, offset: 0 })])
      .then(([typesResp, docsResp]) => {
        setTypes(typesResp)
        setDocsPage(docsResp)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (cabinetSearch.trim()) return
    if (typeof filters.room_id !== 'number') return
    const match = cabinetOptions.find((r) => r.id === filters.room_id)
    if (match) setCabinetSearch(match.label)
  }, [cabinetOptions, cabinetSearch, filters.room_id])

  useEffect(() => {
    if (inventorySearch.trim()) return
    if (typeof filters.equipment_id !== 'number') return
    const match = inventoryOptions.find((it) => it.id === filters.equipment_id)
    if (match) setInventorySearch(match.label)
  }, [filters.equipment_id, inventoryOptions, inventorySearch])

  const ensureCabinetsLoaded = async () => {
    if (availableRooms) return
    try {
      const rooms = await listCabinets()
      setAvailableRooms(rooms)
    } catch {
      // ignore (picker will stay empty)
    }
  }

  const ensureInventoryLoaded = async () => {
    if (availableItems) return
    try {
      const items = await listInventoryItems()
      setAvailableItems(items)
    } catch {
      // ignore (picker will stay empty)
    }
  }

  useEffect(() => {
    if (!showResponsibleList) return
    const q = responsibleSearch.trim()
    const handle = window.setTimeout(() => {
      setResponsibleLoading(true)
      setResponsibleError(null)
      searchUsers({ q: q || undefined, limit: 20, offset: 0 })
        .then((users) => setResponsibleOptions(users))
        .catch((e: unknown) => setResponsibleError(e instanceof Error ? e.message : 'Ошибка загрузки списка'))
        .finally(() => setResponsibleLoading(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [responsibleSearch, showResponsibleList])

  const doDownload = async (doc: GeneratedDocument, format: 'docx' | 'pdf') => {
    setError(null)
    setMessage(null)
    try {
      const blob = await downloadGeneratedDocumentFile(doc.id, format)
      saveBlob(`${doc.doc_number}.${format}`, blob)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка скачивания')
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
        active="documents"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="admin">
          <header className="admin__header">
            <div>
              <nav className="breadcrumb">
                <span>Документы</span>
              </nav>
              <h1>Документы</h1>
              <p>Фильтры: кабинет, инвентарь, ответственный и дата формирования.</p>
            </div>
            <div className="admin__actions">
              {hasSystemAdminRole() ? (
                <button type="button" className="is-primary" onClick={() => navigate('/documents/create')}>
                Создать документ
                </button>
              ) : null}
              <button type="button" onClick={() => void doLoad(undefined, page)} disabled={loading}>
                Обновить
              </button>
            </div>
          </header>

          {error ? (
            <div className="admin__hint admin__hint--error" role="alert">
              {error}
            </div>
          ) : null}
          {message ? <div className="admin__hint admin__hint--success">{message}</div> : null}

          <article className="admin__card">
            <h2>Фильтры</h2>
            <form
              className="admin__form admin__form--compact"
              onSubmit={(e) => {
                e.preventDefault()
                void doLoad(undefined, 1)
              }}
            >
              <label>
                Тип
                <select
                  value={filters.type_code ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, type_code: e.target.value || undefined }))}
                >
                  <option value="">Все</option>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Инвентарь
                <div className="inventory-user-picker">
                  <input
                    value={inventorySearch}
                    onChange={(event) => {
                      const value = event.target.value
                      setInventorySearch(value)
                      const trimmed = value.trim()
                      const parsed = trimmed ? Number(trimmed) : NaN
                      setFilters((prev) => ({ ...prev, equipment_id: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined }))
                    }}
                    onFocus={() => {
                      setShowInventoryList(true)
                      void ensureInventoryLoaded()
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setShowInventoryList(false), 120)
                    }}
                    placeholder="Начните вводить название или ID"
                  />
                  {!loading && showInventoryList && filteredInventoryOptions.length > 0 ? (
                    <div className="inventory-user-picker__list">
                      {filteredInventoryOptions.map((it) => (
                        <button
                          key={it.id}
                          type="button"
                          className="inventory-user-picker__option"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, equipment_id: it.id }))
                            setInventorySearch(it.label)
                            setShowInventoryList(false)
                          }}
                        >
                          <span className="inventory-user-picker__name">{it.label}</span>
                          <span className="inventory-user-picker__meta">{it.meta}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {typeof filters.equipment_id === 'number' ? (
                    <div className="inventory-user-picker__value">Выбрано: ID {filters.equipment_id}</div>
                  ) : null}
                </div>
              </label>

              <label>
                Кабинет
                <div className="inventory-user-picker">
                  <input
                    value={cabinetSearch}
                    onChange={(event) => {
                      const value = event.target.value
                      setCabinetSearch(value)
                      const trimmed = value.trim()
                      const parsed = trimmed ? Number(trimmed) : NaN
                      setFilters((prev) => ({ ...prev, room_id: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined }))
                    }}
                    onFocus={() => {
                      setShowCabinetList(true)
                      void ensureCabinetsLoaded()
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setShowCabinetList(false), 120)
                    }}
                    placeholder="Начните вводить название или ID"
                  />
                  {!loading && showCabinetList && filteredCabinetOptions.length > 0 ? (
                    <div className="inventory-user-picker__list">
                      {filteredCabinetOptions.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          className="inventory-user-picker__option"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, room_id: room.id }))
                            setCabinetSearch(room.label)
                            setShowCabinetList(false)
                          }}
                        >
                          <span className="inventory-user-picker__name">{room.label}</span>
                          <span className="inventory-user-picker__meta">{room.meta}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {typeof filters.room_id === 'number' ? (
                    <div className="inventory-user-picker__value">Выбрано: ID {filters.room_id}</div>
                  ) : null}
                </div>
              </label>

              <label>
                Ответственный
                <div className="inventory-user-picker">
                  <input
                    value={responsibleSearch}
                    onChange={(event) => {
                      const value = event.target.value
                      setResponsibleSearch(value)
                      const trimmed = value.trim()
                      const parsed = trimmed ? Number(trimmed) : NaN
                      setFilters((prev) => ({
                        ...prev,
                        responsible_user_id: Number.isFinite(parsed) && parsed > 0 ? parsed : undefined,
                      }))
                    }}
                    onFocus={() => {
                      setShowResponsibleList(true)
                      setResponsibleError(null)
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setShowResponsibleList(false), 120)
                    }}
                    placeholder="Начните вводить ФИО, email или ID"
                  />
                  {responsibleLoading ? <div className="inventory-user-picker__hint">Загрузка списка...</div> : null}
                  {!responsibleLoading && responsibleError ? (
                    <div className="inventory-user-picker__hint">{responsibleError}</div>
                  ) : null}
                  {!loading && showResponsibleList && filteredResponsibleOptions.length > 0 ? (
                    <div className="inventory-user-picker__list">
                      {filteredResponsibleOptions.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="inventory-user-picker__option"
                          onClick={() => {
                            setFilters((prev) => ({ ...prev, responsible_user_id: user.id }))
                            setResponsibleSearch(user.label)
                            setShowResponsibleList(false)
                          }}
                        >
                          <span className="inventory-user-picker__name">{user.label}</span>
                          <span className="inventory-user-picker__meta">{user.meta}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {typeof filters.responsible_user_id === 'number' ? (
                    <div className="inventory-user-picker__value">Выбрано: ID {filters.responsible_user_id}</div>
                  ) : null}
                </div>
              </label>

              <label>
                Дата с
                <input
                  type="date"
                  value={filters.generated_from ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, generated_from: e.target.value || undefined }))}
                />
              </label>

              <label>
                Дата по
                <input
                  type="date"
                  value={filters.generated_to ?? ''}
                  onChange={(e) => setFilters((prev) => ({ ...prev, generated_to: e.target.value || undefined }))}
                />
              </label>

              <label>
                Лимит
                <select value={String(filters.limit)} onChange={(e) => setFilters((prev) => ({ ...prev, limit: Number(e.target.value) }))}>
                  <option value="20">20</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </label>

              <div className="admin__actions">
                <button type="submit" className="is-primary" disabled={loading}>
                  Применить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const reset = { limit: 50 } as const
                    setFilters(reset)
                    setCabinetSearch('')
                    setInventorySearch('')
                    setResponsibleSearch('')
                    setResponsibleOptions([])
                    void doLoad(reset, 1)
                  }}
                  disabled={loading}
                >
                  Сбросить
                </button>
              </div>
            </form>
          </article>

          <div className="admin__table-head">
            <div>
              <strong>Сгенерированные документы</strong>
              <span>{loading ? 'Загрузка…' : `Показано: ${docs.length} из ${total} • Стр. ${page}/${totalPages}`}</span>
            </div>
            <div className="admin__actions">
              {totalPages > 1 ? (
                <nav className="pagination" aria-label="Pages">
                  {pagination.map((token, idx) => {
                    if (token === 'ellipsis') {
                      return (
                        <span key={`e-${idx}`} className="pagination__ellipsis" aria-hidden="true">
                          …
                        </span>
                      )
                    }

                    const pageNumber = token
                    const active = pageNumber === page

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`pagination__button${active ? ' pagination__button--active' : ''}`}
                        onClick={() => void doLoad(undefined, pageNumber)}
                        disabled={loading || active}
                        aria-current={active ? 'page' : undefined}
                      >
                        {pageNumber}
                      </button>
                    )
                  })}
                </nav>
              ) : null}
            </div>
          </div>

          <section className="admin__table">
            {docs.map((d) => {
              const typeName = typeNameByCode.get(d.type_code) ?? d.type_code
              const when = d.generated_at ? new Date(d.generated_at).toLocaleString(locale) : ''
              const cabinet = d.room_name ?? (typeof d.room_id === 'number' ? `#${d.room_id}` : null)
              const responsible =
                d.responsible_user_name ?? (typeof d.responsible_user_id === 'number' ? `#${d.responsible_user_id}` : null)
              const equipment = d.equipment_name ?? d.inventory_number ?? null
              return (
                <div key={d.id} className="admin__row">
                  <div className="admin__row-info">
                    <div className="admin__row-title">{d.doc_number}</div>
                    <div className="admin__row-sub">
                      {typeName}
                      {cabinet ? ` • кабинет: ${cabinet}` : ''}
                      {responsible ? ` • отв.: ${responsible}` : ''}
                      {equipment ? ` • ${equipment}` : ''}
                      {typeof d.equipment_count === 'number' ? ` • позиций: ${d.equipment_count}` : ''}
                      {when ? ` • ${when}` : ''}
                    </div>
                  </div>
                  <div className="admin__row-tags">
                    <span className="admin__status">{d.status}</span>
                    <span className="admin__status">{d.template_version}</span>
                  </div>
                  <div className="admin__row-actions">
                    <button type="button" onClick={() => navigate(`/documents/${d.id}`)}>
                      Просмотр
                    </button>
                    <button type="button" onClick={() => void doDownload(d, 'docx')}>
                      DOCX
                    </button>
                    <button type="button" onClick={() => void doDownload(d, 'pdf')}>
                      PDF
                    </button>
                  </div>
                </div>
              )
            })}

            {!loading && docs.length === 0 ? (
              <div className="admin__hint">Документов пока нет. Нажмите «Создать документ», чтобы сформировать первый.</div>
            ) : null}
          </section>
        </section>
      </main>
    </div>
  )
}
