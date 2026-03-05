import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  activateDocumentTemplate,
  archiveDocumentTemplate,
  listDocumentTemplates,
  listDocumentTypes,
  uploadDocumentTemplate,
  type DocumentTemplate,
  type DocumentType,
} from '@/shared/api/documents'

type TemplateStatusFilter = 'active' | 'archived' | 'all'

export function AdminDocumentsPage() {
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
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [typeCode, setTypeCode] = useState('ROOM_PASSPORT')
  const [version, setVersion] = useState('1.0')
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [makeActive, setMakeActive] = useState(true)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [filterStatus, setFilterStatus] = useState<TemplateStatusFilter>('active')
  const [filterTypeCode, setFilterTypeCode] = useState('')
  const [search, setSearch] = useState('')

  const reload = () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    Promise.all([listDocumentTypes(), listDocumentTemplates({ include_archived: true })])
      .then(([t, list]) => {
        setTypes(t)
        setTemplates(list)
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    reload()
  }, [])

  useEffect(() => {
    if (!types.length) return
    if (types.some((t) => t.code === typeCode)) return
    setTypeCode(types[0].code)
  }, [types, typeCode])

  const typeNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const type of types) {
      map.set(type.code, type.name)
    }
    return map
  }, [types])

  const statusLabel = (status: string) => {
    if (status === 'active') return 'Активный'
    if (status === 'archived') return 'Архивный'
    return status
  }

  const statusClassName = (status: string) => {
    if (status === 'active') return 'admin__status admin__status--active'
    if (status === 'archived') return 'admin__status admin__status--archived'
    return 'admin__status'
  }

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()

    const list = templates.filter((tpl) => {
      if (filterTypeCode && tpl.type_code !== filterTypeCode) return false
      if (filterStatus !== 'all' && tpl.status !== filterStatus) return false
      if (!query) return true

      const typeName = typeNameByCode.get(tpl.type_code) ?? ''
      const haystack = `${tpl.id} ${tpl.type_code} ${typeName} ${tpl.version} ${tpl.status} ${tpl.original_filename ?? ''}`
      return haystack.toLowerCase().includes(query)
    })

    const statusRank = (value: string) => {
      if (value === 'active') return 0
      if (value === 'archived') return 2
      return 1
    }

    const parseDate = (value?: string | null) => {
      if (!value) return 0
      const ts = Date.parse(value)
      return Number.isFinite(ts) ? ts : 0
    }

    return [...list].sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status)
      if (byStatus !== 0) return byStatus
      return parseDate(b.created_at) - parseDate(a.created_at)
    })
  }, [filterStatus, filterTypeCode, search, templates, typeNameByCode])

  const totalTemplates = templates.length
  const activeTemplates = templates.filter((t) => t.status === 'active').length
  const archivedTemplates = templates.filter((t) => t.status === 'archived').length

  const doUpload = async () => {
    if (!file) {
      setError('Выберите DOCX-файл шаблона')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const created = await uploadDocumentTemplate({
        type_code: typeCode,
        version: version.trim(),
        effective_from: effectiveFrom.trim() ? effectiveFrom.trim() : undefined,
        make_active: makeActive,
        file,
      })
      setTemplates((prev) => [created, ...prev])
      setMessage(`Загружен шаблон #${created.id}`)
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
    }
  }

  const doActivate = async (id: number) => {
    if (!window.confirm('Активировать выбранный шаблон? Все предыдущие версии этого типа будут архивированы.')) {
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await activateDocumentTemplate(id)
      setTemplates((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t.type_code === updated.type_code ? { ...t, status: 'archived' } : t))
      )
      setMessage(`Активирован шаблон #${updated.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  const doArchive = async (id: number) => {
    if (!window.confirm('Архивировать выбранный шаблон?')) {
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const updated = await archiveDocumentTemplate(id)
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setMessage(`Архивирован шаблон #${updated.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setLoading(false)
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
                <span>Администрирование / Шаблоны документов</span>
              </nav>
              <h1>Шаблоны документов</h1>
              <p>Загрузка/активация DOCX-шаблонов</p>
            </div>
            <div className="admin__actions">
              <button type="button" className="is-primary" onClick={reload} disabled={loading}>
                {loading ? 'Обновление…' : 'Обновить'}
              </button>
            </div>
          </header>

          <section className="admin__summary">
            <div>
              <div className="admin__summary-value">{totalTemplates}</div>
              <div className="admin__summary-label">Всего шаблонов</div>
            </div>
            <div>
              <div className="admin__summary-value">{activeTemplates}</div>
              <div className="admin__summary-label">Активных</div>
            </div>
            <div>
              <div className="admin__summary-value">{archivedTemplates}</div>
              <div className="admin__summary-label">Архивных</div>
            </div>
          </section>

          <details className="admin__hint admin__details">
            <summary>Документация по ключам шаблона (DOCX)</summary>
            <div className="admin__details-body">
              <div>
                <strong>Синтаксис</strong>
                <div className="admin__details-text">{`Плейсхолдер: {{ equipment.title }}`}</div>
                <div className="admin__details-text">
                  Список (каждая строка — отдельный абзац в Word, без разрыва форматированием внутри тега):
                  <pre className="admin__codeblock">{`{% for item in equipment_items %}
{{ item.id }} — {{ item.title }}
{% endfor %}`}</pre>
                </div>
              </div>
              <div>
                <strong>Общие ключи</strong>
                <div className="admin__details-text">
                  {`{{ document_number }}, {{ template_version }}, {{ generation_date }}, {{ generation_datetime }}, {{ generation_date_ru }}, {{ generation_datetime_ru }}, {{ generation_date_ru_quoted }}, {{ generation_datetime_ru_quoted }}`}
                </div>
              </div>
              <div>
                <strong>ROOM_PASSPORT</strong>
                <div className="admin__details-text">
                  {`{{ room_number }}, {{ location_name }}, {{ responsible_person }}, {{ equipment_count }}, {{ equipment_list_text }}, {{ room.* }}, {{ equipment_items }} (loop)`}
                </div>
              </div>
              <div>
                <strong>INVENTORY_CARD / TRANSFER_ACT</strong>
                <div className="admin__details-text">
                  {`{{ equipment_name }}, {{ inventory_number }}, {{ location_id }}, {{ location_name }}, {{ responsible_id }}, {{ responsible_person }}, {{ equipment.* }}`}
                </div>
              </div>
            </div>
          </details>

          {error ? (
            <div className="admin__hint admin__hint--error" role="alert">
              {error}
            </div>
          ) : null}
          {message ? <div className="admin__hint admin__hint--success">{message}</div> : null}

          <div className="admin__card admin-documents__upload-card">
            <strong>Загрузить новый шаблон</strong>
            <div className="admin__form admin-documents__upload-form">
              <label>
                Тип
                <select value={typeCode} onChange={(e) => setTypeCode(e.target.value)} disabled={loading || !types.length}>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Версия
                <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" disabled={loading} />
              </label>
              <label>
                Дата начала действия (YYYY-MM-DD)
                <input
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  placeholder="2026-02-20"
                  disabled={loading}
                />
              </label>
              <label className="admin__checkbox">
                <input type="checkbox" checked={makeActive} onChange={(e) => setMakeActive(e.target.checked)} disabled={loading} />
                Сделать активным
              </label>
              <label>
                DOCX-файл
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={loading}
                />
              </label>
              <button type="button" className="admin__submit" onClick={doUpload} disabled={loading || !types.length}>
                {loading ? 'Загрузка…' : 'Загрузить'}
              </button>
            </div>
          </div>

          <div className="admin__card admin-documents__filters-card">
            <div className="admin__table-head">
              <div>
                <h2>Шаблоны</h2>
                <span>
                  Найдено: {filteredTemplates.length} из {totalTemplates}. По умолчанию показаны активные.
                </span>
              </div>
            </div>

            <div className="admin__form admin__form--compact admin-documents__filters">
              <label>
                Поиск
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID, тип, версия, имя файла…" />
              </label>
              <label>
                Тип
                <select value={filterTypeCode} onChange={(e) => setFilterTypeCode(e.target.value)}>
                  <option value="">Все</option>
                  {types.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Статус
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as TemplateStatusFilter)}>
                  <option value="active">Активные</option>
                  <option value="archived">Архивные</option>
                  <option value="all">Все</option>
                </select>
              </label>

              <div className="admin__actions">
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setFilterTypeCode('')
                    setFilterStatus('active')
                  }}
                  disabled={loading}
                >
                  Сбросить
                </button>
                <button type="button" className="is-primary" onClick={reload} disabled={loading}>
                  {loading ? 'Обновление…' : 'Обновить'}
                </button>
              </div>
            </div>

            {loading ? <p className="admin__muted">Загрузка…</p> : null}
            {!loading && !filteredTemplates.length ? (
              <p className="admin__muted">Ничего не найдено. Попробуйте изменить фильтры.</p>
            ) : null}
          </div>

          <section className="admin__modules admin-documents__templates">
            {filteredTemplates.map((tpl) => (
              <div key={tpl.id} className="admin__module-card admin-documents__template-card">
                <strong>
                  {tpl.type_code} v{tpl.version} • #{tpl.id}
                </strong>
                <span>
                  <span className={statusClassName(tpl.status)}>{statusLabel(tpl.status)}</span>
                  {tpl.effective_from ? ` • с ${tpl.effective_from}` : ''}
                  {tpl.original_filename ? ` • ${tpl.original_filename}` : ''}
                </span>
                <div className="admin-documents__template-actions">
                  <button type="button" className={tpl.status === 'active' ? undefined : 'is-primary'} onClick={() => doActivate(tpl.id)} disabled={loading || tpl.status === 'active'}>
                    {tpl.status === 'active' ? 'Активен' : 'Активировать'}
                  </button>
                  <button type="button" onClick={() => doArchive(tpl.id)} disabled={loading || tpl.status === 'archived'}>
                    {tpl.status === 'archived' ? 'В архиве' : 'Архивировать'}
                  </button>
                </div>
              </div>
            ))}
          </section>
        </section>
      </main>
    </div>
  )
}
