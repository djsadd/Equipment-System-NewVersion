import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

const roomItems = [
  { name: 'Ноутбук Lenovo ThinkPad T14', owner: 'Аяна Иманова', type: 'Ноутбук', status: 'found' },
  {
    name: 'Проектор Epson EB-X41',
    owner: 'Ерлан Б.',
    type: 'Проектор',
    status: 'misplaced',
  },
  {
    name: 'Принтер HP LaserJet 1020',
    owner: 'Диана Ш.',
    type: 'Принтер',
    status: 'missing',
  },
  {
    name: 'Сканер Canon Lide 300',
    owner: 'Светлана К.',
    type: 'Сканер',
    status: 'found',
  },
  {
    name: 'Монитор Dell P2419H',
    owner: 'Тимур А.',
    type: 'Монитор',
    status: 'found',
  },
  {
    name: 'Системный блок HP 400 G6',
    owner: 'Жанна Т.',
    type: 'ПК',
    status: 'missing',
  },
  {
    name: 'Маршрутизатор MikroTik hAP',
    owner: 'Руслан М.',
    type: 'Сеть',
    status: 'misplaced',
  },
  {
    name: 'Клавиатура Logitech K120',
    owner: 'Ольга Н.',
    type: 'Периферия',
    status: 'found',
  },
  {
    name: 'МФУ Canon i-SENSYS',
    owner: 'Айгерим С.',
    type: 'МФУ',
    status: 'found',
  },
  {
    name: 'Колонки Logitech Z213',
    owner: 'Нурлан Т.',
    type: 'Аудио',
    status: 'missing',
  },
]

export function RoomAuditPage() {
  const [finishOpen, setFinishOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<(typeof roomItems)[number] | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const { id } = useParams()
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const [reportsOpen, setReportsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])
  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }
  const baseBreadcrumb =
    (location.state as { breadcrumb?: string[] } | null)?.breadcrumb ?? [
      'Администрирование',
      'Кабинеты',
      `Аудитория ${id}`,
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
        reportsOpen={reportsOpen}
        onToggleReports={() => setReportsOpen((prev) => !prev)}
        copy={t}
        active="cabinets"
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <main className="dashboard__main">
        <div className="room">
          <div className="room__header">
            <div>
              <nav className="breadcrumb">
                {baseBreadcrumb.map((item, index) => (
                  <span key={item}>
                    {item}
                    {index < baseBreadcrumb.length - 1 ? ' / ' : ''}
                  </span>
                ))}
              </nav>
              <h1>Аудитория {id}</h1>
              <p>Оборудование и закрепленные сотрудники</p>
            </div>
            <button className="room__finish" type="button" onClick={() => setFinishOpen(true)}>
              Завершить аудит
            </button>
          </div>

          <div className="room__table">
            <div className="room__table-head">
              <span>Наименование</span>
              <span>Отв. сотрудник</span>
              <span>Тип оборудования</span>
              <span />
            </div>
            <div className="room__table-body">
              {roomItems
                .slice((page - 1) * pageSize, page * pageSize)
                .map((item) => (
                  <div className="room__table-row" key={item.name}>
                    <span>{item.name}</span>
                    <span>{item.owner}</span>
                    <span>{item.type}</span>
                    <button type="button" onClick={() => setSelectedItem(item)}>
                      Детали
                    </button>
                  </div>
                ))}
            </div>
          </div>
          <div className="room__pagination">
            <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
              Назад
            </button>
            <span>Страница {page}</span>
            <button
              type="button"
              onClick={() =>
                setPage((prev) =>
                  Math.min(Math.ceil(roomItems.length / pageSize), prev + 1)
                )
              }
            >
              Вперёд
            </button>
          </div>
        </div>
      </main>

      {finishOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Завершить аудит</h2>
            <p>Вы уверены, что хотите завершить аудит аудитории {id}?</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setFinishOpen(false)}>
                Отмена
              </button>
              <button className="is-primary" type="button" onClick={() => setFinishOpen(false)}>
                Завершить
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              <p className="room__modal-subtitle">Оборудование аудитории</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{selectedItem.owner}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>
                    {selectedItem.status === 'found'
                      ? 'Найдено'
                      : selectedItem.status === 'missing'
                        ? 'Не найдено'
                        : 'Не на месте'}
                  </strong>
                </div>
                <div>
                  <span>Локация</span>
                  <strong>Аудитория {id}</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство закреплено за аудиторией и должно находиться на рабочем месте.
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
    </div>
  )
}
