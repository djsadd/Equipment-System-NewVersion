import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens } from '@/shared/lib/authStorage'
import { getCurrentUser, type CurrentUser } from '@/shared/api/auth'
import { listAuditSessions, type AuditSession } from '@/shared/api/audit'
import { listCabinets, type Cabinet } from '@/shared/api/cabinets'
import { listInventoryItems, listInventoryTypes, type InventoryItem, type InventoryType } from '@/shared/api/inventory'

const cardIcons = [
  <svg viewBox="0 0 64 64" aria-hidden key="case">
    <rect x="14" y="20" width="36" height="28" rx="4" />
    <path d="M24 20v-4a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4" />
    <path d="M32 28v12" />
    <path d="M26 34h12" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="shield">
    <path d="M32 10l18 6v14c0 12-8 20-18 24-10-4-18-12-18-24V16l18-6z" />
    <path d="M32 22v14" />
    <path d="M25 29h14" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="monitor">
    <rect x="12" y="18" width="40" height="24" rx="4" />
    <rect x="26" y="44" width="12" height="4" rx="2" />
    <circle cx="32" cy="30" r="6" />
  </svg>,
  <svg viewBox="0 0 64 64" aria-hidden key="warn">
    <path d="M32 10l22 40H10l22-40z" />
    <path d="M32 26v10" />
    <circle cx="32" cy="40" r="2" />
  </svg>,
]

type DashboardData = {
  user: CurrentUser | null
  inventoryItems: InventoryItem[]
  inventoryTypes: InventoryType[]
  cabinets: Cabinet[]
  auditSessions: AuditSession[]
}

function getNumberLocale(lang: Lang) {
  switch (lang) {
    case 'ru':
      return 'ru-RU'
    case 'kk':
      return 'kk-KZ'
    case 'id':
      return 'id-ID'
    case 'en':
    default:
      return 'en-US'
  }
}

function formatCount(value: number | null | undefined, lang: Lang) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-'
  }
  return new Intl.NumberFormat(getNumberLocale(lang)).format(value)
}

function pickMostUsedTypeName(items: InventoryItem[], types: InventoryType[]) {
  const counts = new Map<number, number>()
  for (const item of items) {
    if (typeof item.inventory_type_id !== 'number') {
      continue
    }
    counts.set(item.inventory_type_id, (counts.get(item.inventory_type_id) ?? 0) + 1)
  }

  let bestTypeId: number | null = null
  let bestCount = 0
  for (const [typeId, count] of counts) {
    if (count > bestCount) {
      bestCount = count
      bestTypeId = typeId
    }
  }

  if (bestTypeId === null) {
    return null
  }

  return types.find((t) => t.id === bestTypeId)?.name ?? null
}

function getUtcDaysAgoIso(days: number) {
  const now = new Date()
  const ms = days * 24 * 60 * 60 * 1000
  return new Date(now.getTime() - ms).toISOString()
}

