import { useEffect, useMemo, useState } from 'react'
import type { AdminUser } from '@/shared/api/admin'
import type { Cabinet } from '@/shared/api/cabinets'
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

const INVENTORY_STATUS_OPTIONS = [
  'Новое',
  'В ремонте',
  'Отремонтировано',
  'Списано',
  'На складе',
  'Выдано',
]

type InventoryItemFormProps = {
  types: InventoryType[]
  initial?: InventoryItem
  mode?: 'create' | 'edit'
  heading?: string
  className?: string
  users?: AdminUser[]
  usersLoading?: boolean
  usersError?: string | null
  locations?: Cabinet[]
  locationsLoading?: boolean
  locationsError?: string | null
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

function getLocationLabel(location: Cabinet) {
  return location.name
}

function getLocationMeta(location: Cabinet) {
  return `${location.room_type}${location.status ? ` · ${location.status}` : ''}`
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
  locations,
  locationsLoading,
  locationsError,
  onSubmit,
  onCancel,
  busy,
  error,
}: InventoryItemFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [image, setImage] = useState(initial?.image ?? '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageName, setImageName] = useState('')
  const [imagePreview, setImagePreview] = useState(initial?.image ?? '')
  const [locationId, setLocationId] = useState(
    initial?.location_id ? String(initial.location_id) : ''
  )
  const [responsibleId, setResponsibleId] = useState(
    initial?.responsible_id ? String(initial.responsible_id) : ''
  )
  const [responsibleSearch, setResponsibleSearch] = useState('')
  const [showUserList, setShowUserList] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [showLocationList, setShowLocationList] = useState(false)
  const [status, setStatus] = useState(initial?.status ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [categorySearch, setCategorySearch] = useState('')
  const [showCategoryList, setShowCategoryList] = useState(false)
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

  useEffect(() => {
    if (!locations || !locationId) {
      return
    }
    const selected = locations.find((location) => String(location.id) === locationId)
    if (selected) {
      setLocationSearch(getLocationLabel(selected))
    }
  }, [locations, locationId])

  useEffect(() => {
    if (!types || !category) {
      return
    }
    const selected = types.find((type) => type.name === category)
    if (selected) {
      setCategorySearch(selected.name)
    }
  }, [types, category])

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

  const filteredLocations = useMemo(() => {
    if (!locations) {
      return []
    }
    const query = locationSearch.trim().toLowerCase()
    const candidates = query
      ? locations.filter((location) => {
          const label = getLocationLabel(location).toLowerCase()
          const meta = getLocationMeta(location).toLowerCase()
          return label.includes(query) || meta.includes(query)
        })
      : locations
    return candidates.slice(0, 8)
  }, [locations, locationSearch])

  const filteredCategories = useMemo(() => {
    const query = categorySearch.trim().toLowerCase()
    const candidates = query
      ? types.filter((type) => type.name.toLowerCase().includes(query))
      : types
    return candidates.slice(0, 8)
  }, [types, categorySearch])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    let imageValue = image || undefined
    if (imageFile) {
      imageValue = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('file_read_failed'))
        reader.readAsDataURL(imageFile)
      })
    }
    onSubmit({
      title: title || undefined,
      description: description || undefined,
      image: imageValue || undefined,
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
        {types.length > 0 ? (
          <div className="inventory-user-picker">
            <input
              value={categorySearch}
              onChange={(event) => {
                setCategorySearch(event.target.value)
                setCategory('')
              }}
              onFocus={() => setShowCategoryList(true)}
              onBlur={() => {
                window.setTimeout(() => setShowCategoryList(false), 120)
              }}
              placeholder="Тип инвентаря"
            />
            {showCategoryList && filteredCategories.length > 0 && (
              <div className="inventory-user-picker__list">
                {filteredCategories.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className="inventory-user-picker__option"
                    onClick={() => {
                      setCategory(type.name)
                      setCategorySearch(type.name)
                      setShowCategoryList(false)
                    }}
                  >
                    <span className="inventory-user-picker__name">{type.name}</span>
                  </button>
                ))}
              </div>
            )}
            {category && <div className="inventory-user-picker__value">Выбрано: {category}</div>}
          </div>
        ) : (
          <input value={category} onChange={(event) => setCategory(event.target.value)} />
        )}
      </label>
      <label>
        Статус
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Не выбран</option>
          {INVENTORY_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <label>
        Изображение
        <div className="inventory-image-field">
          <input
            type="file"
            accept="image/*"
            id="inventory-image"
            className="inventory-image-input"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setImageFile(file)
              setImageName(file?.name ?? '')
              if (file) {
                const url = URL.createObjectURL(file)
                setImagePreview(url)
                setImage('')
              } else {
                setImagePreview('')
              }
            }}
          />
          <div className="inventory-image-actions">
            <label htmlFor="inventory-image" className="inventory-image-button">
              Выбрать файл
            </label>
            <span className="inventory-image-name">{imageName || 'Файл не выбран'}</span>
          </div>
          {imagePreview && (
            <div className="inventory-image-preview">
              <img src={imagePreview} alt="preview" />
            </div>
          )}
        </div>
      </label>
      <label>
        Локация ID
        {locations ? (
          <div className="inventory-user-picker">
            <input
              value={locationSearch}
              onChange={(event) => {
                setLocationSearch(event.target.value)
                setLocationId('')
              }}
              onFocus={() => setShowLocationList(true)}
              onBlur={() => {
                window.setTimeout(() => setShowLocationList(false), 120)
              }}
              placeholder="Номер, тип или статус кабинета"
            />
            {locationsLoading && <div className="inventory-user-picker__hint">Загрузка кабинетов...</div>}
            {!locationsLoading && locationsError && (
              <div className="inventory-user-picker__error">{locationsError}</div>
            )}
            {!locationsLoading && !locationsError && showLocationList && filteredLocations.length > 0 && (
              <div className="inventory-user-picker__list">
                {filteredLocations.map((location) => (
                  <button
                    key={location.id}
                    type="button"
                    className="inventory-user-picker__option"
                    onClick={() => {
                      setLocationId(String(location.id))
                      setLocationSearch(getLocationLabel(location))
                      setShowLocationList(false)
                    }}
                  >
                    <span className="inventory-user-picker__name">{getLocationLabel(location)}</span>
                    <span className="inventory-user-picker__meta">{getLocationMeta(location)}</span>
                  </button>
                ))}
              </div>
            )}
            {locationId && (
              <div className="inventory-user-picker__value">Выбрано: ID {locationId}</div>
            )}
          </div>
        ) : (
          <input
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            inputMode="numeric"
          />
        )}
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
