import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type NotificationType = 'system' | 'alert' | 'info' | 'task'

const notifications: {
  title: string
  message: string
  time: string
  type: NotificationType
}[] = [
  {
    title: 'Списание оборудования',
    message: 'Подтвердите акт списания по заявке #2419.',
    time: 'Сегодня, 09:40',
    type: 'alert',
  },
  {
    title: 'Инвентаризация кабинета 203',
    message: 'Осталось 2 позиции для сверки.',
    time: 'Сегодня, 08:15',
    type: 'task',
  },
  {
    title: 'Новый запрос на выдачу',
    message: 'Сотрудник Диана Ш. запросила ноутбук.',
    time: 'Вчера, 17:30',
    type: 'info',
  },
  {
    title: 'Обновление системы',
    message: 'Запланировано обновление в 22:00.',
    time: 'Вчера, 12:05',
    type: 'system',
  },
]

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
  const [reportsOpen, setReportsOpen] = useState(false)
  const [filter, setFilter] = useState<NotificationType | 'all'>('all')
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const filtered = notifications.filter((item) => (filter === 'all' ? true : item.type === filter))

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
            <button className="notify__primary" type="button">
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
            {filtered.map((item) => (
              <article key={`${item.title}-${item.time}`} className="notify__card">
                <div className={`notify__badge is-${item.type}`}>{typeLabel[item.type]}</div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                </div>
                <span className="notify__time">{item.time}</span>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
