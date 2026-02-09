import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type AdminSection =
  | 'cabinets'
  | 'users'
  | 'inventory'
  | 'departments'

const adminModules: { id: AdminSection; title: string; desc: string }[] = [
  { id: 'cabinets', title: 'Кабинеты', desc: 'Карточки кабинетов, ответственные, статусы.' },
  { id: 'departments', title: 'Департаменты', desc: 'Справочник отделов и привязка к локациям.' },
  { id: 'users', title: 'Пользователи', desc: 'Роли, доступы, команды.' },
  { id: 'inventory', title: 'Инвентарь', desc: 'Планы, прогресс, итоги.' },
]

export function AdminPage() {
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
        active="admin"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="admin">
          <header className="admin__header">
            <div>
              <h1>Администрирование</h1>
            </div>
          </header>

          <section className="admin__modules">
            {adminModules.map((module) => (
              <button
                key={module.id}
                type="button"
                className="admin__module-card"
                onClick={() => {
                  if (module.id === 'cabinets') {
                    navigate('/admin/cabinets')
                  }
                  if (module.id === 'departments') {
                    navigate('/admin/departments')
                  }
                  if (module.id === 'users') {
                    navigate('/admin/users')
                  }
                  if (module.id === 'inventory') {
                    navigate('/admin/inventory')
                  }
                }}
              >
                <strong>{module.title}</strong>
                <span>{module.desc}</span>
                <em>Открыть</em>
              </button>
            ))}
          </section>

        </section>
      </main>
    </div>
  )
}
