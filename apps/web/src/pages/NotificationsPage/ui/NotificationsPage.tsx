import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listNotifications, markAllRead, type Notification, type NotificationType } from '@/shared/api/notifications'

const typeLabel: Record<NotificationType, string> = {
  system: 'Система',
  alert: 'Важное',
  info: 'Инфо',
  task: 'Задача',
}

export function NotificationsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const [items, setItems] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const locale =
    lang === 'ru' ? 'ru-RU' : lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-US' : 'id-ID'

  const formatTime = (value?: string | null) => {
    if (!value) return ''
    const dt = new Date(value)
    if (Number.isNaN(dt.getTime())) return ''
    return dt.toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    listNotifications({ limit: 200 })
      .then((data) => {
        if (cancelled) return
        setItems(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Ошибка загрузки уведомлений')
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const filtered = items.filter((item) => (filter === 'all' ? true : item.type === filter))

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
        active="notifications"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="notify">
          <header className="notify__header">
            <div>
              <h1>Уведомления</h1>
              <p>Системные события, задачи и важные сообщения.</p>
            </div>
            <button
              className="notify__primary"
              type="button"
              onClick={() => {
                setIsLoading(true)
                setError(null)
                markAllRead()
                  .then(() => listNotifications({ limit: 200 }))
                  .then((data) => setItems(data))
                  .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка'))
                  .finally(() => setIsLoading(false))
              }}
            >
              Отметить все прочитанными
            </button>
          </header>

          <div className="notify__filters">
            {(['all', 'alert', 'task', 'info', 'system'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={filter === type ? 'is-active' : undefined}
                onClick={() => setFilter(type)}
              >
                {type === 'all' ? 'Все' : typeLabel[type]}
              </button>
            ))}
          </div>

          <div className="notify__list">
            {error ? <div className="notify__card">{error}</div> : null}
            {isLoading ? <div className="notify__card">Загрузка…</div> : null}
            {!isLoading && !error && filtered.length === 0 ? (
              <div className="notify__card">Нет уведомлений</div>
            ) : null}
            {filtered.map((item) => (
              <article key={item.id} className="notify__card">
                <div className={`notify__badge is-${item.type}`}>{typeLabel[item.type]}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                </div>
                <span className="notify__time">{formatTime(item.created_at)}</span>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
