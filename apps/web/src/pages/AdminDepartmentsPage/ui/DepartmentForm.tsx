import { useState } from 'react'

export type DepartmentFormPayload = {
  name: string
  department_type_id?: number | null
  location_id?: number | null
  status?: string | null
}

type DepartmentFormProps = {
  initial?: DepartmentFormPayload
  onSubmit: (payload: DepartmentFormPayload) => void
  onCancel?: () => void
  busy?: boolean
  error?: string | null
  submitLabel?: string
  title?: string
  departmentTypes?: { id: number; name: string; status?: string | null }[]
  departmentTypesLoading?: boolean
  departmentTypesError?: string | null
  locations?: { id: number; name: string }[]
  locationsLoading?: boolean
  locationsError?: string | null
}

export function DepartmentForm({
  initial,
  onSubmit,
  onCancel,
  busy,
  error,
  submitLabel = 'Сохранить',
  title = 'Департамент',
  departmentTypes,
  departmentTypesLoading,
  departmentTypesError,
  locations,
  locationsLoading,
  locationsError,
}: DepartmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [departmentTypeId, setDepartmentTypeId] = useState(
    typeof initial?.department_type_id === 'number' ? String(initial.department_type_id) : ''
  )
  const [locationId, setLocationId] = useState(
    initial?.location_id ? String(initial.location_id) : ''
  )
  const [status, setStatus] = useState(initial?.status ?? 'Активен')

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }
    onSubmit({
      name: trimmedName,
      department_type_id: departmentTypeId ? Number(departmentTypeId) : null,
      location_id: locationId ? Number(locationId) : null,
      status: status || null,
    })
  }

  return (
    <form className="admin__form" onSubmit={handleSubmit}>
      <h2>{title}</h2>
      <label>
        Название
        <input value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label>
        Тип отдела
        {departmentTypes ? (
          <select
            value={departmentTypeId}
            onChange={(event) => setDepartmentTypeId(event.target.value)}
            disabled={departmentTypesLoading}
          >
            <option value="">Не выбран</option>
            {departmentTypes.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={departmentTypeId}
            onChange={(event) => setDepartmentTypeId(event.target.value)}
            inputMode="numeric"
            placeholder="ID типа"
          />
        )}
      </label>
      {departmentTypesLoading ? <p className="admin__error">Загрузка типов...</p> : null}
      {departmentTypesError ? <p className="admin__error">{departmentTypesError}</p> : null}
      <label>
        Локация
        {locations ? (
          <select
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            disabled={locationsLoading}
          >
            <option value="">Не выбрана</option>
            {locations.map((location) => (
              <option key={location.id} value={String(location.id)}>
                {location.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
            inputMode="numeric"
          />
        )}
      </label>
      {locationsLoading ? <p className="admin__error">Загрузка локаций...</p> : null}
      {locationsError ? <p className="admin__error">{locationsError}</p> : null}
      <label>
        Статус
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="Активен">Активен</option>
          <option value="Приостановлен">Приостановлен</option>
        </select>
      </label>
      {error ? <p className="admin__error">{error}</p> : null}
      <div className="admin__actions">
        <button type="submit" className="is-primary" disabled={busy}>
          {submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} disabled={busy}>
            Отмена
          </button>
        ) : null}
      </div>
    </form>
  )
}
