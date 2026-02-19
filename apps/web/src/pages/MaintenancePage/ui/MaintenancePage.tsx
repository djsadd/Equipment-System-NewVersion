import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const consumables = [
  { name: 'Картридж CF259A', stock: '48', min: '20', location: 'Склад 1', status: 'ok' },
  { name: 'Тонер TN-3480', stock: '12', min: '20', location: 'Склад 2', status: 'low' },
  { name: 'Барабан DR-3400', stock: '6', min: '10', location: 'Склад 1', status: 'low' },
  { name: 'Бумага A4 80g', stock: '240', min: '120', location: 'Склад 3', status: 'ok' },
  { name: 'Кабель HDMI 1.5m', stock: '18', min: '25', location: 'Склад 2', status: 'order' },
]

const maintenanceTasks = [
  { title: 'Профилактика принтера', asset: 'HP M404', due: '12.02.2026', status: 'plan' },
  { title: 'Замена кулера', asset: 'Dell OptiPlex 7090', due: '09.02.2026', status: 'urgent' },
  { title: 'Проверка UPS', asset: 'APC Smart-UPS', due: '21.02.2026', status: 'plan' },
  { title: 'Диагностика сканера', asset: 'Canon DR-C240', due: '11.02.2026', status: 'progress' },
]

export function MaintenancePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
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
        copy={t}
        active="maintenance"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <div className="maintenance">
          <div className="maintenance__header">
            <div>
              <h1>Обслуживание и расходники</h1>
              <p>Плановые работы, заявки и контроль остатков расходных материалов.</p>
            </div>
            <div className="maintenance__actions">
              <button type="button">Создать заявку</button>
              <button className="is-primary" type="button">
                Запросить расходники
              </button>
            </div>
          </div>

          <section className="maintenance__cards">
            <article>
              <div className="maintenance__value">26</div>
              <div className="maintenance__label">Заявок в работе</div>
            </article>
            <article>
              <div className="maintenance__value">8</div>
              <div className="maintenance__label">Просроченных задач</div>
            </article>
            <article>
              <div className="maintenance__value">14</div>
              <div className="maintenance__label">Низких остатков</div>
            </article>
            <article>
              <div className="maintenance__value">3</div>
              <div className="maintenance__label">Поставки в пути</div>
            </article>
          </section>

          <section className="maintenance__grid">
            <div className="maintenance__panel">
              <header>
                <strong>Расходники</strong>
                <button type="button">Заказать</button>
              </header>
              <div className="maintenance__table">
                <div className="maintenance__table-head">
                  <span>Позиция</span>
                  <span>Остаток</span>
                  <span>Мин.</span>
                  <span>Склад</span>
                  <span>Статус</span>
                </div>
                <div className="maintenance__table-body">
                  {consumables.map((row) => (
                    <div className="maintenance__table-row" key={row.name}>
                      <span>{row.name}</span>
                      <span>{row.stock}</span>
                      <span>{row.min}</span>
                      <span>{row.location}</span>
                      <span className={`maintenance__status is-${row.status}`}>
                        {row.status === 'ok'
                          ? 'ОК'
                          : row.status === 'low'
                          ? 'Низкий остаток'
                          : 'Заказ'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="maintenance__panel">
              <header>
                <strong>Плановые работы</strong>
                <button type="button">Все задачи</button>
              </header>
              <div className="maintenance__tasks">
                {maintenanceTasks.map((task) => (
                  <article key={`${task.title}-${task.asset}`}>
                    <div>
                      <div className="maintenance__task-title">{task.title}</div>
                      <div className="maintenance__task-meta">{task.asset}</div>
                    </div>
                    <div className="maintenance__task-side">
                      <span className={`maintenance__status is-${task.status}`}>
                        {task.status === 'urgent'
                          ? 'Срочно'
                          : task.status === 'progress'
                          ? 'В работе'
                          : 'План'}
                      </span>
                      <span className="maintenance__task-date">{task.due}</span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
