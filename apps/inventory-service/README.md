## Inventory Service

FastAPI сервис инвентаря (equipment/assets).

### Основные endpoints

- `GET /health`
- `GET /items` — список инвентаря
- `PUT /items/{item_id}` — обновление инвентаря (в т.ч. `location_id` / `responsible_id`)
- `POST /items/bulk-move` — пакетное перемещение инвентаря
  - body: `{ "item_ids": number[], "location_id": number, "responsible_id"?: number | null }`
  - `responsible_id`:
    - отсутствует → не менять ответственное лицо
    - `null` → очистить ответственное лицо
    - число → установить ответственное лицо
