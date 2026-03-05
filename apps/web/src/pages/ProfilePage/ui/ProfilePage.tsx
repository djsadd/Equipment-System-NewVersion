import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'

function getDisplayName(user: CurrentUser) {
  const fullName = (user.full_name ?? '').trim()
  if (fullName) return fullName
  const combinedName = [user.first_name, user.last_name]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim()
  return combinedName || user.email
}

function getRoleLabel(user: CurrentUser) {
  const role = (user.role ?? '').trim()
  if (role) return role
  const roles = Array.isArray(user.roles) ? user.roles.filter((r) => typeof r === 'string' && r.trim().length > 0) : []
  return roles[0] ?? '-'
}

export function ProfilePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })

  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getCurrentUser()
      .then((data) => {
        if (cancelled) return
        setUser(data)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setUser(null)
        setError(e instanceof Error ? e.message : 'Ошибка загрузки профиля')
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const title = lang === 'ru' ? 'Профиль' : lang === 'kk' ? 'Профиль' : lang === 'en' ? 'Profile' : 'Profil'
  const name = user ? getDisplayName(user) : '-'
  const role = user ? getRoleLabel(user) : '-'
  const email = user?.email ?? '-'
  const departmentId = typeof user?.department_id === 'number' ? String(user.department_id) : '-'
  const status = user ? (user.is_active ? (lang === 'ru' ? 'Активен' : lang === 'en' ? 'Active' : lang === 'kk' ? 'Белсенді' : 'Aktiv') : (lang === 'ru' ? 'Не активен' : lang === 'en' ? 'Inactive' : lang === 'kk' ? 'Белсенді емес' : 'Inaktiv')) : '-'
  const avatarUrl = useMemo(() => {
    const anyUser = user as unknown as { avatar_url?: unknown; avatarUrl?: unknown; avatar?: unknown } | null
    const raw = anyUser ? (anyUser.avatar_url ?? anyUser.avatarUrl ?? anyUser.avatar) : null
    return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
  }, [user])
  const initials = useMemo(() => {
    const base = user ? getDisplayName(user) : ''
    const text = base.trim()
    if (!text) return '?'
    const value = text
      .split(' ')
      .filter((part) => part.trim().length > 0)
      .slice(0, 2)
      .map((part) => part.trim()[0]?.toUpperCase())
      .filter((ch): ch is string => typeof ch === 'string' && ch.length > 0)
      .join('')
    return value || '?'
  }, [user])

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
        active="profile"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <header className="dashboard__header">
          <h1>{title}</h1>
          {error ? <p>{error}</p> : null}
        </header>

        <section className="dashboard__panels">
          <article>
            <header>
              <strong>{title}</strong>
              <button type="button" onClick={() => navigate(-1)}>
                {lang === 'ru' ? 'Назад' : lang === 'en' ? 'Back' : lang === 'kk' ? 'Артқа' : 'Zurück'}
                <span>В»</span>
              </button>
            </header>
            <div className="dashboard__panel-body">
              <div>
                <div className="dashboard__panel-value">
                  <div className="dashboard__avatar" aria-hidden="true">
                    {avatarUrl ? (
                      <img className="dashboard__avatar-image" src={avatarUrl} alt={name} />
                    ) : (
                      <span className="dashboard__avatar-initials">{initials}</span>
                    )}
                  </div>
                </div>
                <div className="dashboard__panel-label">
                  {lang === 'ru' ? 'Аватар' : lang === 'en' ? 'Avatar' : lang === 'kk' ? 'Аватар' : 'Avatar'}
                </div>
              </div>
              <div>
                <div className="dashboard__panel-value">{loading ? '-' : name}</div>
                <div className="dashboard__panel-label">{lang === 'ru' ? 'ФИО' : lang === 'en' ? 'Name' : lang === 'kk' ? 'Аты-жөні' : 'Name'}</div>
              </div>
              <div>
                <div className="dashboard__panel-value">{loading ? '-' : role}</div>
                <div className="dashboard__panel-label">{lang === 'ru' ? 'Роль' : lang === 'en' ? 'Role' : lang === 'kk' ? 'Рөл' : 'Rolle'}</div>
              </div>
              <div>
                <div className="dashboard__panel-value">{loading ? '-' : email}</div>
                <div className="dashboard__panel-label">Email</div>
              </div>
              <div>
                <div className="dashboard__panel-value">{loading ? '-' : departmentId}</div>
                <div className="dashboard__panel-label">
                  {lang === 'ru' ? 'Отдел' : lang === 'en' ? 'Department' : lang === 'kk' ? 'Бөлім' : 'Abteilung'}
                </div>
              </div>
              <div>
                <div className="dashboard__panel-value">{loading ? '-' : status}</div>
                <div className="dashboard__panel-label">
                  {lang === 'ru' ? 'Статус' : lang === 'en' ? 'Status' : lang === 'kk' ? 'Күйі' : 'Status'}
                </div>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  )
}
