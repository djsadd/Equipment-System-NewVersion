import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type InventoryItem = {
  name: string
  category: string
  room: string
  status: 'found' | 'missing' | 'misplaced'
  note: string
}

const reportById: Record<
  string,
  {
    title: string
    period: string
    duration: string
    owner: string
    progress: string
    items: InventoryItem[]
  }
> = {
  'inv-2026-02-05': {
    title: 'Февральская инвентаризация',
    period: '01.02.2026 — 05.02.2026',
    duration: '4 дн 6 ч',
    owner: 'Отдел эксплуатации',
    progress: '49 из 64 комнат',
    items: [
      {
        name: 'HP LaserJet Pro M404',
        category: 'Принтер',
        room: 'Каб. 203',
        status: 'found',
        note: 'Состояние хорошее',
      },
      {
        name: 'Brother HL-L5200DW',
        category: 'Принтер',
        room: 'Каб. 114',
        status: 'missing',
        note: 'Не найден',
      },
      {
        name: 'Lenovo ThinkPad T14',
        category: 'Ноутбук',
        room: 'Каб. 412',
        status: 'found',
        note: 'Выдан И. Петрову',
      },
      {
        name: 'Canon DR-C240',
        category: 'Сканер',
        room: 'Каб. 118',
        status: 'misplaced',
        note: 'Найден в Каб. 203',
      },
      {
        name: 'APC Smart-UPS 1500',
        category: 'UPS',
        room: 'Серверная',
        status: 'found',
        note: 'Пломба на месте',
      },
      {
        name: 'Epson EB-X49',
        category: 'Проектор',
        room: 'Каб. 305',
        status: 'missing',
        note: 'Вне местоположения',
      },
      {
        name: 'HP ProBook 450',
        category: 'Ноутбук',
        room: 'Каб. 221',
        status: 'misplaced',
        note: 'Фактически Каб. 330',
      },
    ],
  },
}

const fallbackReport = {
  title: 'Инвентаризация',
  period: '—',
  duration: '—',
  owner: '—',
  progress: '—',
  items: [],
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function InventoryReportDetailPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const navigate = useNavigate()
  const params = useParams()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const report = reportById[params.id ?? ''] ?? fallbackReport
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  const totals = report.items.reduce(
    (acc, item) => {
      acc[item.status] += 1
      return acc
    },
    { found: 0, missing: 0, misplaced: 0 }
  )

  const csvRows = [
    ['Наименование', 'Категория', 'Комната', 'Статус', 'Комментарий'],
    ...report.items.map((item) => [
      item.name,
      item.category,
      item.room,
      item.status === 'found'
        ? 'Найдено'
        : item.status === 'missing'
        ? 'Не найдено'
        : 'Не на месте',
      item.note,
    ]),
  ]

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
        active="reports"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <div className="inventory-report">
          <div className="inventory-report__header">
            <div>
              <h1>{report.title}</h1>
              <p>
                Период: {report.period} · Длительность: {report.duration} · Ответственный: {report.owner}
              </p>
            </div>
            <div className="inventory-report__actions">
              <button type="button" onClick={() => navigate('/reports/inventory')}>
                К списку
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => downloadCsv(`${report.title}.csv`, csvRows)}
              >
                Скачать Excel
              </button>
            </div>
          </div>

          <section className="admin__tabs" aria-label="Report modules">
            {t.reports.items.map((label, index) => {
              const routes = ['audit', 'computers', 'equipment', 'cartridges', 'inventory', 'uploads'] as const
              const route = routes[index] ?? 'audit'
              const isActive = route === 'inventory'
              return (
                <button
                  key={route}
                  type="button"
                  className={isActive ? 'is-active' : undefined}
                  onClick={() => {
                    if (route === 'inventory') {
                      navigate('/reports/inventory')
                      return
                    }
                    navigate(`/reports/${route}`)
                  }}
                >
                  {label}
                </button>
              )
            })}
          </section>

          <section className="inventory-report__cards">
            <article>
              <div className="inventory-report__value">{report.progress}</div>
              <div className="inventory-report__label">Прогресс проверки</div>
            </article>
            <article>
              <div className="inventory-report__value">{totals.found}</div>
              <div className="inventory-report__label">Найдено</div>
            </article>
            <article>
              <div className="inventory-report__value">{totals.missing}</div>
              <div className="inventory-report__label">Не найдено</div>
            </article>
            <article>
              <div className="inventory-report__value">{totals.misplaced}</div>
              <div className="inventory-report__label">Не на месте</div>
            </article>
          </section>

          <section className="inventory-report__table">
            <div className="inventory-report__table-card">
              <div className="inventory-report__table-head">
                <span>Наименование</span>
                <span>Категория</span>
                <span>Комната</span>
                <span>Статус</span>
                <span>Комментарий</span>
              </div>
              <div className="inventory-report__table-body">
                {report.items.map((item) => (
                  <div className="inventory-report__table-row" key={`${item.name}-${item.room}`}>
                    <span>{item.name}</span>
                    <span>{item.category}</span>
                    <span>{item.room}</span>
                    <span className={`inventory-report__status is-${item.status}`}>
                      {item.status === 'found'
                        ? 'Найдено'
                        : item.status === 'missing'
                        ? 'Не найдено'
                        : 'Не на месте'}
                    </span>
                    <span>{item.note}</span>
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
