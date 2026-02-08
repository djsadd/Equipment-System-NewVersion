import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const inventoryReports = [
  {
    id: 'inv-2026-02-05',
    title: 'Февральская инвентаризация',
    period: '01.02.2026 — 05.02.2026',
    duration: '4 дн 6 ч',
    rooms: '64',
    checked: '49',
    missing: '12',
    misplaced: '8',
    owner: 'Отдел эксплуатации',
    status: 'В работе',
  },
  {
    id: 'inv-2026-01-12',
    title: 'Январская инвентаризация',
    period: '05.01.2026 — 12.01.2026',
    duration: '7 дн 3 ч',
    rooms: '64',
    checked: '64',
    missing: '6',
    misplaced: '4',
    owner: 'Склад и учет',
    status: 'Завершена',
  },
  {
    id: 'inv-2025-12-18',
    title: 'Декабрьская инвентаризация',
    period: '10.12.2025 — 18.12.2025',
    duration: '8 дн 2 ч',
    rooms: '62',
    checked: '62',
    missing: '9',
    misplaced: '3',
    owner: 'Сервисная группа',
    status: 'Завершена',
  },
]

export function InventoryReportsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(true)
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
        active="reports"
        activeReport="inventory"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <div className="inventory-reports">
          <div className="inventory-reports__header">
            <div>
              <h1>Инвентаризационные отчеты</h1>
              <p>Список проведенных инвентаризаций и статус по ним.</p>
            </div>
            <button className="inventory-reports__primary" type="button">
              Создать инвентаризацию
            </button>
          </div>

          <section className="inventory-reports__table">
            <div className="inventory-reports__table-card">
              <div className="inventory-reports__table-head">
                <span>Инвентаризация</span>
                <span>Период</span>
                <span>Длительность</span>
                <span>Проверено</span>
                <span>Статус</span>
                <span />
              </div>
              <div className="inventory-reports__table-body">
                {inventoryReports.map((report) => (
                  <div className="inventory-reports__table-row" key={report.id}>
                    <div>
                      <div className="inventory-reports__title">{report.title}</div>
                      <div className="inventory-reports__meta">{report.owner}</div>
                    </div>
                    <span>{report.period}</span>
                    <span>{report.duration}</span>
                    <span>
                      {report.checked}/{report.rooms}
                    </span>
                    <span className="inventory-reports__status">{report.status}</span>
                    <button type="button" onClick={() => navigate(`/reports/inventory/${report.id}`)}>
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
