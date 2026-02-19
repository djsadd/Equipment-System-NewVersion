import type { Lang } from '@/shared/config/dashboardCopy'
import { hasSystemAdminRole } from '@/shared/lib/authStorage'

type SidebarProps = {
  lang: Lang
  onLangChange: (lang: Lang) => void
  copy: {
    nav: string[]
    equipment: { title: string; items: string[] }
    cabinets: string
    admin: string
  }
  active:
    | 'dashboard'
    | 'inventory'
    | 'my-equipment'
    | 'maintenance'
    | 'admin'
    | 'notifications'
    | 'cabinets'
    | 'reports'
  onNavigate: (path: string) => void
  onLogout: () => void
}

const navIcons = [
  <svg viewBox="0 0 24 24" aria-hidden key="dash">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="rec">
    <path d="M4 18l6-6 4 4 6-7" />
    <circle cx="4" cy="18" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="14" cy="16" r="2" />
    <circle cx="20" cy="9" r="2" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="equip">
    <rect x="4" y="6" width="16" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M9 10h6" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="staff">
    <circle cx="8" cy="8" r="3" />
    <circle cx="16" cy="8" r="3" />
    <path d="M4 20c0-3 3-5 6-5" />
    <path d="M14 15c3 0 6 2 6 5" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="term">
    <path d="M12 3l9 16H3l9-16z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="16.5" r="1" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="bell">
    <path d="M12 3a4 4 0 0 1 4 4v3.5l1.5 3V16H6.5v-2.5l1.5-3V7a4 4 0 0 1 4-4z" />
    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="rooms">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="gear">
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1l2-1.2-2-3.4-2.3.7a7.1 7.1 0 0 0-1.7-1l-.3-2.4H9.4l-.3 2.4a7.1 7.1 0 0 0-1.7 1l-2.3-.7-2 3.4 2 1.2A7 7 0 0 0 5 12a7 7 0 0 0 .1 1l-2 1.2 2 3.4 2.3-.7c.5.4 1.1.7 1.7 1l.3 2.4h5.2l.3-2.4c.6-.3 1.2-.6 1.7-1l2.3.7 2-3.4-2-1.2c.1-.3.1-.7.1-1z" />
  </svg>,
  <svg viewBox="0 0 24 24" aria-hidden key="admin">
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9.5 12l2 2 4-4" />
  </svg>,
]

export function Sidebar({
  lang,
  onLangChange,
  copy,
  active,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const isSystemAdmin = hasSystemAdminRole()
  return (
    <aside className="dashboard__aside">
      <div className="dashboard__logo">
        <div className="dashboard__avatar" />
        <span>Logo</span>
      </div>
      <nav className="dashboard__nav">
        <button
          type="button"
          className={active === 'dashboard' ? 'is-active' : undefined}
          onClick={() => onNavigate('/dashboard')}
        >
          <span className="dashboard__nav-icon">{navIcons[0]}</span>
          {copy.nav[0]}
        </button>
        <button
          type="button"
          className={active === 'inventory' ? 'is-active' : undefined}
          onClick={() => onNavigate('/inventory')}
        >
          <span className="dashboard__nav-icon">{navIcons[1]}</span>
          {copy.nav[1]}
        </button>
        <button
          type="button"
          className={active === 'my-equipment' ? 'is-active' : undefined}
          onClick={() => onNavigate('/my-equipment')}
        >
          <span className="dashboard__nav-icon">{navIcons[2]}</span>
          {copy.equipment.items[1]}
        </button>
        <button
          type="button"
          className={active === 'maintenance' ? 'is-active' : undefined}
          onClick={() => onNavigate('/maintenance')}
        >
          <span className="dashboard__nav-icon">{navIcons[3]}</span>
          {copy.nav[2]}
        </button>
        <button
          type="button"
          className={active === 'notifications' ? 'is-active' : undefined}
          onClick={() => onNavigate('/notifications')}
        >
          <span className="dashboard__nav-icon">{navIcons[4]}</span>
          {copy.nav[3]}
        </button>
        <button
          type="button"
          className={active === 'cabinets' ? 'is-active' : undefined}
          onClick={() => onNavigate('/cabinets')}
        >
          <span className="dashboard__nav-icon">{navIcons[6]}</span>
          {copy.cabinets}
        </button>
        {isSystemAdmin ? (
          <button
            type="button"
            className={active === 'admin' ? 'is-active' : undefined}
            onClick={() => onNavigate('/admin')}
          >
            <span className="dashboard__nav-icon">{navIcons[8]}</span>
            {copy.admin}
          </button>
        ) : null}
        <button type="button">
          <span className="dashboard__nav-icon">{navIcons[7]}</span>
          {copy.nav[4]}
        </button>
      </nav>
      <div className="dashboard__lang">
        <span>Language</span>
        <div className="dashboard__lang-buttons">
          <button
            type="button"
            className={lang === 'id' ? 'is-active' : undefined}
            onClick={() => onLangChange('id')}
          >
            ID
          </button>
          <button
            type="button"
            className={lang === 'ru' ? 'is-active' : undefined}
            onClick={() => onLangChange('ru')}
          >
            RU
          </button>
          <button
            type="button"
            className={lang === 'en' ? 'is-active' : undefined}
            onClick={() => onLangChange('en')}
          >
            EN
          </button>
          <button
            type="button"
            className={lang === 'kk' ? 'is-active' : undefined}
            onClick={() => onLangChange('kk')}
          >
            KZ
          </button>
        </div>
      </div>
      <div className="dashboard__profile">
        <div className="dashboard__avatar" />
        <div>
          <div className="dashboard__name">Nama</div>
          <div className="dashboard__role">Jabatan</div>
        </div>
        <button
          className="dashboard__logout"
          type="button"
          aria-label="Logout"
          onClick={onLogout}
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden
            focusable="false"
          >
            <path
              d="M10 17l-1 3h11V4H9l1 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M4 12h11"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M7 9l-3 3 3 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  )
}
