import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type ReturnStatus = 'issued' | 'checking' | 'returned'

const returnItems: { name: string; owner: string; code: string; status: ReturnStatus }[] = [
  { name: 'Lenovo ThinkPad T14', owner: 'Аяна Иманова', code: 'LT14-2049', status: 'issued' },
  { name: 'Dell P2419H', owner: 'Жанна Т.', code: 'DP24-1132', status: 'checking' },
  { name: 'Canon Lide 300', owner: 'Ерлан Б.', code: 'CL3-8821', status: 'returned' },
]

const statusLabel: Record<ReturnStatus, string> = {
  issued: 'Выдано',
  checking: 'На проверке',
  returned: 'Возвращено',
}

export function ReturnEquipmentPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [selectedItem, setSelectedItem] = useState<(typeof returnItems)[number] | null>(
    null
  )
  const [confirmOpen, setConfirmOpen] = useState(false)
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
              <h1>Возврат оборудования</h1>
              <p>Проверка, прием и фиксация возвратов оборудования.</p>
            </div>
            <div className="issue__actions">
              <button className="issue__scan" type="button" onClick={() => setScanOpen(true)}>
                Сканировать код
              </button>
              <button className="issue__primary" type="button" onClick={() => setConfirmOpen(true)}>
                Оформить возврат
              </button>
            </div>
          </header>

          <div className="issue__form">
            <label>
              Сотрудник
              <input type="text" placeholder="ФИО сотрудника" />
            </label>
            <label>
              Кабинет
              <input type="text" placeholder="Кабинет / отдел" />
            </label>
            <label>
              Причина возврата
              <select>
                <option>Завершение работы</option>
                <option>Замена</option>
                <option>Ремонт</option>
              </select>
            </label>
            <label>
              Комментарий
              <textarea rows={3} placeholder="Комментарий к возврату" />
            </label>
          </div>

          <div className="room__table">
            <div className="room__table-head">
              <span>Оборудование</span>
              <span>Сотрудник</span>
              <span>Код</span>
              <span>Статус</span>
              <span />
            </div>
            <div className="room__table-body">
              {returnItems.map((item) => (
                <div className="room__table-row" key={item.code}>
                  <span>{item.name}</span>
                  <span>{item.owner}</span>
                  <span>{item.code}</span>
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
              <p className="room__modal-subtitle">Возврат оборудования</p>
              <div className="room__modal-grid">
                <div>
                  <span>Сотрудник</span>
                  <strong>{selectedItem.owner}</strong>
                </div>
                <div>
                  <span>Код</span>
                  <strong>{selectedItem.code}</strong>
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
                Описание: устройство возвращено и ожидает проверки на складе.
              </p>
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
                <button className="is-primary" type="button" onClick={() => setSelectedItem(null)}>
                  Принять
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Оформить возврат</h2>
            <p>Проверьте заполненные данные и подтвердите возврат оборудования.</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setConfirmOpen(false)}>
                Отмена
              </button>
              <button className="is-primary" type="button" onClick={() => setConfirmOpen(false)}>
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
