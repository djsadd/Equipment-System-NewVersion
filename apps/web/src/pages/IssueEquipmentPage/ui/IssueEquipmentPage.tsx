import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type IssueStatus = 'ready' | 'issued' | 'service'

const issueItems: { name: string; type: string; serial: string; status: IssueStatus }[] = [
  { name: 'Lenovo ThinkPad T14', type: 'Ноутбук', serial: 'LT14-2049', status: 'ready' },
  { name: 'HP EliteDesk 800', type: 'ПК', serial: 'HP8-7751', status: 'service' },
  { name: 'Dell P2419H', type: 'Монитор', serial: 'DP24-1132', status: 'ready' },
  { name: 'Canon Lide 300', type: 'Сканер', serial: 'CL3-8821', status: 'issued' },
]

const statusLabel: Record<IssueStatus, string> = {
  ready: 'Готов к выдаче',
  issued: 'Выдан',
  service: 'В сервисе',
}

export function IssueEquipmentPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [selectedItem, setSelectedItem] = useState<(typeof issueItems)[number] | null>(null)
  const [requestOpen, setRequestOpen] = useState(false)
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
        copy={t}
        active="inventory"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <section className="issue">
          <header className="issue__header">
            <div>
              <h1>Выдача оборудования</h1>
              <p>Формирование заявки и передача оборудования сотрудникам.</p>
            </div>
            <div className="issue__actions">
              <button className="issue__scan" type="button" onClick={() => setScanOpen(true)}>
                Сканировать код
              </button>
              <button className="issue__primary" type="button" onClick={() => setRequestOpen(true)}>
                Новая выдача
              </button>
            </div>
          </header>

          <div className="issue__form">
            <label>
              Получатель
              <input type="text" placeholder="ФИО сотрудника" />
            </label>
            <label>
              Отдел
              <input type="text" placeholder="Отдел / кабинет" />
            </label>
            <label>
              Тип выдачи
              <select>
                <option>Временная</option>
                <option>Постоянная</option>
                <option>Замена</option>
              </select>
            </label>
            <label>
              Комментарий
              <textarea rows={3} placeholder="Комментарий к выдаче" />
            </label>
          </div>

          <div className="room__table">
            <div className="room__table-head">
              <span>Оборудование</span>
              <span>Тип</span>
              <span>Серийный №</span>
              <span>Статус</span>
              <span />
            </div>
            <div className="room__table-body">
              {issueItems.map((item) => (
                <div className="room__table-row" key={item.serial}>
                  <span>{item.name}</span>
                  <span>{item.type}</span>
                  <span>{item.serial}</span>
                  <span className="room__status">{statusLabel[item.status]}</span>
                  <button type="button" onClick={() => setSelectedItem(item)}>
                    Детали
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
              <p className="room__modal-subtitle">Оборудование для выдачи</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Серийный №</span>
                  <strong>{selectedItem.serial}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>{statusLabel[selectedItem.status]}</strong>
                </div>
                <div>
                  <span>Локация</span>
                  <strong>Склад №1</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство подготовлено к выдаче и закрепляется за сотрудником.
              </p>
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
                <button className="is-primary" type="button" onClick={() => setSelectedItem(null)}>
                  Выдать
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {requestOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Новая выдача</h2>
            <p>Проверьте заполненные данные и подтвердите выдачу.</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setRequestOpen(false)}>
                Отмена
              </button>
              <button className="is-primary" type="button" onClick={() => setRequestOpen(false)}>
                Подтвердить
              </button>
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
