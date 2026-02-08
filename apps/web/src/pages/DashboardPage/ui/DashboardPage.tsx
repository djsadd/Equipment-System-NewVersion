import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const cardIcons = [
  <svg viewBox="0 0 64 64" aria-hidden key="case">
    <rect x="14" y="20" width="36" height="28" rx="4" />
    <path d="M24 20v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
    <path d="M32 28v12" />
    <path d="M26 34h12" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="shield">
    <path d="M32 10l18 6v14c0 12-8 20-18 24-10-4-18-12-18-24V16l18-6z" />
    <path d="M32 22v14" />
    <path d="M25 29h14" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="monitor">
    <rect x="12" y="18" width="40" height="24" rx="4" />
    <rect x="26" y="44" width="12" height="4" rx="2" />
    <circle cx="32" cy="30" r="6" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="warn">
    <path d="M32 10l22 40H10l22-40z" />
    <path d="M32 26v10" />
    <circle cx="32" cy="40" r="2" />
  </svg>,
]

export function DashboardPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
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
        active="dashboard"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <header className="dashboard__header">
          <h1>{t.title}</h1>
          <p>{t.greeting}</p>
        </header>

        <section className="dashboard__cards">
          {t.cards.map((title, index) => (
            <article key={title}>
              <div className="dashboard__card-title">{title}</div>
              <div className="dashboard__card-icon">{cardIcons[index]}</div>
            </article>
          ))}
        </section>

        <section className="dashboard__stats">
          {t.quick.map((stat) => (
            <div key={stat.label}>
              <div className="dashboard__stat-value">{stat.value}</div>
              <div className="dashboard__stat-label">{stat.label}</div>
            </div>
          ))}
        </section>

        <section className="dashboard__panels">
          {t.panels.map((panel) => (
            <article key={panel.title}>
              <header>
                <strong>{panel.title}</strong>
                <button type="button">
                  {panel.hint}
                  <span>»</span>
                </button>
              </header>
              <div className="dashboard__panel-body">
                {panel.rows.map((row) => (
                  <div key={row.label}>
                    <div className="dashboard__panel-value">{row.value}</div>
                    <div className="dashboard__panel-label">{row.label}</div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
