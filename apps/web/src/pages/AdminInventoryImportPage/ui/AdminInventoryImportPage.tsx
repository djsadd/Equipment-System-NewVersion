import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  confirmInventoryImport,
  confirmInventoryImportStream,
  previewInventoryImport,
  type InventoryImportConfirmResponse,
  type InventoryImportPreviewResponse,
  type InventoryImportStreamInit,
  type InventoryImportStreamRow,
} from '@/shared/api/inventory'

function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

const TEMPLATE_HEADERS = [
  'id',
  'title',
  'description',
  'category',
  'location',
  'location_id',
  'responsible_username',
  'responsible_first_name',
  'responsible_last_name',
  'status',
  'barcode_id',
  'barcode_data_12',
]

export function AdminInventoryImportPage() {
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

  const [file, setFile] = useState<File | null>(null)
  const [createMissingLocations, setCreateMissingLocations] = useState(true)
  const [createMissingUsers, setCreateMissingUsers] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [preview, setPreview] = useState<InventoryImportPreviewResponse | null>(null)
  const [importInit, setImportInit] = useState<InventoryImportStreamInit | null>(null)
  const [importRows, setImportRows] = useState<InventoryImportStreamRow[]>([])
  const [importResult, setImportResult] = useState<InventoryImportConfirmResponse | null>(null)

  const doPreview = () => {
    if (!file) {
      setError('Выберите файл CSV или XLSX.')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    setImportInit(null)
    setImportRows([])
    setImportResult(null)

    previewInventoryImport(file)
      .then((res) => {
        setPreview(res)
        setMessage('Предпросмотр готов.')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка предпросмотра'))
      .finally(() => setLoading(false))
  }

  const doImport = async () => {
    if (!file) {
      setError('Выберите файл CSV или XLSX.')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    setImportInit(null)
    setImportRows([])
    setImportResult(null)

    const options = { create_missing_locations: createMissingLocations, create_missing_users: createMissingUsers }
    try {
      const done = await confirmInventoryImportStream(file, options, {
        onInit: (data) => {
          setImportInit(data)
          setImportRows([])
        },
        onRow: (row) => {
          setImportRows((prev) => {
            const next = [...prev, row]
            return next.length > 200 ? next.slice(next.length - 200) : next
          })
        },
      })
      setImportResult(done)
      setMessage('Импорт завершен.')
    } catch {
      try {
        const done = await confirmInventoryImport(file, options)
        setImportResult(done)
        setMessage('Импорт завершен.')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Ошибка импорта')
      }
    } finally {
      setLoading(false)
    }
  }

  const templateText = useMemo(() => {
    const header = TEMPLATE_HEADERS.join(';')
    const sampleRow = [
      '',
      'Монитор Dell 24',
      'S/N ABC123',
      'Мониторы',
      'Кабинет 101',
      '',
      'user@example.com',
      'Иван',
      'Петров',
      'NEW',
      '',
      '123456789012',
    ].join(';')
    return `${header}\n${sampleRow}\n`
  }, [])

  const previewSummary = preview
    ? `Всего: ${preview.total_rows} • К созданию: ${preview.to_create_count} • Пропуск: ${preview.skip_count} • Ошибки: ${preview.error_count}`
    : null

  const importSummary = importResult
    ? `Создано: ${importResult.created_count} • Пропущено: ${importResult.skipped_count} • Ошибки: ${importResult.error_count}`
    : null

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
              <h1>Импорт инвентаря</h1>
              <p>Загрузка CSV/XLSX с предпросмотром и импортом.</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/admin')}>
                Назад
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadTextFile('inventory_import_template.csv', templateText, 'text/csv;charset=utf-8;')
                }
              >
                Скачать шаблон
              </button>
            </div>
          </header>

          {error ? <p className="admin__error">{error}</p> : null}
          {message ? <p className="admin__success">{message}</p> : null}

          <section className="admin__grid admin__grid--single">
            <div className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>Файл</h2>
                  <span>Поддерживаются: .csv, .xlsx</span>
                </div>
              </div>

              <div className="admin__form">
                <label>
                  CSV/XLSX файл
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xlsm,.xltx,.xltm"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    disabled={loading}
                  />
                </label>
                <label className="admin__checkbox">
                  <input
                    type="checkbox"
                    checked={createMissingLocations}
                    onChange={(e) => setCreateMissingLocations(e.target.checked)}
                    disabled={loading}
                  />
                  Создавать отсутствующие локации
                </label>
                <label className="admin__checkbox">
                  <input
                    type="checkbox"
                    checked={createMissingUsers}
                    onChange={(e) => setCreateMissingUsers(e.target.checked)}
                    disabled={loading}
                  />
                  Создавать отсутствующих пользователей
                </label>

                <div className="admin__actions">
                  <button type="button" className="is-primary" onClick={doPreview} disabled={loading || !file}>
                    {loading ? 'Обработка…' : 'Предпросмотр'}
                  </button>
                  <button type="button" onClick={doImport} disabled={loading || !file}>
                    {loading ? 'Импорт…' : 'Импортировать'}
                  </button>
                </div>
              </div>
            </div>

            <div className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>Предпросмотр</h2>
                  <span>{previewSummary ?? 'Сначала сделайте предпросмотр.'}</span>
                </div>
              </div>

              {preview ? (
                <div className="admin__table">
                  {preview.rows.slice(0, 50).map((row) => (
                    <div key={`${row.row_number}-${row.action}`} className="admin__row">
                      <div className="admin__row-info">
                        <div className="admin__row-title">
                          Строка #{row.row_number} • {row.action}
                        </div>
                        {row.data?.title ? <div>{row.data.title}</div> : null}
                        {row.errors?.length ? <div className="admin__error">Ошибки: {row.errors.join('; ')}</div> : null}
                        {row.warnings?.length ? (
                          <div className="admin__muted">Предупреждения: {row.warnings.join('; ')}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {preview.rows.length > 50 ? (
                    <p className="admin__muted">Показаны первые 50 строк. Остальные доступны через импорт.</p>
                  ) : null}
                </div>
              ) : (
                <p className="admin__muted">Нет данных предпросмотра.</p>
              )}
            </div>

            <div className="admin__card">
              <div className="admin__table-head">
                <div>
                  <h2>Импорт</h2>
                  <span>
                    {importSummary ??
                      (importInit ? `Всего: ${importInit.total_rows} • Ошибки: ${importInit.error_count}` : 'Ожидает.')}
                  </span>
                </div>
              </div>

              {importResult?.errors?.length ? (
                <button
                  type="button"
                  className="admin__card-action"
                  onClick={() =>
                    downloadTextFile(
                      'inventory_import_errors.json',
                      JSON.stringify(importResult.errors, null, 2),
                      'application/json;charset=utf-8;'
                    )
                  }
                >
                  Скачать ошибки (JSON)
                </button>
              ) : null}

              {importRows.length ? (
                <div className="admin__table">
                  {importRows.slice(-50).map((row) => (
                    <div key={`${row.index}-${row.row_number}`} className="admin__row">
                      <div className="admin__row-info">
                        <div className="admin__row-title">
                          {row.index}/{row.total} • строка #{row.row_number} • {row.result}
                        </div>
                        {row.title ? <div>{row.title}</div> : null}
                        {row.detail ? <div className="admin__row-sub">{row.detail}</div> : null}
                        {row.errors?.length ? <div className="admin__error">{row.errors.join('; ')}</div> : null}
                      </div>
                    </div>
                  ))}
                  <p className="admin__muted">Показаны последние 50 событий (из {importRows.length}).</p>
                </div>
              ) : (
                <p className="admin__muted">Нет событий импорта.</p>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  )
}
