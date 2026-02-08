import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const cabinetTypes = [
  { name: 'Учебный', count: '18', status: 'Активен' },
  { name: 'Компьютерный', count: '12', status: 'Активен' },
  { name: 'Лаборатория', count: '9', status: 'Активен' },
  { name: 'Административный', count: '7', status: 'Активен' },
]

const responsibles = [
  { name: 'Аяна Иманова', role: 'Зав. кабинетом', rooms: 'Каб. 101, 203' },
  { name: 'Нурлан Т.', role: 'Сисадмин', rooms: 'Каб. 118, 221' },
  { name: 'Светлана К.', role: 'Лаборант', rooms: 'Каб. 305' },
]

export function AdminCabinetsPage() {
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
        <section className="cabinet-admin">
          <header className="cabinet-admin__header">
            <div>
              <nav className="breadcrumb">
                <span>Администрирование / Кабинеты</span>
              </nav>
              <h1>Настройки кабинетов</h1>
              <p>Типы кабинетов, ответственные и параметры учета.</p>
            </div>
            <div className="cabinet-admin__actions">
              <button type="button" onClick={() => navigate('/cabinets')}>
                Перейти к списку
              </button>
              <button type="button" className="is-primary">
                Добавить тип
              </button>
            </div>
          </header>

          <section className="cabinet-admin__cards">
            <article>
              <h2>Создание кабинетов</h2>
              <p>Быстрое добавление новых кабинетов и назначение ответственных.</p>
              <button type="button">Создать кабинет</button>
            </article>
            <article>
              <h2>Создание типов кабинетов</h2>
              <p>Типы: учебный, лаборатория, административный и т.д.</p>
              <button type="button">Создать тип</button>
            </article>
            <article>
              <h2>Создание ответственного</h2>
              <p>Добавление ответственных сотрудников по кабинетам.</p>
              <button type="button">Назначить</button>
            </article>
            <article>
              <h2>Акты по кабинетам</h2>
              <p>Списания, перемещения и история изменений по кабинетам.</p>
              <button type="button">Открыть акты</button>
            </article>
          </section>

          <section className="cabinet-admin__grid">
            <article className="cabinet-admin__card">
              <h2>Типы кабинетов</h2>
              <p>Настройка типов: учебный, лаборатория, административный.</p>
              <div className="cabinet-admin__table">
                <div className="cabinet-admin__table-head">
                  <span>Тип</span>
                  <span>Кол-во</span>
                  <span>Статус</span>
                </div>
                {cabinetTypes.map((type) => (
                  <div className="cabinet-admin__table-row" key={type.name}>
                    <span>{type.name}</span>
                    <span>{type.count}</span>
                    <span>{type.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="cabinet-admin__card">
              <h2>Ответственные</h2>
              <p>Назначение ответственных сотрудников по кабинетам.</p>
              <div className="cabinet-admin__list">
                {responsibles.map((person) => (
                  <div className="cabinet-admin__person" key={person.name}>
                    <div>
                      <div className="cabinet-admin__person-name">{person.name}</div>
                      <div className="cabinet-admin__person-role">{person.role}</div>
                    </div>
                    <div className="cabinet-admin__person-rooms">{person.rooms}</div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </section>
      </main>
    </div>
  )
}
