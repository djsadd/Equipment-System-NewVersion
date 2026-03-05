import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import {
  downloadGeneratedDocumentFile,
  getGeneratedDocument,
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

function langToLocale(lang: Lang) {
  if (lang === 'kk') return 'kk-KZ'
  if (lang === 'id') return 'de-DE'
  if (lang === 'en') return 'en-US'
  return 'ru-RU'
}

export function DocumentsDetailPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') return stored
    return 'ru'
  })

  const navigate = useNavigate()
  const { id } = useParams()

  const t = useMemo(() => dashboardCopy[lang], [lang])
  const locale = useMemo(() => langToLocale(lang), [lang])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const documentId = Number(id)
  const validId = Number.isFinite(documentId) && documentId > 0

  const [types, setTypes] = useState<DocumentType[]>([])
  const typeNameByCode = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of types) map.set(t.code, t.name)
    return map
  }, [types])

  const [doc, setDoc] = useState<GeneratedDocument | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  useEffect(() => {
    if (!validId) {
      setError('Некорректный идентификатор документа')
      return
    }

    setLoading(true)
    setError(null)
    Promise.all([listDocumentTypes(), getGeneratedDocument(documentId)])
      .then(([typesResp, docResp]) => {
        setTypes(typesResp)
        setDoc(docResp)
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Ошибка загрузки документа')
      })
      .finally(() => setLoading(false))
  }, [documentId, validId])

  useEffect(() => {
    if (!validId) return
    if (!doc) return

    setPdfLoading(true)
    setPdfError(null)

    let nextUrl: string | null = null
    downloadGeneratedDocumentFile(documentId, 'pdf')
      .then((blob) => {
        nextUrl = URL.createObjectURL(blob)
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return nextUrl
        })
      })
      .catch((e: unknown) => {
        setPdfUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
        setPdfError(e instanceof Error ? e.message : 'PDF не доступен')
      })
      .finally(() => setPdfLoading(false))

    return () => {
      if (nextUrl) URL.revokeObjectURL(nextUrl)
    }
  }, [doc, documentId, validId])

  const doDownload = async (format: 'docx' | 'pdf') => {
    if (!doc) return
    setError(null)
    try {
      const blob = await downloadGeneratedDocumentFile(doc.id, format)
      saveBlob(`${doc.doc_number}.${format}`, blob)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка скачивания')
    }
  }

  const when = doc?.generated_at ? new Date(doc.generated_at).toLocaleString(locale) : '—'
  const typeName = doc ? typeNameByCode.get(doc.type_code) ?? doc.type_code : '—'
  const cabinet = doc?.room_name ?? (typeof doc?.room_id === 'number' ? `#${doc.room_id}` : '—')
  const responsible =
    doc?.responsible_user_name ?? (typeof doc?.responsible_user_id === 'number' ? `#${doc.responsible_user_id}` : '—')

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
                <span>
                  Документы / {doc?.doc_number ?? (validId ? `#${documentId}` : '—')}
                </span>
              </nav>
              <h1>{doc?.doc_number ?? 'Документ'}</h1>
              <p>{doc ? `${typeName} • сформирован: ${when}` : 'Загрузка…'}</p>
            </div>
            <div className="admin__actions">
              <button type="button" onClick={() => navigate('/documents')}>
                Назад
              </button>
              <button type="button" onClick={() => void doDownload('docx')} disabled={!doc || loading}>
                DOCX
              </button>
              <button type="button" onClick={() => void doDownload('pdf')} disabled={!doc || loading}>
                PDF
              </button>
            </div>
          </header>

          {error ? (
            <div className="admin__hint admin__hint--error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="admin__grid admin__grid--single">
            <article className="admin__card">
              <h2>Детали</h2>
              <div className="document-meta">
                <div className="document-meta__item">
                  <span>Тип</span>
                  <strong>{typeName}</strong>
                </div>
                <div className="document-meta__item">
                  <span>Статус</span>
                  <strong>{doc?.status ?? '—'}</strong>
                </div>
                <div className="document-meta__item">
                  <span>Шаблон</span>
                  <strong>{doc ? `${doc.template_version} (id ${doc.template_id})` : '—'}</strong>
                </div>
                <div className="document-meta__item">
                  <span>Кабинет</span>
                  <strong>{cabinet}</strong>
                </div>
                <div className="document-meta__item">
                  <span>Ответственный</span>
                  <strong>{responsible}</strong>
                </div>
                <div className="document-meta__item">
                  <span>Основание</span>
                  <strong>{doc ? `${doc.target_type}:${doc.target_id}` : '—'}</strong>
                </div>
              </div>

              {doc?.notes?.trim() ? (
                <div>
                  <strong>Примечание</strong>
                  <div className="admin__details-text">{doc.notes}</div>
                </div>
              ) : null}
            </article>

            <article className="admin__card">
              <h2>Предпросмотр (PDF)</h2>
              {pdfLoading ? <div className="admin__hint">Загрузка PDF…</div> : null}
              {!pdfLoading && pdfError ? (
                <div className="admin__hint admin__hint--error" role="alert">
                  {pdfError}
                </div>
              ) : null}
              {!pdfLoading && !pdfError && pdfUrl ? (
                <div className="document-preview">
                  <iframe className="document-preview__frame" src={pdfUrl} title="document preview" />
                </div>
              ) : null}
              {!pdfLoading && !pdfError && !pdfUrl ? (
                <div className="admin__hint">PDF не найден. Скачайте DOCX или пересоздайте документ с опцией «Генерировать PDF».</div>
              ) : null}
            </article>
          </div>
        </section>
      </main>
    </div>
  )
}
