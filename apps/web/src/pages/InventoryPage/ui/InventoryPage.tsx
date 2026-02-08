import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'

type RoomStatus = 'done' | 'pending'

const inventoryRooms = [
  { name: 'Кабинет 101', type: 'Учебный', owners: 'Аяна Иманова, Ерлан Б.', status: 'done' },
  { name: 'Кабинет 203', type: 'Компьютерный класс', owners: 'Нурлан Т., Диана Ш.', status: 'pending' },
  { name: 'Кабинет 305', type: 'Лаборатория', owners: 'Светлана К.', status: 'pending' },
  { name: 'Кабинет 412', type: 'Административный', owners: 'Марат Ж.', status: 'done' },
  { name: 'Кабинет 118', type: 'Лаборатория', owners: 'Ильяс Д.', status: 'pending' },
  { name: 'Кабинет 221', type: 'Учебный', owners: 'Айгерим С.', status: 'done' },
  { name: 'Кабинет 330', type: 'Серверная', owners: 'Тимур А.', status: 'pending' },
  { name: 'Кабинет 407', type: 'Учебный', owners: 'Жанна Т.', status: 'done' },
  { name: 'Кабинет 512', type: 'Мастерская', owners: 'Руслан М.', status: 'pending' },
  { name: 'Кабинет 619', type: 'Административный', owners: 'Ольга Н.', status: 'done' },
]

export function InventoryPage() {
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState(false)
  const [filter, setFilter] = useState<RoomStatus>('pending')
  const [finishOpen, setFinishOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 5
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
        active="inventory"
        onNavigate={navigate}
        onLogout={handleLogout}
      />
      <main className="dashboard__main">
        <div className="inventory">
          {!started ? (
            <button className="inventory__start" type="button" onClick={() => setOpen(true)}>
              Начать инвентаризацию
            </button>
          ) : (
            <section className="inventory__table">
              <div className="inventory__top">
                <div className="inventory__filters">
                  <button
                    type="button"
                    className={filter === 'done' ? 'is-active' : undefined}
                    onClick={() => {
                      setFilter('done')
                      setPage(1)
                    }}
                  >
                    Пройденные
                  </button>
                  <button
                    type="button"
                    className={filter === 'pending' ? 'is-active' : undefined}
                    onClick={() => {
                      setFilter('pending')
                      setPage(1)
                    }}
                  >
                    Не пройденные
                  </button>
                </div>
                <button className="inventory__finish" type="button" onClick={() => setFinishOpen(true)}>
                  Завершить инвентаризацию
                </button>
              </div>

              <div className="inventory__table-card">
                <div className="inventory__table-head">
                  <span>Наименование кабинета</span>
                  <span>Тип кабинета</span>
                  <span>Ответственные сотрудники</span>
                  <span>Статус</span>
                  <span />
                </div>
                <div className="inventory__table-body">
                  {inventoryRooms
                    .filter((room) => room.status === filter)
                    .slice((page - 1) * pageSize, page * pageSize)
                    .map((room) => (
                      <div className="inventory__table-row" key={room.name}>
                        <span>{room.name}</span>
                        <span>{room.type}</span>
                        <span>{room.owners}</span>
                        <span className={`inventory__status is-${room.status}`}>
                          {room.status === 'done' ? 'Пройдено' : 'Не пройдено'}
                        </span>
                        <button type="button" onClick={() => navigate('/inventory/room/203')}>
                          Перейти
                        </button>
                      </div>
                    ))}
                </div>
              </div>
              <div className="inventory__pagination">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Назад
                </button>
                <span>Страница {page}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(
                        Math.ceil(
                          inventoryRooms.filter((room) => room.status === filter).length /
                            pageSize
                        ),
                        prev + 1
                      )
                    )
                  }
                >
                  Вперёд
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {open ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Подтверждение</h2>
            <p>Вы действительно хотите начать инвентаризацию?</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setOpen(false)}>
                Отмена
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => {
                  setOpen(false)
                  setStarted(true)
                }}
              >
                Начать
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {finishOpen ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="inventory__modal" role="dialog" aria-modal="true">
            <h2>Завершение инвентаризации</h2>
            <p>
              Задача: сверка кабинетов и фиксация статусов оборудования.
              <br />
              Вы — сотрудник Аян Турсынов. Точно хотите завершить инвентаризацию?
            </p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setFinishOpen(false)}>
                Отмена
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => setFinishOpen(false)}
              >
                Завершить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
