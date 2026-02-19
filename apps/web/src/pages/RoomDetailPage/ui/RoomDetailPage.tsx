import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Sidebar } from '@/widgets/Sidebar/ui/Sidebar'
import { dashboardCopy, type Lang } from '@/shared/config/dashboardCopy'
import { clearTokens, getAccessTokenRoles, hasSystemAdminRole } from '@/shared/lib/authStorage'
import { getCurrentUser, lookupUsers, type CurrentUser, type UserLookup } from '@/shared/api/auth'
import { getMyCabinet, type Cabinet } from '@/shared/api/cabinets'
import {
  getInventoryItem,
  listInventoryItemsByRoom,
  listInventoryTypes,
  updateInventoryItem,
  type InventoryItem,
  type InventoryType,
} from '@/shared/api/inventory'
import {
  applyAuditSession,
  approveAuditSession,
  buildAuditActions,
  closeAuditSession,
  createAuditScan,
  createAuditSession,
  listAuditActions,
  listAuditDiscrepancies,
  listAuditItemResults,
  listAuditSessions,
  resolveAuditDiscrepancy,
  startAuditSession,
  type AuditAction,
  type AuditDiscrepancy,
  type AuditItemResult,
  type AuditSession,
} from '@/shared/api/audit'

type RoomItem = {
  id: number
  name: string
  type: string
  status: string | null
  audit_status: 'found' | 'missing' | 'misplaced' | null
  item: InventoryItem
  audit_result?: AuditItemResult | null
}

