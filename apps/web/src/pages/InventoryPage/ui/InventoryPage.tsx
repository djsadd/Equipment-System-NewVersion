import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { listMyCabinets, type Cabinet } from '@/shared/api/cabinets'
import { createAuditPlan, listAuditSessions, type AuditSession, type AuditSessionStatus } from '@/shared/api/audit'

type RoomStatus = 'done' | 'pending'

type InventoryRoomRow = {
  id: number
  name: string
  type: string
  status: RoomStatus
  last_audit_at?: string | null
}

const LOCALE_BY_LANG: Record<Lang, string> = {
  id: 'id-ID',
  ru: 'ru-RU',
  en: 'en-US',
  kk: 'kk-KZ',
}

function toMillis(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const trimmed = value.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dateOnly) {
    const year = Number(dateOnly[1])
    const month = Number(dateOnly[2])
    const day = Number(dateOnly[3])
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      return new Date(year, month - 1, day).getTime()
    }
  }

  const millis = Date.parse(trimmed)
  return Number.isFinite(millis) ? millis : null
}

function pickLatestStamp(a: string | null | undefined, b: string | null | undefined): string | null {
  const aVal = typeof a === 'string' && a.trim() ? a : null
  const bVal = typeof b === 'string' && b.trim() ? b : null
  if (!aVal) {
    return bVal
  }
  if (!bVal) {
    return aVal
  }

  const aMs = toMillis(aVal)
  const bMs = toMillis(bVal)
  if (aMs !== null && bMs !== null) {
    return aMs >= bMs ? aVal : bVal
  }
  if (aMs !== null) {
    return aVal
  }
  if (bMs !== null) {
    return bVal
  }
  return aVal
}

