import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const cabinets = [
  { id: '203', name: 'Кабинет 203', type: 'Компьютерный класс', owner: 'Нурлан Т.' },
  { id: '118', name: 'Кабинет 118', type: 'Лаборатория', owner: 'Айгерим С.' },
  { id: '512', name: 'Кабинет 512', type: 'Мастерская', owner: 'Руслан М.' },
  { id: '305', name: 'Кабинет 305', type: 'Лаборатория', owner: 'Светлана К.' },
  { id: '412', name: 'Кабинет 412', type: 'Административный', owner: 'Марат Ж.' },
]

export function CabinetsPage() {
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

          <div className="room__table">
            <div className="room__table-head">
              <span>Кабинет</span>
              <span>Тип</span>
              <span>Ответственный</span>
              <span />
            </div>
            <div className="room__table-body">
              {cabinets.map((room) => (
                <div className="room__table-row" key={room.id}>
                  <span>{room.name}</span>
                  <span>{room.type}</span>
                  <span>{room.owner}</span>
                  <button type="button" onClick={() => navigate(`/cabinets/room/${room.id}`)}>
                    Открыть инвентарь
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
