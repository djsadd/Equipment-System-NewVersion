import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const reportRoutes = [
  'printers',
  'computers',
  'equipment',
  'cartridges',
  'inventory',
  'uploads',
] as const

const reportMeta: Record<
  (typeof reportRoutes)[number],
  {
    title: string
    subtitle: string
    summary: { label: string; value: string }[]
    columns: string[]
    rows: string[][]
  }
> = {
  printers: {
    title: 'Отчет по принтерам',
    subtitle: 'Свод по принтерам, статусам и расходу картриджей.',
    summary: [
      { label: 'Всего принтеров', value: '128' },
      { label: 'В работе', value: '112' },
      { label: 'На ремонте', value: '9' },
      { label: 'Списано', value: '7' },
    ],
    columns: ['Модель', 'Локация', 'Статус', 'Пробег, стр', 'Картридж'],
    rows: [
      ['HP LaserJet Pro M404', 'Каб. 201', 'В работе', '132 540', 'CF259A'],
      ['Canon i-SENSYS LBP226', 'Каб. 114', 'В работе', '88 020', '056'],
      ['Brother HL-L5200DW', 'Склад', 'На ремонте', '214 900', 'TN-3480'],
      ['Xerox Phaser 6510', 'Каб. 305', 'В работе', '76 300', '106R03480'],
      ['Kyocera ECOSYS P2040', 'Каб. 402', 'Списано', '310 120', 'TK-1160'],
    ],
  },
  computers: {
    title: 'Отчет по компьютерам',
    subtitle: 'Инвентарные данные по ПК и ноутбукам.',
    summary: [
      { label: 'Всего устройств', value: '342' },
      { label: 'Выдано', value: '281' },
      { label: 'На складе', value: '49' },
      { label: 'Списание', value: '12' },
    ],
    columns: ['Модель', 'Сотрудник', 'Локация', 'Статус', 'Последняя проверка'],
    rows: [
      ['Dell OptiPlex 7090', 'Д. Садыкова', 'Каб. 118', 'Выдано', '12.01.2026'],
      ['Lenovo ThinkPad T14', 'М. Жумабаев', 'Каб. 412', 'Выдано', '22.01.2026'],
      ['HP ProBook 450', '—', 'Склад', 'На складе', '18.01.2026'],
      ['Apple MacBook Air M2', 'И. Петров', 'Каб. 203', 'Выдано', '30.01.2026'],
      ['Acer Aspire TC-1660', '—', 'Списание', 'Списание', '04.01.2026'],
    ],
  },
  equipment: {
    title: 'Отчет по оборудованию',
    subtitle: 'Сводный отчет по всем типам оборудования.',
    summary: [
      { label: 'Всего единиц', value: '1 248' },
      { label: 'В эксплуатации', value: '985' },
      { label: 'На складе', value: '211' },
      { label: 'Списание', value: '52' },
    ],
    columns: ['Категория', 'Количество', 'В эксплуатации', 'Склад', 'Списание'],
    rows: [
      ['Принтеры', '128', '112', '9', '7'],
      ['Компьютеры', '342', '281', '49', '12'],
      ['Сканеры', '96', '82', '10', '4'],
      ['Проекторы', '64', '48', '12', '4'],
      ['Сетевое', '88', '76', '9', '3'],
    ],
  },
  cartridges: {
    title: 'Отчет по картриджам',
    subtitle: 'Остатки, списания и замены по картриджам.',
    summary: [
      { label: 'Всего позиций', value: '64' },
      { label: 'На складе', value: '412' },
      { label: 'Списано', value: '38' },
      { label: 'Заказ в пути', value: '120' },
    ],
    columns: ['Модель', 'Совместимость', 'На складе', 'Списано', 'Статус'],
    rows: [
      ['CF259A', 'HP M404', '48', '6', 'ОК'],
      ['TN-3480', 'Brother HL-L5200', '32', '8', 'ОК'],
      ['106R03480', 'Xerox 6510', '12', '5', 'Низкий остаток'],
      ['TK-1160', 'Kyocera P2040', '18', '4', 'ОК'],
      ['056', 'Canon LBP226', '6', '3', 'Заказ'],
    ],
  },
  inventory: {
    title: 'Отчет по инвентаризации',
    subtitle: 'Статусы комнат и прогресс проверки.',
    summary: [
      { label: 'Комнат всего', value: '64' },
      { label: 'Проверено', value: '49' },
      { label: 'В работе', value: '11' },
      { label: 'Просрочено', value: '4' },
    ],
    columns: ['Комната', 'Тип', 'Ответственный', 'Статус', 'Дата'],
    rows: [
      ['Каб. 101', 'Учебный', 'Аяна Иманова', 'Проверено', '02.02.2026'],
      ['Каб. 203', 'Компьютерный', 'Нурлан Т.', 'В работе', '—'],
      ['Каб. 305', 'Лаборатория', 'Светлана К.', 'Просрочено', '15.01.2026'],
      ['Каб. 412', 'Административный', 'Марат Ж.', 'Проверено', '01.02.2026'],
      ['Каб. 619', 'Административный', 'Ольга Н.', 'В работе', '—'],
    ],
  },
  uploads: {
    title: 'Отчет по загрузкам',
    subtitle: 'Последние загрузки файлов и их статусы.',
    summary: [
      { label: 'Всего загрузок', value: '1 024' },
      { label: 'Успешно', value: '986' },
      { label: 'С ошибками', value: '26' },
      { label: 'В очереди', value: '12' },
    ],
    columns: ['Файл', 'Пользователь', 'Дата', 'Статус', 'Источник'],
    rows: [
      ['equipment_jan.csv', 'А. Сулейменова', '03.02.2026', 'Успешно', 'CSV'],
      ['printers_update.xlsx', 'Д. Абдрахманов', '02.02.2026', 'Успешно', 'XLSX'],
      ['rooms_import.csv', 'И. Петров', '01.02.2026', 'С ошибками', 'CSV'],
      ['cartridges_feb.csv', 'К. Нуртаев', '31.01.2026', 'В очереди', 'CSV'],
      ['audit_report.pdf', 'С. Рахимова', '30.01.2026', 'Успешно', 'PDF'],
    ],
  },
}

