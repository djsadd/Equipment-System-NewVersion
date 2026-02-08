import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type EquipmentStatus = 'active' | 'service' | 'reserve'

const myEquipment: { name: string; type: string; location: string; status: EquipmentStatus }[] = [
  {
    name: 'Ноутбук Lenovo ThinkPad T14',
    type: 'Ноутбук',
    location: 'Кабинет 203',
    status: 'active',
  },
  {
    name: 'Монитор Dell P2419H',
    type: 'Монитор',
    location: 'Кабинет 203',
    status: 'active',
  },
  {
    name: 'Принтер HP LaserJet 1020',
    type: 'Принтер',
    location: 'Сервис',
    status: 'service',
  },
  {
    name: 'Сканер Canon Lide 300',
    type: 'Сканер',
    location: 'Склад №1',
    status: 'reserve',
  },
]

const statusLabel: Record<EquipmentStatus, string> = {
  active: 'В работе',
  service: 'На сервисе',
  reserve: 'Резерв',
}

export function MyEquipmentPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<(typeof myEquipment)[number] | null>(
    null
  )
  const [scanOpen, setScanOpen] = useState(false)
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
        active="my-equipment"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="my-equipment">
          <header className="my-equipment__header">
            <div>
              <h1>Моё оборудование</h1>
              <p>Отчёт по оборудованию пользователя: Аяна Иманова</p>
            </div>
            <div className="my-equipment__actions">
              <button className="my-equipment__scan" type="button" onClick={() => setScanOpen(true)}>
                Сканировать код
              </button>
              <button className="my-equipment__export" type="button">
                Экспорт отчёта
              </button>
            </div>
          </header>

          <section className="my-equipment__report">
            <div>
              <div className="my-equipment__value">4</div>
              <div className="my-equipment__label">Всего единиц</div>
            </div>
            <div>
              <div className="my-equipment__value">2</div>
              <div className="my-equipment__label">В работе</div>
            </div>
            <div>
              <div className="my-equipment__value">1</div>
              <div className="my-equipment__label">На сервисе</div>
            </div>
            <div>
              <div className="my-equipment__value">1</div>
              <div className="my-equipment__label">В резерве</div>
            </div>
          </section>

          <div className="room__table">
            <div className="room__table-head">
              <span>Оборудование</span>
              <span>Тип</span>
              <span>Локация</span>
              <span>Статус</span>
              <span />
            </div>
            <div className="room__table-body">
              {myEquipment.map((item) => (
                <div className="room__table-row" key={item.name}>
                  <span>{item.name}</span>
                  <span>{item.type}</span>
                  <span>{item.location}</span>
                  <span className="room__status">{statusLabel[item.status]}</span>
                  <button type="button" onClick={() => setSelectedItem(item)}>
                    Открыть
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {selectedItem ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="room__modal" role="dialog" aria-modal="true">
            <div className="room__modal-media">
              <div className="room__modal-image" />
            </div>
            <div className="room__modal-content">
              <div className="room__modal-header">
                <h2>{selectedItem.name}</h2>
                <button
                  className="room__modal-close"
                  type="button"
                  onClick={() => setSelectedItem(null)}
                >
                  ✕
                </button>
              </div>
              <p className="room__modal-subtitle">Оборудование пользователя</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>{statusLabel[selectedItem.status]}</strong>
                </div>
                <div>
                  <span>Локация</span>
                  <strong>{selectedItem.location}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>Аяна Иманова</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство закреплено за пользователем и доступно в личной ведомости.
              </p>
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
                <button className="is-primary" type="button" onClick={() => setSelectedItem(null)}>
                  Подтвердить
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scanOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="scan-modal" role="dialog" aria-modal="true">
            <div className="scan-modal__preview">
              <div className="scan-modal__frame" />
              <span>Наведи камеру на штрих-код</span>
            </div>
            <div className="scan-modal__actions">
              <button type="button" onClick={() => setScanOpen(false)}>
                Закрыть
              </button>
              <button className="is-primary" type="button" onClick={() => setScanOpen(false)}>
                Готово
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
