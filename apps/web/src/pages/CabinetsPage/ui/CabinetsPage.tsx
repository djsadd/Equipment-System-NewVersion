import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'
import { listMyCabinets, type Cabinet } from '@/shared/api/cabinets'

function getUserLabel(user: CurrentUser | null) {
  if (!user) {
    return 'Ответственный не указан'
  }
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

export function CabinetsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [rooms, setRooms] = useState<Cabinet[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([listMyCabinets(), getCurrentUser()])
      .then(([roomsData, userData]) => {
        if (!active) {
          return
        }
        setRooms(roomsData)
        setCurrentUser(userData)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинеты')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

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
        active="cabinets"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="issue">
          <header className="issue__header">
            <div>
              <h1>Кабинеты</h1>
              <p>Список кабинетов и быстрый переход к инвентарю.</p>
            </div>
          </header>

          <div className="room__table is-three">
            <div className="room__table-head">
              <span>Кабинет</span>
              <span>Тип</span>
              <span>Ответственный</span>
            </div>
            <div className="room__table-body">
              {isLoading && (
                <div className="room__table-row is-message">Загрузка...</div>
              )}
              {!isLoading && error && (
                <div className="room__table-row is-message">{error}</div>
              )}
              {!isLoading &&
                !error &&
                rooms.map((room) => (
                  <div
                    className="room__table-row is-clickable"
                    key={room.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/cabinets/room/${room.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/cabinets/room/${room.id}`)
                      }
                    }}
                  >
                    <span>{room.name}</span>
                    <span>{room.room_type}</span>
                    <span>{getUserLabel(currentUser)}</span>
                  </div>
                ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
