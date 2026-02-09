import { useState } from 'react'

export type DepartmentFormPayload = {
  name: string
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
  locations,
  locationsLoading,
  locationsError,
}: DepartmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
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
