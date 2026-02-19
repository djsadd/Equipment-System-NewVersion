import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listCabinets } from '@/shared/api/cabinets'
import { getAuditPlanReport, listAuditPlans, type AuditReportPlanSummary, type AuditPlan } from '@/shared/api/audit'

function formatPercent(rate: number) {
  if (!Number.isFinite(rate)) {
    return '0%'
  }
  return `${Math.round(rate * 1000) / 10}%`
}

function toCsvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map(toCsvCell).join(';')).join('\n')
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

function statusLabel(status: string) {
  switch (status) {
    case 'draft':
      return 'Черновик'
    case 'in_progress':
      return 'В работе'
    case 'reconciling':
      return 'Сверка'
    case 'awaiting_approval':
      return 'Ожидает подтверждения'
    case 'approved':
      return 'Подтверждено'
    case 'applied':
      return 'Применено'
    case 'closed':
      return 'Закрыто'
    case 'canceled':
      return 'Отменено'
    default:
      return status
  }
}

export function AuditReportModule() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<AuditPlan[]>([])
  const [planId, setPlanId] = useState<number | null>(null)
  const [report, setReport] = useState<AuditReportPlanSummary | null>(null)
  const [roomNameById, setRoomNameById] = useState<Map<number, string>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    Promise.allSettled([listAuditPlans({ limit: 100, offset: 0 }), listCabinets()]).then((results) => {
      if (!active) {
        return
      }
      const [plansRes, cabinetsRes] = results
      if (plansRes.status === 'fulfilled') {
        setPlans(plansRes.value)
        const stored = localStorage.getItem('active_audit_plan_id')
        const storedId = stored ? Number(stored) : NaN
        const nextId = Number.isFinite(storedId)
          ? storedId
          : plansRes.value.length > 0
            ? plansRes.value[0].id
            : null
        setPlanId((prev) => prev ?? nextId)
      }
      if (cabinetsRes.status === 'fulfilled') {
        const map = new Map<number, string>()
        cabinetsRes.value.forEach((room) => map.set(room.id, room.name))
        setRoomNameById(map)
      }
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (planId === null) {
      return
    }
    let active = true
    setIsLoading(true)
    setError(null)
    getAuditPlanReport(planId)
      .then((data) => {
        if (!active) {
          return
        }
        setReport(data)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setReport(null)
        setError(err instanceof Error ? err.message : 'Не удалось загрузить отчет')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [planId])

  const rows = report?.sessions ?? []

  const csvRows = useMemo(() => {
    if (!report) {
      return [] as string[][]
    }
    return [
      [
        'Комната',
        'Location ID',
        'Статус',
        'Ожидалось',
        'Найдено',
        'Найдено, %',
        'На месте',
        'На месте, %',
        'Не найдено',
        'Неожиданное',
        'Дубликаты',
        'Неизвестные штрихкоды',
        'Сканов',
        'Расхождения (всего)',
        'Расхождения (открыто)',
        'Обновлено',
      ],
      ...report.sessions.map((s) => [
        roomNameById.get(s.location_id) ?? `#${s.location_id}`,
        String(s.location_id),
        statusLabel(s.status),
        String(s.expected_total),
        String(s.found_total),
        formatPercent(s.found_rate),
        String(s.found_in_place),
        formatPercent(s.in_place_rate),
        String(s.missing),
        String(s.unexpected),
        String(s.duplicate),
        String(s.unknown_barcode),
        String(s.scan_count),
        String(s.discrepancies.total),
        String(s.discrepancies.open),
        s.updated_at ?? '',
      ]),
    ]
  }, [report, roomNameById])

  const planTitle = useMemo(() => {
    const plan = plans.find((p) => p.id === planId)
    return plan?.title ?? (planId !== null ? `План #${planId}` : 'План')
  }, [plans, planId])

  return (
    <div>
      <div className="reports__controls" style={{ justifyContent: 'space-between' }}>
        <div className="reports__filters" aria-label="Audit plan">
          <span className="reports__filters-label">План:</span>
          <div className="reports__select">
            <select value={planId ?? ''} onChange={(e) => setPlanId(Number(e.target.value))} disabled={plans.length === 0}>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button
          className="reports__export"
          type="button"
          disabled={!report}
          onClick={() => {
            if (!report) {
              return
            }
            downloadCsv(`audit_plan_${report.plan_id}.csv`, csvRows)
          }}
        >
          Экспорт CSV
        </button>
      </div>

      {isLoading && <div className="reports__table-row">Загрузка...</div>}
      {!isLoading && error && <div className="reports__table-row">{error}</div>}

      {!isLoading && report && (
        <>
          <div className="reports__cards">
            <article>
              <div className="reports__value">
                {report.rooms_done}/{report.rooms_total}
              </div>
              <div className="reports__label">Комнаты завершены</div>
            </article>
            <article>
              <div className="reports__value">{report.expected_total}</div>
              <div className="reports__label">Ожидалось</div>
            </article>
            <article>
              <div className="reports__value">{report.found_total}</div>
              <div className="reports__label">Найдено</div>
            </article>
            <article>
              <div className="reports__value">{formatPercent(report.found_rate)}</div>
              <div className="reports__label">Найдено, %</div>
            </article>
            <article>
              <div className="reports__value">{report.found_wrong_location}</div>
              <div className="reports__label">Не на месте</div>
            </article>
            <article>
              <div className="reports__value">{report.missing}</div>
              <div className="reports__label">Не найдено</div>
            </article>
            <article>
              <div className="reports__value">{report.unexpected}</div>
              <div className="reports__label">Неожиданное</div>
            </article>
            <article>
              <div className="reports__value">{report.duplicate}</div>
              <div className="reports__label">Дубликаты</div>
            </article>
            <article>
              <div className="reports__value">{report.discrepancies.open}</div>
              <div className="reports__label">Открытые расхождения</div>
            </article>
          </div>

          <section className="reports__table reports__table--audit">
            <header>
              <div>
                <strong>Детализация по комнатам</strong>
                <span>{planTitle}</span>
              </div>
              <button
                className="reports__action"
                type="button"
                onClick={() => {
                  if (!report) {
                    return
                  }
                  downloadCsv(`${planTitle}.csv`, csvRows)
                }}
              >
                Скачать CSV
              </button>
            </header>

            <div className="reports__table-card reports__table-card--audit">
              <div className="reports__table-head">
                <span>Комната</span>
                <span>Статус</span>
                <span>Ожидалось</span>
                <span>Найдено</span>
                <span>Найдено, %</span>
                <span>На месте</span>
                <span>Не на месте</span>
                <span>Не найдено</span>
                <span>Неожид.</span>
                <span>Дубл.</span>
                <span>ШК?</span>
                <span />
              </div>
              <div className="reports__table-body">
                {rows.map((s) => (
                  <div className="reports__table-row" key={s.session_id}>
                    <span>{roomNameById.get(s.location_id) ?? `#${s.location_id}`}</span>
                    <span>{statusLabel(s.status)}</span>
                    <span>{s.expected_total}</span>
                    <span>{s.found_total}</span>
                    <span>{formatPercent(s.found_rate)}</span>
                    <span>{s.found_in_place}</span>
                    <span>{s.found_wrong_location}</span>
                    <span>{s.missing}</span>
                    <span>{s.unexpected}</span>
                    <span>{s.duplicate}</span>
                    <span>{s.unknown_barcode}</span>
                    <button className="reports__row-action" type="button" onClick={() => navigate(`/inventory/room/${s.location_id}`)}>
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