export function ReportsPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(true)
  const [period, setPeriod] = useState('month')
  const navigate = useNavigate()
  const params = useParams()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }
  const moduleSlug = reportRoutes.includes(params.module as (typeof reportRoutes)[number])
    ? (params.module as (typeof reportRoutes)[number])
    : 'printers'
  useEffect(() => {
    if (moduleSlug === 'inventory') {
      navigate('/reports/inventory', { replace: true })
    }
  }, [moduleSlug, navigate])
  const report = reportMeta[moduleSlug]
  const titleIndex = reportRoutes.indexOf(moduleSlug)
  const localizedTitle = t.reports.items[titleIndex] ?? report.title

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
        activeReport={moduleSlug}
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <main className="dashboard__main">
        <div className="reports">
          <div className="reports__header">
            <div>
              <h1>{localizedTitle}</h1>
              <p>{report.subtitle}</p>
            </div>
            <div className="reports__controls">
              <div className="reports__filters">
                <button
                  type="button"
                  className={period === 'week' ? 'is-active' : undefined}
                  onClick={() => setPeriod('week')}
                >
                  Неделя
                </button>
                <button
                  type="button"
                  className={period === 'month' ? 'is-active' : undefined}
                  onClick={() => setPeriod('month')}
                >
                  Месяц
                </button>
                <button
                  type="button"
                  className={period === 'quarter' ? 'is-active' : undefined}
                  onClick={() => setPeriod('quarter')}
                >
                  Квартал
                </button>
                <button
                  type="button"
                  className={period === 'year' ? 'is-active' : undefined}
                  onClick={() => setPeriod('year')}
                >
                  Год
                </button>
              </div>
              <button className="reports__export" type="button">
                Экспорт
              </button>
            </div>
          </div>

          <div className="reports__cards">
            {report.summary.map((item) => (
              <article key={item.label}>
                <div className="reports__value">{item.value}</div>
                <div className="reports__label">{item.label}</div>
              </article>
            ))}
          </div>

          <section className="reports__table">
            <header>
              <div>
                <strong>Детализация</strong>
                <span>Актуальные записи по модулю</span>
              </div>
              <button type="button">Скачать CSV</button>
            </header>
            <div className="reports__table-card">
              <div className="reports__table-head">
                {report.columns.map((col) => (
                  <span key={col}>{col}</span>
                ))}
              </div>
              <div className="reports__table-body">
                {report.rows.map((row, rowIndex) => (
                  <div className="reports__table-row" key={`${row[0]}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <span key={`${rowIndex}-${cellIndex}`}>{cell}</span>
                    ))}
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