export function DashboardPage() {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    user: null,
    inventoryItems: [],
    inventoryTypes: [],
    cabinets: [],
    auditSessions: [],
  })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setLoadError(null)

      const [userRes, itemsRes, typesRes, cabinetsRes, sessionsRes] = await Promise.allSettled([
        getCurrentUser(),
        listInventoryItems(),
        listInventoryTypes(),
        listCabinets(),
        listAuditSessions({ limit: 500 }),
      ])

      if (cancelled) {
        return
      }

      const next: DashboardData = {
        user: userRes.status === 'fulfilled' ? userRes.value : null,
        inventoryItems: itemsRes.status === 'fulfilled' ? itemsRes.value : [],
        inventoryTypes: typesRes.status === 'fulfilled' ? typesRes.value : [],
        cabinets: cabinetsRes.status === 'fulfilled' ? cabinetsRes.value : [],
        auditSessions: sessionsRes.status === 'fulfilled' ? sessionsRes.value : [],
      }

      const errors: string[] = []
      for (const res of [userRes, itemsRes, typesRes, cabinetsRes, sessionsRes]) {
        if (res.status === 'rejected') {
          const msg = res.reason instanceof Error ? res.reason.message : 'Ошибка загрузки'
          errors.push(msg)
        }
      }

      setDashboardData(next)
      setLoadError(errors.length > 0 ? errors[0] : null)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  const stats = useMemo(() => {
    const items = dashboardData.inventoryItems
    const types = dashboardData.inventoryTypes
    const sessions = dashboardData.auditSessions

    const totalItems = items.length
    const equipmentGroups = types.length
    const assignedAssets = items.filter((x) => typeof x.responsible_id === 'number').length
    const activeUsers = new Set(items.map((x) => x.responsible_id).filter((x): x is number => typeof x === 'number'))
      .size
    const totalLocations = dashboardData.cabinets.length

    const mostUsedItem = pickMostUsedTypeName(items, types)

    const last30DaysIso = getUtcDaysAgoIso(30)
    const sessionsLast30d = sessions.filter((s) => (s.created_at ?? '') >= last30DaysIso).length
    const sessionsClosedLast30d = sessions.filter(
      (s) => s.status === 'closed' && (s.closed_at ?? s.updated_at ?? '') >= last30DaysIso
    ).length
    const sessionsInProgress = sessions.filter((s) => s.status === 'in_progress').length

    return {
      totalItems,
      equipmentGroups,
      assignedAssets,
      mostUsedItem: mostUsedItem ?? '-',
      totalLocations,
      activeUsers,
      sessionsLast30d,
      sessionsClosedLast30d,
      sessionsInProgress,
    }
  }, [dashboardData])

  const greeting = useMemo(() => {
    if (!dashboardData.user) {
      return t.greeting
    }
    const fullName = (dashboardData.user.full_name ?? '').trim()
    const combinedName = [dashboardData.user.first_name, dashboardData.user.last_name]
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
      .join(' ')
      .trim()
    const name = fullName.length > 0 ? fullName : combinedName.length > 0 ? combinedName : dashboardData.user.email
    const role = dashboardData.user.role ?? (dashboardData.user.roles?.[0] ?? null)
    return role ? `${name} - ${role}` : name
  }, [dashboardData.user, t.greeting])

  const panelRoutes = useMemo(() => ['/inventory', '/my-equipment', '/cabinets', '/reports'], [])
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
        active="dashboard"
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main className="dashboard__main">
        <header className="dashboard__header">
          <h1>{t.title}</h1>
          <p>{greeting}</p>
          {loadError ? <p className="dashboard__error">{loadError}</p> : null}
        </header>

        <section className="dashboard__cards">
          {t.cards.map((title, index) => (
            <article key={title}>
              <div className="dashboard__card-title">{title}</div>
              <div className="dashboard__card-icon">{cardIcons[index]}</div>
            </article>
          ))}
        </section>

        <section className="dashboard__stats">
          {t.quick.map((stat, index) => {
            const value =
              index === 0
                ? formatCount(stats.totalItems, lang)
                : index === 1
                  ? formatCount(stats.equipmentGroups, lang)
                  : index === 2
                    ? formatCount(stats.assignedAssets, lang)
                    : stats.mostUsedItem

            return (
              <div key={stat.label}>
                <div className="dashboard__stat-value">{loading ? '-' : value}</div>
                <div className="dashboard__stat-label">{stat.label}</div>
              </div>
            )
          })}
        </section>

        <section className="dashboard__panels">
          {t.panels.map((panel, panelIndex) => (
            <article key={panel.title}>
              <header>
                <strong>{panel.title}</strong>
                <button type="button" onClick={() => navigate(panelRoutes[panelIndex] ?? '/dashboard')}>
                  {panel.hint}
                  <span>»</span>
                </button>
              </header>
              <div className="dashboard__panel-body">
                {panel.rows.map((row, rowIndex) => {
                  let value = '-'

                  if (!loading) {
                    if (panelIndex === 0) {
                      value =
                        rowIndex === 0
                          ? formatCount(stats.totalItems, lang)
                          : formatCount(stats.equipmentGroups, lang)
                    } else if (panelIndex === 1) {
                      value = rowIndex === 0 ? formatCount(stats.assignedAssets, lang) : stats.mostUsedItem
                    } else if (panelIndex === 2) {
                      value =
                        rowIndex === 0
                          ? formatCount(stats.totalLocations, lang)
                          : formatCount(stats.activeUsers, lang)
                    } else if (panelIndex === 3) {
                      value =
                        rowIndex === 0
                          ? formatCount(stats.sessionsInProgress, lang)
                          : formatCount(stats.sessionsClosedLast30d, lang)
                    }
                  }

                  return (
                    <div key={row.label}>
                      <div className="dashboard__panel-value">{value}</div>
                      <div className="dashboard__panel-label">{row.label}</div>
                    </div>
                  )
                })}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  )
}
