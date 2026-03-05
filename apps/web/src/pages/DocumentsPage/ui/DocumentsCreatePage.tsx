import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import { listInventoryItems, type InventoryItem } from '@/shared/api/inventory'
import { lookupUsers, searchUsers, type UserLookup } from '@/shared/api/auth'
import { getInventoryStatusLabel } from '@/shared/lib/inventoryStatus'
import {
  downloadGeneratedDocumentFile,
  generateDocument,
  generateDocumentBatch,
  listDocumentTypes,
  type DocumentType,
  type GeneratedDocument,
} from '@/shared/api/documents'

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

function getUserLabel(user: UserLookup) {
  const fullName = user.full_name?.trim()
  if (fullName) return fullName
  return user.email
}

function getUserMeta(user: UserLookup) {
  const parts = [`ID: ${user.id}`]
  const fullName = user.full_name?.trim()
  if (fullName && user.email) parts.push(user.email)
  if (!user.is_active) parts.push('неактивен')
  return parts.join(' • ')
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const result: T[][] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    result.push(items.slice(i, i + chunkSize))
  }
  return result
}

export function DocumentsCreatePage() {
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
  const [rooms, setRooms] = useState<Cabinet[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])

  const [typeCode, setTypeCode] = useState<string>('ROOM_PASSPORT')
  const [targetType, setTargetType] = useState<'room' | 'equipment'>('room')
  const [targetId, setTargetId] = useState<number | null>(null)
  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<number[]>([])
  const [includePdf, setIncludePdf] = useState(true)
  const [notes, setNotes] = useState('')
  const [toRoomId, setToRoomId] = useState<number | null>(null)
  const [toResponsibleIdText, setToResponsibleIdText] = useState('')
  const [toResponsibleUser, setToResponsibleUser] = useState<UserLookup | null>(null)
  const [toResponsibleSearch, setToResponsibleSearch] = useState('')
  const [showToResponsibleList, setShowToResponsibleList] = useState(false)
  const [toResponsibleLoading, setToResponsibleLoading] = useState(false)
  const [toResponsibleError, setToResponsibleError] = useState<string | null>(null)
  const [toResponsibleOptions, setToResponsibleOptions] = useState<UserLookup[]>([])
  const [usersById, setUsersById] = useState<Record<number, UserLookup>>({})
  const usersByIdRef = useRef(usersById)
  useEffect(() => {
    usersByIdRef.current = usersById
  }, [usersById])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDocument[]>([])

  const roomsById = useMemo(() => {
    const map = new Map<number, Cabinet>()
    for (const r of rooms) map.set(r.id, r)
    return map
  }, [rooms])

  const selectedEquipmentSet = useMemo(() => new Set(selectedEquipmentIds), [selectedEquipmentIds])
  const selectedEquipmentItems = useMemo(
    () => items.filter((it) => selectedEquipmentSet.has(it.id)),
    [items, selectedEquipmentSet]
  )

  const visibleEquipmentItems = useMemo(() => {
    const query = equipmentSearch.trim().toLowerCase()
    if (!query) return items
    return items.filter((it) => {
      const title = it.title.toLowerCase()
      const category = (it.category ?? '').toLowerCase()
      const id = String(it.id)
      return title.includes(query) || category.includes(query) || id.includes(query)
    })
  }, [items, equipmentSearch])

  const visibleEquipmentIds = useMemo(() => visibleEquipmentItems.map((it) => it.id), [visibleEquipmentItems])
  const isAllVisibleEquipmentSelected =
    visibleEquipmentIds.length > 0 && visibleEquipmentIds.every((id) => selectedEquipmentSet.has(id))

  useEffect(() => {
    if (visibleEquipmentItems.length === 0) return

    const firstPage = visibleEquipmentItems.slice(0, 150)
    const ids = Array.from(
      new Set(
        firstPage
          .map((it) => (typeof it.responsible_id === 'number' ? it.responsible_id : null))
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
      )
    )

    const missing = ids.filter((id) => !usersByIdRef.current[id])
    if (missing.length === 0) return

    let cancelled = false
    void (async () => {
      const chunks = chunkArray(missing, 50)
      const loaded: UserLookup[] = []
      for (const part of chunks) {
        try {
          const users = await lookupUsers(part)
          loaded.push(...users)
        } catch {
          // ignore
        }
      }
      if (cancelled || loaded.length === 0) return
      setUsersById((prev) => {
        const next: Record<number, UserLookup> = { ...prev }
        for (const u of loaded) next[u.id] = u
        return next
      })
    })()

    return () => {
      cancelled = true
    }
  }, [visibleEquipmentItems])

  const filteredToResponsibleOptions = useMemo(() => {
    const q = toResponsibleSearch.trim().toLowerCase()
    const base = toResponsibleOptions.map((u) => ({
      id: u.id,
      label: getUserLabel(u),
      meta: getUserMeta(u),
      raw: u,
    }))
    if (!q) return base.slice(0, 20)
    return base.filter((u) => `${u.id} ${u.label} ${u.meta}`.toLowerCase().includes(q)).slice(0, 20)
  }, [toResponsibleOptions, toResponsibleSearch])

  useEffect(() => {
    setError(null)
    setMessage(null)
    setLoading(true)

    Promise.all([listDocumentTypes(), listCabinets(), listInventoryItems()])
      .then(([typesResp, roomsResp, itemsResp]) => {
        setTypes(typesResp)
        setRooms(roomsResp)
        setItems(itemsResp)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки')
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (typeCode !== 'TRANSFER_ACT') return
    if (!showToResponsibleList) return
    const q = toResponsibleSearch.trim()
    const handle = window.setTimeout(() => {
      setToResponsibleLoading(true)
      setToResponsibleError(null)
      searchUsers({ q: q || undefined, limit: 20, offset: 0 })
        .then((users) => setToResponsibleOptions(users))
        .catch((e: unknown) =>
          setToResponsibleError(e instanceof Error ? e.message : 'Ошибка загрузки списка пользователей')
        )
        .finally(() => setToResponsibleLoading(false))
    }, 250)
    return () => window.clearTimeout(handle)
  }, [showToResponsibleList, toResponsibleSearch, typeCode])

  useEffect(() => {
    if (typeCode === 'ROOM_PASSPORT') {
      setTargetType('room')
      if (rooms.length > 0) setTargetId(rooms[0]?.id ?? null)
      setToRoomId(null)
      setToResponsibleIdText('')
      setToResponsibleUser(null)
      setToResponsibleSearch('')
      setShowToResponsibleList(false)
      setToResponsibleOptions([])
      return
    }
    setTargetType('equipment')

    if (typeCode !== 'TRANSFER_ACT') {
      setToRoomId(null)
      setToResponsibleIdText('')
      setToResponsibleUser(null)
      setToResponsibleSearch('')
      setShowToResponsibleList(false)
      setToResponsibleOptions([])
    } else if (rooms.length > 0 && toRoomId == null) {
      setToRoomId(rooms[0]?.id ?? null)
    }

    if (items.length === 0) {
      setTargetId(null)
    }
    if (items.length > 0 && selectedEquipmentIds.length === 0) {
      const first = items[0]?.id
      if (typeof first === 'number') setSelectedEquipmentIds([first])
    }
  }, [typeCode, rooms, items, selectedEquipmentIds.length, toRoomId])

  const selectedTypeName = types.find((t) => t.code === typeCode)?.name ?? typeCode

  useEffect(() => {
    if (items.length === 0) return
    setSelectedEquipmentIds((prev) => {
      const existing = new Set(items.map((it) => it.id))
      const next = prev.filter((id) => existing.has(id))
      if (targetType === 'equipment' && next.length === 0) {
        const first = items[0]?.id
        return typeof first === 'number' ? [first] : []
      }
      return next
    })
  }, [items, targetType])

  const toggleEquipment = (itemId: number) => {
    setSelectedEquipmentIds((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]))
  }

  const toggleAllVisibleEquipment = () => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev)
      const everySelected = visibleEquipmentIds.length > 0 && visibleEquipmentIds.every((id) => next.has(id))
      if (everySelected) {
        for (const id of visibleEquipmentIds) next.delete(id)
      } else {
        for (const id of visibleEquipmentIds) next.add(id)
      }
      return Array.from(next)
    })
  }

  const doGenerate = async () => {
    setGeneratedDocs([])
    setError(null)
    setMessage(null)
    setLoading(true)
    try {
      if (targetType === 'room') {
        if (!targetId) {
          setError('Выберите аудиторию')
          return
        }
        const doc = await generateDocument({
          type_code: typeCode,
          target_type: targetType,
          target_id: targetId,
          notes: notes.trim() ? notes.trim() : undefined,
          include_pdf: includePdf,
        })
        setGeneratedDocs([doc])
        setMessage(`Сформирован документ ${doc.doc_number}`)
        return
      }

      const equipmentIds = items.length > 0 ? selectedEquipmentIds : targetId ? [targetId] : []
      if (equipmentIds.length === 0) {
        setError('Выберите оборудование')
        return
      }

      const toResponsibleId = Number(toResponsibleIdText)
      const toResponsibleIdValue = Number.isFinite(toResponsibleId) && toResponsibleId > 0 ? toResponsibleId : undefined
      const toRoomIdValue = typeof toRoomId === 'number' && toRoomId > 0 ? toRoomId : undefined

      if (typeCode === 'TRANSFER_ACT' && equipmentIds.length > 1) {
        const doc = await generateDocumentBatch({
          type_code: typeCode,
          target_type: targetType,
          target_ids: equipmentIds,
          to_room_id: toRoomIdValue,
          to_responsible_id: toResponsibleIdValue,
          notes: notes.trim() ? notes.trim() : undefined,
          include_pdf: includePdf,
        })
        setGeneratedDocs([doc])
        setMessage(`Сформирован документ ${doc.doc_number}`)
        return
      }

      const docs: GeneratedDocument[] = []
      for (const id of equipmentIds) {
        const doc = await generateDocument({
          type_code: typeCode,
          target_type: targetType,
          target_id: id,
          to_room_id: typeCode === 'TRANSFER_ACT' ? toRoomIdValue : undefined,
          to_responsible_id: typeCode === 'TRANSFER_ACT' ? toResponsibleIdValue : undefined,
          notes: notes.trim() ? notes.trim() : undefined,
          include_pdf: includePdf,
        })
        docs.push(doc)
      }

      setGeneratedDocs(docs)
      if (docs.length === 1) {
        setMessage(`Сформирован документ ${docs[0]!.doc_number}`)
      } else {
        setMessage(`Сформировано документов: ${docs.length}`)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации')
    } finally {
      setLoading(false)
    }
  }

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

  const doLookupToResponsible = async (idText: string) => {
    const id = Number(idText)
    if (!Number.isFinite(id) || id <= 0) {
      setToResponsibleUser(null)
      return
    }
    try {
      const users = await lookupUsers([id])
      setToResponsibleUser(users[0] ?? null)
    } catch {
      setToResponsibleUser(null)
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
                <span>Документы / Создание</span>
              </nav>
              <h1>Создать документ</h1>
              <p>Сформируйте DOCX (и опционально PDF) по данным системы.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/documents')}>
                К списку
              </button>
            </div>
          </header>

          {error ? (
            <div className="admin__hint" style={{ borderColor: '#ff6b6b' }}>
              {error}
            </div>
          ) : null}
          {message ? <div className="admin__hint">{message}</div> : null}

          <section className="admin__grid admin__grid--single">
            <article className="admin__card">
              <h2>{selectedTypeName}</h2>
              <form
                className="admin__form"
                onSubmit={(e) => {
                  e.preventDefault()
                  void doGenerate()
                }}
              >
                <label>
                  Тип документа
                  <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)}>
                    {types.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                    {types.length === 0 ? (
                      <>
                        <option value="TRANSFER_ACT">TRANSFER_ACT</option>
                        <option value="ROOM_PASSPORT">ROOM_PASSPORT</option>
                        <option value="INVENTORY_CARD">INVENTORY_CARD</option>
                      </>
                    ) : null}
                  </select>
                </label>

                {targetType === 'room' ? (
                  <label>
                    Аудитория (комната)
                    <select value={targetId ?? ''} onChange={(e) => setTargetId(Number(e.target.value))}>
                      {rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} (id={r.id})
                        </option>
                      ))}
                    </select>
                 </label>
               ) : (
                  <>
                    {typeCode === 'TRANSFER_ACT' ? (
                      <div className="admin__grid admin__grid--two" style={{ marginBottom: 12 }}>
                        <label>
                          Куда (аудитория)
                          <select
                            value={toRoomId ?? ''}
                            onChange={(e) => setToRoomId(e.target.value ? Number(e.target.value) : null)}
                          >
                            <option value="">— не выбрано —</option>
                            {rooms.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name} (id={r.id})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Новый ответственный
                          <div className="inventory-user-picker">
                            <input
                              value={toResponsibleSearch}
                              onChange={(event) => {
                                const value = event.target.value
                                setToResponsibleSearch(value)
                                const trimmed = value.trim()
                                const parsed = trimmed ? Number(trimmed) : NaN
                                setToResponsibleIdText(
                                  Number.isFinite(parsed) && parsed > 0 ? String(Math.trunc(parsed)) : ''
                                )
                                setToResponsibleUser(null)
                              }}
                              onFocus={() => {
                                setShowToResponsibleList(true)
                                setToResponsibleError(null)
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== 'Enter') return
                                event.preventDefault()
                                setShowToResponsibleList(false)
                                void doLookupToResponsible(toResponsibleIdText)
                              }}
                              onBlur={() => {
                                window.setTimeout(() => setShowToResponsibleList(false), 120)
                              }}
                              placeholder="Начните вводить ФИО, email или ID"
                            />
                            {toResponsibleLoading ? (
                              <div className="inventory-user-picker__hint">Загрузка списка...</div>
                            ) : null}
                            {!toResponsibleLoading && toResponsibleError ? (
                              <div className="inventory-user-picker__hint">{toResponsibleError}</div>
                            ) : null}
                            {!loading && showToResponsibleList && filteredToResponsibleOptions.length > 0 ? (
                              <div className="inventory-user-picker__list">
                                {filteredToResponsibleOptions.map((user) => (
                                  <button
                                    key={user.id}
                                    type="button"
                                    className="inventory-user-picker__option"
                                    onClick={() => {
                                      setToResponsibleIdText(String(user.id))
                                      setToResponsibleUser(user.raw)
                                      setToResponsibleSearch(user.label)
                                      setShowToResponsibleList(false)
                                    }}
                                  >
                                    <span className="inventory-user-picker__name">{user.label}</span>
                                    <span className="inventory-user-picker__meta">{user.meta}</span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                            {toResponsibleIdText.trim() ? (
                              <div className="inventory-user-picker__value">
                                Выбрано: ID {toResponsibleIdText}
                                {toResponsibleUser ? ` (${getUserLabel(toResponsibleUser)})` : ''}
                              </div>
                            ) : null}
                          </div>
                        </label>
                      </div>
                    ) : null}

                    <label>
                      Оборудование
                      {items.length > 0 ? (
                        <>
                          <input
                            value={equipmentSearch}
                            onChange={(e) => setEquipmentSearch(e.target.value)}
                            placeholder="Поиск: название, категория или ID"
                          />

                          <div className="inventory__table-card inventory-move__table-card">
                            <div className="inventory-move__table-head">
                              <label className="inventory-move__check">
                                <input
                                  type="checkbox"
                                  checked={isAllVisibleEquipmentSelected}
                                  onChange={toggleAllVisibleEquipment}
                                />
                              </label>
                              <span>Наименование</span>
                              <span>Категория</span>
                              <span>Статус</span>
                              <span>Локация</span>
                              <span>Ответственный</span>
                            </div>

                            {visibleEquipmentItems.length === 0 ? (
                              <div className="inventory-move__table-row">
                                <span />
                                <span>Ничего не найдено</span>
                                <span />
                                <span />
                                <span />
                                <span />
                              </div>
                            ) : (
                              visibleEquipmentItems.slice(0, 150).map((it) => {
                                const locationName = it.location_id ? roomsById.get(it.location_id)?.name : null
                                const responsibleUser =
                                  typeof it.responsible_id === 'number' && it.responsible_id > 0
                                    ? usersById[it.responsible_id]
                                    : undefined
                                return (
                                  <div
                                    key={it.id}
                                    className="inventory-move__table-row"
                                    onClick={() => toggleEquipment(it.id)}
                                  >
                                    <label className="inventory-move__check" onClick={(event) => event.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedEquipmentSet.has(it.id)}
                                        onChange={() => toggleEquipment(it.id)}
                                      />
                                    </label>
                                    <span>{it.title}</span>
                                    <span>{it.category || '—'}</span>
                                    <span>{it.status ? getInventoryStatusLabel(it.status) : '—'}</span>
                                    <span>
                                      {locationName ? locationName : '—'}
                                    </span>
                                    <span>
                                      {responsibleUser ? getUserLabel(responsibleUser) : '—'}
                                    </span>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <p>Выбрано: {selectedEquipmentIds.length}</p>
                            {selectedEquipmentItems.length > 0 ? (
                              <div className="inventory-move__selected">
                                <div className="inventory-move__selected-title">Список оборудования</div>
                                <div className="inventory-move__selected-list">
                                  {selectedEquipmentItems.slice(0, 50).map((it) => (
                                    <div key={it.id} className="inventory-move__selected-item">
                                      <span className="inventory-move__selected-name">{it.title}</span>
                                      <span className="inventory-move__selected-meta">ID {it.id}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <input
                          type="number"
                          value={targetId ?? ''}
                          onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : null)}
                          placeholder="Например: 123"
                        />
                      )}
                    </label>
                  </>
                )}

                <label>
                  Примечание
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                </label>

                <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input type="checkbox" checked={includePdf} onChange={(e) => setIncludePdf(e.target.checked)} />
                  Генерировать PDF
                </label>

                <div className="admin__actions" style={{ justifyContent: 'flex-start' }}>
                  <button type="submit" className="is-primary" disabled={loading}>
                    {loading ? 'Подождите…' : 'Сформировать'}
                  </button>
                  <button type="button" onClick={() => navigate('/documents')} disabled={loading}>
                    Отмена
                  </button>
                </div>
              </form>

              {generatedDocs.length > 0 ? (
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {generatedDocs.map((doc) => (
                    <div className="admin__row" key={doc.id}>
                      <div className="admin__row-info">
                        <div className="admin__row-title">{doc.doc_number}</div>
                        <div className="admin__row-sub">
                          {doc.type_code} • {doc.target_type}:{doc.target_id}
                        </div>
                      </div>
                      <div className="admin__row-actions">
                        <button type="button" onClick={() => doDownload(doc, 'docx')}>
                          DOCX
                        </button>
                        <button type="button" onClick={() => doDownload(doc, 'pdf')}>
                          PDF
                        </button>
                        <button type="button" onClick={() => navigate('/documents')}>
                          В список
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          </section>

          <details className="admin__hint" style={{ cursor: 'default' }}>
            <summary style={{ cursor: 'pointer' }}>Документация по ключам шаблона (DOCX)</summary>
            <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
              <div>
                <strong>Как писать плейсхолдеры</strong>
                <div style={{ marginTop: 6 }}>
                  <div>{`Пример: {{ equipment.title }}, {{ room_number }}, {{ generation_date }}`}</div>
                  <div style={{ marginTop: 6 }}>
                    Для списков можно использовать Jinja2-блоки. Важно: в DOCX <strong>каждый тег должен быть отдельным абзацем</strong>{' '}
                    (нажми Enter), и теги не должны быть «разорваны» форматированием (жирный/курсив внутри тега ломает парсинг):
                    <pre style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{`{% for item in equipment_items %}
{{ item.id }} — {{ item.title }}
{% endfor %}`}</pre>
                    Если «не работает», обычно причина в том, что Word разбил строку на несколько runs. Решение: выдели целиком строку с тегом
                    и назначь один стиль/шрифт без частичного форматирования.
                  </div>
                </div>
              </div>

              <div>
                <strong>Базовые переменные</strong>
                <ul style={{ marginTop: 6 }}>
                  <li>{`{{ doc_number }}`}: номер документа</li>
                  <li>{`{{ type_code }}`}: код типа</li>
                  <li>{`{{ template_id }}`}: id шаблона</li>
                  <li>{`{{ template_version }}`}: версия шаблона</li>
                  <li>{`{{ generation_date }}`}: дата генерации (YYYY-MM-DD)</li>
                  <li>{`{{ generation_datetime }}`}: дата/время (ISO)</li>
                  <li>{`{{ generation_date_ru }}`}: дата генерации (например, 20 февраля 2026 г.)</li>
                  <li>{`{{ generation_datetime_ru }}`}: дата/время (например, 20 февраля 2026 г. 14:53)</li>
                  <li>{`{{ generation_date_ru_quoted }}`}: дата (например, «20» февраля 2026 г.)</li>
                  <li>{`{{ generation_datetime_ru_quoted }}`}: дата/время (например, «20» февраля 2026 г. 14:53)</li>
                </ul>
              </div>

              <div>
                <strong>ROOM_PASSPORT (паспорт аудитории)</strong>
                <ul style={{ marginTop: 6 }}>
                  <li>{`{{ room_number }}`}: номер/название комнаты</li>
                  <li>{`{{ location_name }}`}: название локации (как правило = room.name)</li>
                  <li>{`{{ responsible_person }}`}: ФИО ответственного (если доступно)</li>
                  <li>{`{{ equipment_count }}`}: количество оборудования</li>
                  <li>{`{{ equipment_list_text }}`}: список оборудования текстом</li>
                  <li>
                    {`{{ room.* }}`}: объект комнаты (как отдаёт cabinets-service), напр. {`{{ room.name }}`}
                  </li>
                  <li>
                    {`{{ equipment_items }}`}: список оборудования (как отдаёт inventory-service); поля напр.{' '}
                    {` {{ item.id }}, {{ item.title }}, {{ item.location_id }}, {{ item.responsible_id }}`}
                  </li>
                </ul>
              </div>

              <div>
                <strong>INVENTORY_CARD / TRANSFER_ACT (по оборудованию)</strong>
                <ul style={{ marginTop: 6 }}>
                  <li>{`{{ equipment_name }}`}: название оборудования</li>
                  <li>{`{{ inventory_number }}`}: сейчас это barcode_id из inventory-service</li>
                  <li>{`{{ location_id }}`}: location_id оборудования</li>
                  <li>{`{{ location_name }}`}: название локации (если доступно)</li>
                  <li>{`{{ responsible_id }}`}: responsible_id оборудования</li>
                  <li>{`{{ responsible_person }}`}: ФИО ответственного (если доступно)</li>
                  <li>{`{{ equipment_count }}`}: количество оборудования (для TRANSFER_ACT при множественном выборе)</li>
                  <li>{`{{ equipment_list_text }}`}: список оборудования текстом (для TRANSFER_ACT при множественном выборе)</li>
                  <li>{`{{ to_room_id }}`}: куда перемещается (аудитория), id</li>
                  <li>{`{{ to_room_number }}`}: куда перемещается (название/номер аудитории)</li>
                  <li>{`{{ to_location_name }}`}: куда перемещается (название аудитории, если доступно)</li>
                  <li>{`{{ to_responsible_id }}`}: новый ответственный, id</li>
                  <li>{`{{ to_responsible_person }}`}: ФИО нового ответственного (если доступно)</li>
                  <li>
                    {`{{ equipment.* }}`}: объект оборудования, напр. {`{{ equipment.title }}`}, {`{{ equipment.description }}`},{' '}
                    {`{{ equipment.inventory_type_id }}`}
                  </li>
                  <li>
                    {`{{ equipment_items }}`}: тоже доступен (список из 1 элемента), чтобы можно было использовать цикл{' '}
                    {`{% for item in equipment_items %} ... {% endfor %}`} даже для одного оборудования
                  </li>
                </ul>
              </div>

              <div style={{ opacity: 0.85 }}>
                Примечание: если нужен {`{{ responsible_person }}`} (ФИО), сейчас сервис отдаёт только `responsible_id`. Можно добавить
                расширение: подтягивать ФИО по ID из auth/кадрового сервиса.
              </div>
            </div>
          </details>
        </section>
      </main>
    </div>
  )
}