function getUserLabel(user: CurrentUser | null) {
  if (!user) {
    return 'Ответственный не указан'
  }
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

function getResponsibleLabel(item: InventoryItem) {
  if (typeof item.responsible_id === 'number') {
    return `#${item.responsible_id}`
  }
  return '—'
}

function newClientScanId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeBarcode(value: string) {
  return value.replace(/\s+/g, '').trim()
}

function hasAuditSupervisorRole() {
  const roles = getAccessTokenRoles()
  return roles.includes('inventory_audit_supervisor')
}

export function RoomDetailPage() {
  const [selectedItem, setSelectedItem] = useState<RoomItem | null>(null)
  const [room, setRoom] = useState<Cabinet | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [types, setTypes] = useState<InventoryType[]>([])
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [responsibleUsersById, setResponsibleUsersById] = useState<Record<number, UserLookup>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [auditSession, setAuditSession] = useState<AuditSession | null>(null)
  const [auditDiscrepancies, setAuditDiscrepancies] = useState<AuditDiscrepancy[]>([])
  const [auditActions, setAuditActions] = useState<AuditAction[]>([])
  const [auditResults, setAuditResults] = useState<AuditItemResult[]>([])
  const [auditExtraItemsById, setAuditExtraItemsById] = useState<Record<number, InventoryItem>>({})
  const [auditBusy, setAuditBusy] = useState(false)
  const [auditError, setAuditError] = useState<string | null>(null)

  const [auditStatusFilter, setAuditStatusFilter] = useState<'found' | 'missing' | 'misplaced'>('missing')
  const [auditQuery, setAuditQuery] = useState('')
  const [auditTypeFilter, setAuditTypeFilter] = useState<string>('')

  const [scanOpen, setScanOpen] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState<string | null>(null)
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null)
  const scanBufferRef = useRef('')
  const scanLastKeyAtRef = useRef<number>(0)
  const scanFinalizeTimerRef = useRef<number | null>(null)

  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem('dashboard_lang')
    if (stored === 'id' || stored === 'ru' || stored === 'en' || stored === 'kk') {
      return stored
    }
    return 'id'
  })

  const params = useParams()
  const roomId = Number(params.roomId ?? params.id)
  const [activePlanId] = useState<number | null>(() => {
    const stored = localStorage.getItem('active_audit_plan_id')
    const id = stored ? Number(stored) : NaN
    return Number.isFinite(id) ? id : null
  })
  const navigate = useNavigate()
  const t = useMemo(() => dashboardCopy[lang], [lang])

  const getResponsibleLabelForItem = useCallback(
    (item: InventoryItem) => {
      const responsibleId = item.responsible_id
      if (typeof responsibleId !== 'number') {
        return '—'
      }
      const user = responsibleUsersById[responsibleId] ?? null
      if (user?.full_name) {
        return user.full_name
      }
      const parts = [user?.first_name, user?.last_name].filter(Boolean)
      if (parts.length > 0) {
        return parts.join(' ')
      }
      return getResponsibleLabel(item)
    },
    [responsibleUsersById]
  )

  const auditItemTitleById = useMemo(() => {
    const map = new Map<number, string>()
    items.forEach((item) => {
      map.set(item.id, item.title)
    })
    Object.values(auditExtraItemsById).forEach((item) => {
      map.set(item.id, item.title)
    })
    return map
  }, [items, auditExtraItemsById])

  const handleLogout = () => {
    clearTokens()
    navigate('/')
  }

  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      setError('Некорректный кабинет')
      setIsLoading(false)
      return
    }
    let active = true
    setIsLoading(true)
    setError(null)
    Promise.all([getMyCabinet(roomId), listInventoryItemsByRoom(roomId), listInventoryTypes(), getCurrentUser()])
      .then(([roomData, itemsData, typesData, userData]) => {
        if (!active) {
          return
        }
        setRoom(roomData)
        setItems(itemsData)
        setTypes(typesData)
        setCurrentUser(userData)
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setError(err instanceof Error ? err.message : 'Не удалось загрузить кабинет')
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [roomId, activePlanId])

  useEffect(() => {
    if (!Number.isFinite(roomId)) {
      return
    }
    let active = true
    setAuditError(null)
    listAuditSessions({
      location_id: roomId,
      plan_id: activePlanId ?? undefined,
      limit: 1,
      offset: 0,
    })
      .then((sessions) => {
        if (!active) {
          return
        }
        const session = sessions[0] ?? null
        setAuditSession(session)
        if (!session) {
          setAuditDiscrepancies([])
          setAuditActions([])
          setAuditResults([])
          setAuditExtraItemsById({})
          return
        }
        Promise.allSettled([
          listAuditDiscrepancies(session.id),
          listAuditActions(session.id),
          listAuditItemResults(session.id),
        ]).then((results) => {
          if (!active) {
            return
          }
          const [discrepanciesResult, actionsResult, resultsResult] = results
          if (discrepanciesResult.status === 'fulfilled') {
            setAuditDiscrepancies(discrepanciesResult.value)
          }
          if (actionsResult.status === 'fulfilled') {
            setAuditActions(actionsResult.value)
          }
          if (resultsResult.status === 'fulfilled') {
            setAuditResults(resultsResult.value)
          }
        })
      })
      .catch((err) => {
        if (!active) {
          return
        }
        setAuditError(err instanceof Error ? err.message : 'Не удалось загрузить аудит')
      })

    return () => {
      active = false
    }
  }, [roomId])

  useEffect(() => {
    const ids = Array.from(
      new Set(items.map((item) => item.responsible_id).filter((id): id is number => typeof id === 'number'))
    )
    const toFetch = ids.filter((id) => responsibleUsersById[id] === undefined)
    if (toFetch.length === 0) {
      return
    }

    let cancelled = false
    lookupUsers(toFetch.slice(0, 200))
      .then((users) => {
        if (cancelled) {
          return
        }
        setResponsibleUsersById((prev) => {
          const next = { ...prev }
          users.forEach((user) => {
            next[user.id] = user
          })
          return next
        })
      })
      .catch(() => {
        // ignore lookup errors, keep IDs as fallback
      })

    return () => {
      cancelled = true
    }
  }, [items, responsibleUsersById])

  const roomItems = useMemo(() => {
    const typeMap = new Map(types.map((type) => [type.id, type.name]))
    const resultByItemId = new Map(auditResults.map((r) => [r.item_id, r]))
    const hasAuditData = auditSession !== null && auditResults.length > 0
    return items.map((item) => {
      const auditResult = resultByItemId.get(item.id) ?? null
      const auditStatus: RoomItem['audit_status'] = hasAuditData
        ? auditResult?.status === 'found_in_place'
          ? 'found'
          : auditResult?.status === 'found'
            ? 'misplaced'
            : 'missing'
        : null

      return {
        id: item.id,
        name: item.title,
      type: item.category || (item.inventory_type_id ? typeMap.get(item.inventory_type_id) : undefined) || '—',
        status: item.status ?? null,
        audit_status: auditStatus,
        audit_result: auditResult,
        item,
      }
    })
  }, [items, types, auditResults, auditSession])

  const isSystemAdmin = hasSystemAdminRole()
  const isSupervisor = isSystemAdmin || hasAuditSupervisorRole()
  const isInProgress = auditSession?.status === 'in_progress'
  const canStartAudit = !auditSession || auditSession.status === 'closed' || auditSession.status === 'canceled'
  const hasOpenDiscrepancies = auditDiscrepancies.some((d) => d.resolution_status === 'open')

  useEffect(() => {
    if (!auditSession) {
      return
    }

    const relevantItemIds = auditDiscrepancies
      .filter((d) => (d.type === 'unexpected' || d.type === 'misplaced') && typeof d.item_id === 'number')
      .map((d) => d.item_id as number)

    if (relevantItemIds.length === 0) {
      return
    }

    const knownItemIds = new Set(items.map((item) => item.id))
    const toFetch = Array.from(new Set(relevantItemIds)).filter(
      (id) => !knownItemIds.has(id) && auditExtraItemsById[id] === undefined
    )

    if (toFetch.length === 0) {
      return
    }

    let cancelled = false
    Promise.allSettled(toFetch.slice(0, 50).map((id) => getInventoryItem(id))).then((results) => {
      if (cancelled) {
        return
      }
      setAuditExtraItemsById((prev) => {
        const next = { ...prev }
        results.forEach((result, index) => {
          if (result.status !== 'fulfilled') {
            return
          }
          next[toFetch[index]] = result.value
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [auditSession, auditDiscrepancies, items, auditExtraItemsById])

  function applyRowFilters(rows: RoomItem[], query: string, typeFilter: string) {
    const q = query.trim().toLowerCase()
    return rows.filter((row) => {
      if (typeFilter && row.type !== typeFilter) {
        return false
      }
      if (!q) {
        return true
      }
      const haystack = `${row.name} ${row.type} ${getResponsibleLabelForItem(row.item)}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  const foundRows = useMemo(() => roomItems.filter((row) => row.audit_status === 'found'), [roomItems])
  const missingRows = useMemo(() => roomItems.filter((row) => row.audit_status === 'missing'), [roomItems])
  const misplacedRowsFromResults = useMemo(
    () => roomItems.filter((row) => row.audit_status === 'misplaced'),
    [roomItems]
  )

  const misplacedRowsFromDiscrepancies = useMemo(() => {
    if (!auditSession) {
      return [] as RoomItem[]
    }
    const typeMap = new Map(types.map((type) => [type.id, type.name]))
    const byId = new Map<number, InventoryItem>(items.map((item) => [item.id, item] as const))
    for (const [key, value] of Object.entries(auditExtraItemsById)) {
      byId.set(Number(key), value)
    }

    const rows: RoomItem[] = []
    for (const d of auditDiscrepancies) {
      if (!(d.type === 'unexpected' || d.type === 'misplaced')) {
        continue
      }
      if (typeof d.item_id !== 'number') {
        continue
      }
      const item = byId.get(d.item_id) ?? ({ id: d.item_id, title: `item #${d.item_id}` } as InventoryItem)
      const typeLabel =
        item.category || (item.inventory_type_id ? typeMap.get(item.inventory_type_id) : undefined) || '—'
      rows.push({
        id: item.id,
        name: item.title,
        type: typeLabel,
        status: item.status ?? null,
        audit_status: 'misplaced',
        audit_result: null,
        item,
      })
    }
    return rows
  }, [auditSession, auditDiscrepancies, auditExtraItemsById, items, types])

  const misplacedRows = useMemo(() => {
    const merged = [...misplacedRowsFromResults, ...misplacedRowsFromDiscrepancies]
    const seen = new Set<number>()
    return merged.filter((row) => {
      if (seen.has(row.id)) {
        return false
      }
      seen.add(row.id)
      return true
    })
  }, [misplacedRowsFromResults, misplacedRowsFromDiscrepancies])

  const statusRows = useMemo(() => {
    if (auditStatusFilter === 'found') {
      return foundRows
    }
    if (auditStatusFilter === 'misplaced') {
      return misplacedRows
    }
    return missingRows
  }, [auditStatusFilter, foundRows, missingRows, misplacedRows])

  const filteredAuditRows = useMemo(
    () => applyRowFilters(statusRows, auditQuery, auditTypeFilter),
    [statusRows, auditQuery, auditTypeFilter]
  )

  const typeOptions = useMemo(() => Array.from(new Set(statusRows.map((r) => r.type))).sort(), [statusRows])

  async function refreshAudit(sessionId: number) {
    const [discrepancies, actions, results] = await Promise.all([
      listAuditDiscrepancies(sessionId),
      listAuditActions(sessionId),
      listAuditItemResults(sessionId),
    ])
    setAuditDiscrepancies(discrepancies)
    setAuditActions(actions)
    setAuditResults(results)
    return { discrepancies, actions, results }
  }

  async function handleStartAudit() {
    if (!Number.isFinite(roomId) || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const created = await createAuditSession({ plan_id: activePlanId ?? undefined, location_id: roomId })
      const started = await startAuditSession(created.id)
      const results = await listAuditItemResults(started.id)
      setAuditSession(started)
      setAuditDiscrepancies([])
      setAuditActions([])
      setAuditResults(results)
      setAuditExtraItemsById({})
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось начать аудит')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleCloseAudit() {
    if (!auditSession || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const updated = await closeAuditSession(auditSession.id)
      setAuditSession(updated)
      await refreshAudit(updated.id)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось закрыть аудит')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleMarkFound(itemId: number) {
    if (!auditSession || !isInProgress || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      await createAuditScan(auditSession.id, {
        item_id: itemId,
        found_location_id: roomId,
        client_scan_id: newClientScanId(),
      })
      await refreshAudit(auditSession.id)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось сохранить скан')
    } finally {
      setAuditBusy(false)
    }
  }

  const processScannedBarcode = useCallback(
    async (rawValue: string) => {
      const code = normalizeBarcode(rawValue)
      if (!code) {
        return
      }

      setLastScannedCode(code)
      setScanError(null)
      setScanSuccess(null)

      if (!auditSession || !isInProgress) {
        setScanError('Аудит не запущен. Нажмите «Начать аудит», затем «Сканировать».')
        return
      }

      if (!Number.isFinite(roomId)) {
        setScanError('Некорректная комната')
        return
      }

      if (scanBusy || auditBusy) {
        setScanError('Идёт обработка предыдущего скана…')
        return
      }

      setScanBusy(true)
      try {
        const scan = await createAuditScan(auditSession.id, {
          barcode_value: code,
          found_location_id: roomId,
          client_scan_id: newClientScanId(),
        })

        const refreshed = await refreshAudit(auditSession.id)

        if (typeof scan.item_id !== 'number') {
          const maybeUnknown = refreshed.discrepancies.find(
            (d) => d.type === 'unknown_barcode' && d.barcode_value === code && d.resolution_status === 'open'
          )
          setScanError(maybeUnknown ? `Штрих‑код "${code}" не найден в системе.` : `Скан "${code}" сохранён.`)
          return
        }

        const moveDiscrepancy =
          refreshed.discrepancies.find(
            (d) =>
              (d.type === 'unexpected' || d.type === 'misplaced') &&
              d.resolution_status === 'open' &&
              d.item_id === scan.item_id
          ) ?? null

        let title = items.find((item) => item.id === scan.item_id)?.title ?? null
        if (!title) {
          try {
            const loaded = await getInventoryItem(scan.item_id)
            title = loaded.title
            setAuditExtraItemsById((prev) => ({ ...prev, [loaded.id]: loaded }))
          } catch {
            title = null
          }
        }

        const result = refreshed.results.find((r) => r.item_id === scan.item_id) ?? null
        const statusHint =
          result?.status === 'found_in_place'
            ? ' (на месте)'
            : result?.status === 'found'
              ? ' (не на месте)'
              : ''

        setScanSuccess(`Оборудование найдено: ${title ?? `#${scan.item_id}`}${statusHint}.`)

        if (moveDiscrepancy) {
          const label = title ?? `#${scan.item_id}`
          if (isSystemAdmin) {
            const ok = window.confirm(
              `${label} найдено не в своём кабинете. Переписать (переместить) в текущий кабинет #${roomId}?`
            )
            if (!ok) {
              return
            }
            await updateInventoryItem(scan.item_id, { location_id: roomId })
            const updatedItems = await listInventoryItemsByRoom(roomId)
            setItems(updatedItems)
            setScanSuccess(`Перемещено в кабинет #${roomId}: ${label}.`)
          } else if (isSupervisor) {
            const ok = window.confirm(
              `${label} найдено не в своём кабинете. Создать действие на перемещение в кабинет #${roomId}?`
            )
            if (!ok) {
              return
            }
            await resolveAuditDiscrepancy(moveDiscrepancy.id, {
              resolution_status: 'resolved',
              resolution_payload: { action: 'move', to_location_id: roomId },
            })
            await refreshAudit(auditSession.id)
            setScanSuccess(`Создано действие на перемещение в кабинет #${roomId}: ${label}.`)
          } else {
            setScanError('Нет прав на перемещение: нужен system_admin или inventory_audit_supervisor.')
          }
        }
      } catch (err) {
        setScanError(err instanceof Error ? err.message : 'Не удалось сохранить скан')
      } finally {
        setScanBusy(false)
      }
    },
    [auditBusy, auditSession, isInProgress, isSupervisor, isSystemAdmin, items, roomId, scanBusy]
  )

  useEffect(() => {
    if (!scanOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const target = event.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (target as HTMLElement).isContentEditable) {
          return
        }
      }

      const now = typeof event.timeStamp === 'number' ? event.timeStamp : Date.now()
      const gap = now - scanLastKeyAtRef.current
      scanLastKeyAtRef.current = now

      if (gap > 120) {
        scanBufferRef.current = ''
        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
          scanFinalizeTimerRef.current = null
        }
      }

      if (event.key === 'Enter' || event.key === 'Tab') {
        const buffer = scanBufferRef.current
        scanBufferRef.current = ''
        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
          scanFinalizeTimerRef.current = null
        }

        const normalized = normalizeBarcode(buffer)
        if (normalized.length < 6) {
          return
        }

        event.preventDefault()
        processScannedBarcode(normalized)
        return
      }

      if (event.key.length === 1) {
        scanBufferRef.current += event.key
        if (scanBufferRef.current.length > 128) {
          scanBufferRef.current = scanBufferRef.current.slice(-128)
        }

        if (scanFinalizeTimerRef.current !== null) {
          window.clearTimeout(scanFinalizeTimerRef.current)
        }
        scanFinalizeTimerRef.current = window.setTimeout(() => {
          const buffer = scanBufferRef.current
          scanBufferRef.current = ''
          scanFinalizeTimerRef.current = null

          const normalized = normalizeBarcode(buffer)
          if (normalized.length < 6) {
            return
          }
          processScannedBarcode(normalized)
        }, 180)
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      if (scanFinalizeTimerRef.current !== null) {
        window.clearTimeout(scanFinalizeTimerRef.current)
        scanFinalizeTimerRef.current = null
      }
    }
  }, [processScannedBarcode, scanOpen])

  async function handleResolveIgnore(discrepancyId: number) {
    if (!isSupervisor || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const updated = await resolveAuditDiscrepancy(discrepancyId, {
        resolution_status: 'ignored',
        resolution_payload: null,
      })
      setAuditDiscrepancies((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось обновить расхождение')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleResolveMoveToHere(discrepancyId: number) {
    if (!isSupervisor || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const updated = await resolveAuditDiscrepancy(discrepancyId, {
        resolution_status: 'resolved',
        resolution_payload: { action: 'move', to_location_id: roomId },
      })
      setAuditDiscrepancies((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось обновить расхождение')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleApproveAudit() {
    if (!auditSession || !isSupervisor || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const updated = await approveAuditSession(auditSession.id)
      setAuditSession(updated)
      await refreshAudit(updated.id)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось утвердить аудит')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleBuildActions() {
    if (!auditSession || !isSupervisor || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const actions = await buildAuditActions(auditSession.id)
      setAuditActions(actions)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось сформировать действия')
    } finally {
      setAuditBusy(false)
    }
  }

  async function handleApplyActions() {
    if (!auditSession || !isSystemAdmin || auditBusy) {
      return
    }
    setAuditBusy(true)
    setAuditError(null)
    try {
      const updated = await applyAuditSession(auditSession.id)
      setAuditSession(updated)
      await refreshAudit(updated.id)
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : 'Не удалось применить корректировки')
    } finally {
      setAuditBusy(false)
    }
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
        <div className="room">
          <div className="room__header">
            <div>
              <h1>{room?.name ?? 'Кабинет'}</h1>
              <p>Тип кабинета: {room?.room_type ?? '—'}</p>
            </div>
            <div className="room__audit-actions">
              {canStartAudit ? (
                <button className="room__finish" type="button" disabled={auditBusy} onClick={handleStartAudit}>
                  Начать аудит
                </button>
              ) : null}
              {auditSession?.status === 'in_progress' ? (
                <button className="room__finish" type="button" disabled={auditBusy} onClick={handleCloseAudit}>
                  Закрыть аудит
                </button>
              ) : null}
            </div>
          </div>

          <div className="room__audit-panel">
            <div className="room__audit-panel-top">
              <div>
                <strong>Аудит</strong>
                <div className="room__audit-panel-subtitle">
                  {auditSession ? `Сессия #${auditSession.id} — ${auditSession.status}` : 'Сессия не создана'}
                </div>
              </div>
              <div className="room__audit-panel-buttons">
                {auditSession?.status === 'awaiting_approval' && isSupervisor ? (
                  <button type="button" disabled={auditBusy || hasOpenDiscrepancies} onClick={handleApproveAudit}>
                    Утвердить
                  </button>
                ) : null}
                {auditSession?.status === 'approved' && isSupervisor ? (
                  <button type="button" disabled={auditBusy} onClick={handleBuildActions}>
                    Сформировать действия
                  </button>
                ) : null}
                {auditSession?.status === 'approved' && isSystemAdmin ? (
                  <button type="button" disabled={auditBusy} onClick={handleApplyActions}>
                    Применить
                  </button>
                ) : null}
              </div>
            </div>
            {auditError ? <div className="room__audit-panel-error">{auditError}</div> : null}

            {auditSession ? (
              <>
                <div className="room__audit-panel-section">
                  <div className="room__audit-panel-section-title">Расхождения</div>
                  {auditDiscrepancies.length === 0 ? (
                    <div className="room__audit-panel-empty">Нет данных</div>
                  ) : (
                    <div className="room__audit-panel-list">
                      {auditDiscrepancies.map((d) => (
                        <div className="room__audit-panel-item" key={d.id}>
                          <div className="room__audit-panel-item-main">
                            <span className="room__audit-badge">{d.type}</span>
                            <span>
                              {typeof d.item_id === 'number'
                                ? auditItemTitleById.get(d.item_id) ?? `#${d.item_id}`
                                : d.barcode_value ?? '—'}
                            </span>
                            <span className="room__audit-muted">{d.resolution_status}</span>
                          </div>
                          {isSupervisor && d.resolution_status === 'open' ? (
                            <div className="room__audit-panel-item-actions">
                              {(d.type === 'misplaced' || d.type === 'unexpected') && typeof d.item_id === 'number' ? (
                                <button type="button" disabled={auditBusy} onClick={() => handleResolveMoveToHere(d.id)}>
                                  Принять в этот кабинет
                                </button>
                              ) : null}
                              <button type="button" disabled={auditBusy} onClick={() => handleResolveIgnore(d.id)}>
                                Игнорировать
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {auditActions.length > 0 ? (
                  <div className="room__audit-panel-section">
                    <div className="room__audit-panel-section-title">Действия</div>
                    <div className="room__audit-panel-list">
                      {auditActions.map((a) => (
                        <div className="room__audit-panel-item" key={a.id}>
                          <div className="room__audit-panel-item-main">
                            <span className="room__audit-badge">{a.action_type}</span>
                            <span className="room__audit-muted">{a.status}</span>
                          </div>
                          {a.last_error ? <div className="room__audit-panel-error">{a.last_error}</div> : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="room__audit-tables">
            <div className="room__audit-table-top">
              <div className="room__audit-table-title">
                {auditStatusFilter === 'found'
                  ? `Найдено (${foundRows.length})`
                  : auditStatusFilter === 'misplaced'
                    ? `Найдено не на своем месте (${misplacedRows.length})`
                    : `Не найдено (${missingRows.length})`}
              </div>
              <div className="room__audit-table-filters">
                <select
                  value={auditStatusFilter}
                  onChange={(event) => setAuditStatusFilter(event.target.value as typeof auditStatusFilter)}
                >
                  <option value="found">Найдено</option>
                  <option value="missing">Не найдено</option>
                  <option value="misplaced">Не на месте</option>
                </select>
                <input
                  value={auditQuery}
                  placeholder="Фильтр..."
                  onChange={(event) => setAuditQuery(event.target.value)}
                />
                <select value={auditTypeFilter} onChange={(event) => setAuditTypeFilter(event.target.value)}>
                  <option value="">Все типы</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <button
                  className="room__audit-scan"
                  type="button"
                  disabled={!isInProgress || auditBusy}
                  onClick={() => {
                    setScanError(null)
                    setScanSuccess(null)
                    setLastScannedCode(null)
                    setScanOpen(true)
                  }}
                >
                  Сканировать
                </button>
              </div>
            </div>

            <div className="room__table is-five">
              <div className="room__table-head">
                <span>Наименование</span>
                <span>Отв. сотрудник</span>
                <span>Тип оборудования</span>
                <span>Статус</span>
                <span />
              </div>
              <div className="room__table-body">
                {isLoading && <div className="room__table-row is-message">Загрузка...</div>}
                {!isLoading && error && <div className="room__table-row is-message">{error}</div>}
                {!isLoading && !error && !auditSession && (
                  <div className="room__table-row is-message">Аудит не начат</div>
                )}
                {!isLoading && !error && auditSession && auditResults.length === 0 && (
                  <div className="room__table-row is-message">Загрузка результатов...</div>
                )}
                {!isLoading &&
                  !error &&
                  auditSession &&
                  auditResults.length > 0 &&
                  filteredAuditRows.map((row) => (
                    <div
                      className="room__table-row is-clickable"
                      key={row.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(row)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedItem(row)
                        }
                      }}
                    >
                      <span>{row.name}</span>
                      <span>{getResponsibleLabelForItem(row.item)}</span>
                      <span>{row.type}</span>
                      <span
                        className={`room__status ${
                          row.audit_status === 'found'
                            ? 'is-found'
                            : row.audit_status === 'misplaced'
                              ? 'is-misplaced'
                              : 'is-missing'
                        }`}
                      >
                        {row.audit_status === 'found'
                          ? 'Найдено'
                          : row.audit_status === 'misplaced'
                            ? 'Не на месте'
                            : 'Не найдено'}
                      </span>
                      {row.audit_status === 'missing' ? (
                        <button
                          type="button"
                          disabled={!isInProgress || auditBusy}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleMarkFound(row.id)
                          }}
                        >
                          Отметить
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setSelectedItem(row)
                          }}
                        >
                          Детали
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {selectedItem ? (
        <div className="inventory__modal-backdrop" role="presentation">
          <div className="room__modal" role="dialog" aria-modal="true">
            <div className="room__modal-media">
              <div
                className="room__modal-image"
                style={
                  selectedItem.item.image
                    ? {
                        backgroundImage: `url(${selectedItem.item.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                      }
                    : undefined
                }
              />
            </div>
            <div className="room__modal-content">
              <div className="room__modal-header">
                <h2>{selectedItem.name}</h2>
                <button className="room__modal-close" type="button" onClick={() => setSelectedItem(null)}>
                  ✕
                </button>
              </div>
              <p className="room__modal-subtitle">Инвентарное оборудование</p>
              <div className="room__modal-grid">
                <div>
                  <span>Тип</span>
                  <strong>{selectedItem.type}</strong>
                </div>
                <div>
                  <span>Ответственный</span>
                  <strong>{getUserLabel(currentUser)}</strong>
                </div>
                <div>
                  <span>Статус</span>
                  <strong>{selectedItem.status ?? 'Статус не задан'}</strong>
                </div>
                <div>
                  <span>Местоположение</span>
                  <strong>{room?.name ?? '—'}</strong>
                </div>
              </div>
              <p className="room__modal-note">
                Описание: устройство закреплено за кабинетом и должно находиться на рабочем месте.
              </p>
              <div className="room__modal-actions">
                <button type="button" onClick={() => setSelectedItem(null)}>
                  Закрыть
                </button>
                <button
                  className="is-primary"
                  type="button"
                  disabled={!isInProgress || auditBusy}
                  onClick={() => handleMarkFound(selectedItem.id)}
                >
                  Отметить найдено
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
              <span>Отсканируйте штрих‑код сканером</span>
              {lastScannedCode ? (
                <span className="scan-modal__hint">Последний код: {lastScannedCode}</span>
              ) : (
                <span className="scan-modal__hint">Ожидание сканирования…</span>
              )}
              {scanBusy ? <span className="scan-modal__hint">Обработка…</span> : null}
              {scanSuccess ? <span className="scan-modal__success">{scanSuccess}</span> : null}
              {scanError ? <span className="scan-modal__error">{scanError}</span> : null}
            </div>
            <div className="scan-modal__actions">
              <button
                type="button"
                onClick={() => {
                  setScanOpen(false)
                  setScanError(null)
                  setScanSuccess(null)
                }}
              >
                Закрыть
              </button>
              <button
                className="is-primary"
                type="button"
                onClick={() => {
                  setScanError(null)
                  setScanSuccess(null)
                  setLastScannedCode(null)
                }}
              >
                Продолжить
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