function formatDateTime(value: string | null | undefined, lang: Lang): string {
  if (typeof value !== 'string' || !value.trim()) {
    return '—'
  }
  const trimmed = value.trim()
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (dateOnly) {
    const year = Number(dateOnly[1])
    const month = Number(dateOnly[2])
    const day = Number(dateOnly[3])
    if (Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)) {
      const date = new Date(year, month - 1, day)
      return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date)
    }
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return trimmed
  }
  return new Intl.DateTimeFormat(LOCALE_BY_LANG[lang], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function toRoomRow(room: Cabinet): InventoryRoomRow {
  return {
    id: room.id,
    name: room.name,
    type: room.room_type,
    status: 'pending',
    last_audit_at: room.last_audit_at ?? null,
  }
}

export function InventoryPage() {
  const [open, setOpen] = useState(false)
  const [started, setStarted] = useState(() => localStorage.getItem('active_audit_plan_id') !== null)
  const [filter, setFilter] = useState<RoomStatus>('pending')
  const [finishOpen, setFinishOpen] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 5
  const [rooms, setRooms] = useState<InventoryRoomRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  useEffect(() => {
    if (!started) {
      return
    }
    let active = true
    setIsLoading(true)
    setError(null)
    listMyCabinets()
      .then(async (data) => {
        if (!active) {
          return
        }
        const baseRows = data.map(toRoomRow)

        const storedPlanId = localStorage.getItem('active_audit_plan_id')
        let planId = storedPlanId ? Number(storedPlanId) : NaN
        if (!Number.isFinite(planId)) {
          const now = new Date()
          const ymd = now.toISOString().slice(0, 10)
          const plan = await createAuditPlan({
            title: '\u0418\u043D\u0432\u0435\u043D\u0442\u0430\u0440\u0438\u0437\u0430\u0446\u0438\u044F ' + now.toLocaleString(),
            scope_type: 'custom',
            scope_payload: { room_ids: baseRows.map((r) => r.id) },
            start_date: ymd,
          })
          localStorage.setItem('active_audit_plan_id', String(plan.id))
          planId = plan.id
        }

        async function listAllSessionsByPlan(plan_id: number): Promise<AuditSession[]> {
          const limit = 500
          const sessions: AuditSession[] = []
          let offset = 0
          const MAX_PAGES = 50

          for (let pageIndex = 0; pageIndex < MAX_PAGES; pageIndex++) {
            const batch = await listAuditSessions({ plan_id, limit, offset })
            sessions.push(...batch)
            if (batch.length < limit) {
              break
            }
            offset += limit
          }

          return sessions
        }

        try {
          const roomIds = new Set(baseRows.map((r) => r.id))
          const sessions = await listAllSessionsByPlan(planId)
          const doneStatuses = new Set<AuditSessionStatus>([
            'reconciling',
            'awaiting_approval',
            'approved',
            'applied',
            'closed',
          ])
          const latestSessionByRoomId = new Map<number, { status: AuditSessionStatus; stamp: string | null }>()

          for (const session of sessions) {
            if (!roomIds.has(session.location_id)) {
              continue
            }

            if (latestSessionByRoomId.has(session.location_id)) {
              continue
            }

            const stamp =
              session.applied_at ??
              session.closed_at ??
              session.approved_at ??
              session.updated_at ??
              session.started_at ??
              session.created_at ??
              null

            latestSessionByRoomId.set(session.location_id, {
              status: session.status,
              stamp: typeof stamp === 'string' && stamp.trim() ? stamp : null,
            })
          }

          const mergedRows = baseRows.map((room): InventoryRoomRow => {
            const latest = latestSessionByRoomId.get(room.id)
            const isDone = latest ? doneStatuses.has(latest.status) : false
            const derivedLastAudit = latest?.stamp ?? null
            const lastAudit = pickLatestStamp(room.last_audit_at ?? null, derivedLastAudit)
            return {
              ...room,
              status: isDone ? 'done' : 'pending',
              last_audit_at: lastAudit,
            }
          })
          setRooms(mergedRows)
        } catch {
          setRooms(baseRows)
        }
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить список кабинетов.')
        localStorage.removeItem('active_audit_plan_id')
        setStarted(false)
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [started])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => room.status === filter)
  }, [rooms, filter])

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
        <div className="inventory">
          {!started ? (
            <button className="inventory__start" type="button" onClick={() => setOpen(true)}>
              Начать инвентаризацию / аудит
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
                  Завершить
                </button>
              </div>

              <div className="inventory__table-card">
                <div className="inventory__table-head">
                  <span>Наименование кабинета</span>
                  <span>Тип кабинета</span>
                  <span>Последний аудит</span>
                  <span>Статус</span>
                  <span />
                </div>
                <div className="inventory__table-body">
                  {isLoading && <div className="inventory__table-row">Загрузка...</div>}
                  {!isLoading && error && <div className="inventory__table-row">{error}</div>}
                  {!isLoading &&
                    !error &&
                    filteredRooms
                      .slice((page - 1) * pageSize, page * pageSize)
                      .map((room) => (
                        <div className="inventory__table-row" key={room.id}>
                          <span>{room.name}</span>
                          <span>{room.type}</span>
                          <span>{formatDateTime(room.last_audit_at, lang)}</span>
                          <span className={`inventory__status is-${room.status}`}>
                            {room.status === 'done' ? 'Пройдено' : 'Не пройдено'}
                          </span>
                          <button type="button" onClick={() => navigate(`/inventory/room/${room.id}`)}>
                            Открыть
                          </button>
                        </div>
                      ))}
                </div>
              </div>
              <div className="inventory__pagination">
                <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Назад
                </button>
                <span>Страница {page}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) =>
                      Math.min(Math.max(1, Math.ceil(filteredRooms.length / pageSize)), prev + 1)
                    )
                  }
                >
                  Вперед
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
            <p>Начать инвентаризацию / аудит? Будет загружен список кабинетов и создан план инвентаризации.</p>
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
            <h2>Завершение</h2>
            <p>Завершить инвентаризацию? Текущий план инвентаризации будет сброшен на этом устройстве.</p>
            <div className="inventory__actions">
              <button type="button" onClick={() => setFinishOpen(false)}>
                Отмена
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => {
                  localStorage.removeItem('active_audit_plan_id')
                  setRooms([])
                  setStarted(false)
                  setFinishOpen(false)
                }}
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
