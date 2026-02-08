import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from '@/shared/api/admin'
import type { InventoryItem, InventoryType } from '@/shared/api/inventory'

export type InventoryItemFormPayload = {
  title?: string | null
  description?: string | null
  image?: string | null
  barcode_id?: number | null
  location_id?: number | null
  responsible_id?: number | null
  status?: string | null
  category?: string | null
  last_inventory_at?: string | null
  last_audit_at?: string | null
  inventory_type_id?: number | null
}

type InventoryItemFormProps = {
  types: InventoryType[]
  initial?: InventoryItem
  mode?: 'create' | 'edit'
  heading?: string
  className?: string
  users?: AdminUser[]
  usersLoading?: boolean
  usersError?: string | null
  onSubmit: (payload: InventoryItemFormPayload) => void
  onCancel: () => void
  busy?: boolean
  error?: string | null
}

function getUserLabel(user: AdminUser) {
  if (user.full_name) {
    return user.full_name
  }
  const parts = [user.first_name, user.last_name].filter(Boolean)
  if (parts.length > 0) {
    return parts.join(' ')
  }
  return user.email
}

function getUserMeta(user: AdminUser) {
  const department = user.department_id ? `Отдел ${user.department_id}` : 'Отдел не указан'
  return `${user.email} · ${department}`
}

export function InventoryItemForm({
  types,
  initial,
  mode = 'create',
  heading,
  className,
  users,
  usersLoading,
  usersError,
  onSubmit,
  onCancel,
  busy,
  error,
}: InventoryItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [barcodeId, setBarcodeId] = useState(initial?.barcode_id ? String(initial.barcode_id) : '')
  const [locationId, setLocationId] = useState(
    initial?.location_id ? String(initial.location_id) : ''
  )
  const [responsibleId, setResponsibleId] = useState(
    initial?.responsible_id ? String(initial.responsible_id) : ''
  )
  const [responsibleSearch, setResponsibleSearch] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [status, setStatus] = useState(initial?.status ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [lastInventoryAt, setLastInventoryAt] = useState(initial?.last_inventory_at ?? '')
  const [lastAuditAt, setLastAuditAt] = useState(initial?.last_audit_at ?? '')
  const [inventoryTypeId, setInventoryTypeId] = useState(
    initial?.inventory_type_id ? String(initial.inventory_type_id) : ''
  )

  useEffect(() => {
    if (!users || !responsibleId) {
      return
    }
    const selected = users.find((user) => String(user.id) === responsibleId)
    if (selected) {
      setResponsibleSearch(getUserLabel(selected))
    }
  }, [users, responsibleId])

  const filteredUsers = useMemo(() => {
    if (!users) {
      return []
    }
    const query = responsibleSearch.trim().toLowerCase()
    const candidates = query
      ? users.filter((user) => {
          const label = getUserLabel(user).toLowerCase()
          const meta = getUserMeta(user).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : users
    return candidates.slice(0, 8)
  }, [users, responsibleSearch])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit({
      title: title || undefined,
      description: description || undefined,
      image: image || undefined,
      barcode_id: barcodeId ? Number(barcodeId) : undefined,
      location_id: locationId ? Number(locationId) : undefined,
      responsible_id: responsibleId ? Number(responsibleId) : undefined,
      status: status || undefined,
      category: category || undefined,
      last_inventory_at: lastInventoryAt || undefined,
      last_audit_at: lastAuditAt || undefined,
      inventory_type_id: inventoryTypeId ? Number(inventoryTypeId) : undefined,
    })
  }

  const resolvedHeading = heading ?? (mode === 'edit' ? 'Редактировать инвентарь' : 'Создать инвентарь')

  return (
    <form className={['admin__form', className].filter(Boolean).join(' ')} onSubmit={handleSubmit}>
      <h2>{resolvedHeading}</h2>
      <label>
        Название
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Описание
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <label>
        Категория
        <input value={category} onChange={(event) => setCategory(event.target.value)} />
      </label>
      <label>
        Статус
        <input value={status} onChange={(event) => setStatus(event.target.value)} />
      </label>
      <label>
        Ссылка на изображение
        <input value={image} onChange={(event) => setImage(event.target.value)} />
      </label>
      <label>
        Штрихкод ID
        <input
          value={barcodeId}
          onChange={(event) => setBarcodeId(event.target.value)}
          inputMode="numeric"
        />
      </label>
      <label>
        Локация ID
        <input
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
          inputMode="numeric"
        />
      </label>
      <label>
        Ответственный (user_id)
        {users ? (
          <div className="inventory-user-picker">
            <input
              value={responsibleSearch}
              onChange={(event) => {
                setResponsibleSearch(event.target.value)
                setResponsibleId('')
              }}
              onFocus={() => setShowUserList(true)}
              onBlur={() => {
                window.setTimeout(() => setShowUserList(false), 120)
              }}
              placeholder="ФИО, почта или отдел"
            />
            {usersLoading && <div className="inventory-user-picker__hint">Загрузка пользователей...</div>}
            {!usersLoading && usersError && (
              <div className="inventory-user-picker__error">{usersError}</div>
            )}
            {!usersLoading && !usersError && showUserList && filteredUsers.length > 0 && (
              <div className="inventory-user-picker__list">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="inventory-user-picker__option"
                    onClick={() => {
                      setResponsibleId(String(user.id))
                      setResponsibleSearch(getUserLabel(user))
                      setShowUserList(false)
                    }}
                  >
                    <span className="inventory-user-picker__name">{getUserLabel(user)}</span>
                    <span className="inventory-user-picker__meta">{getUserMeta(user)}</span>
                  </button>
                ))}
              </div>
            )}
            {responsibleId && (
              <div className="inventory-user-picker__value">Выбрано: ID {responsibleId}</div>
            )}
          </div>
        ) : (
          <input
            value={responsibleId}
            onChange={(event) => setResponsibleId(event.target.value)}
            inputMode="numeric"
          />
        )}
      </label>
      <label>
        Тип инвентаря
        <select value={inventoryTypeId} onChange={(event) => setInventoryTypeId(event.target.value)}>
          <option value="">Не выбран</option>
          {types.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Дата последней инвентаризации
        <input
          type="datetime-local"
          value={lastInventoryAt}
          onChange={(event) => setLastInventoryAt(event.target.value)}
        />
      </label>
      <label>
        Дата последнего аудита
        <input
          type="datetime-local"
          value={lastAuditAt}
          onChange={(event) => setLastAuditAt(event.target.value)}
        />
      </label>
      {error && <p>{error}</p>}
      <div className="inventory__actions">
        <button type="button" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="is-primary" disabled={busy}>
          {mode === 'edit' ? 'Сохранить' : 'Создать'}
        </button>
      </div>
    </form>
  )
}
