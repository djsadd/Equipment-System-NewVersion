# Operations Service

Сервис для хранения операционных событий (журнал изменений), например `inventory_events`.

## Endpoints

- `GET /health`
- `POST /inventory/events` — создать событие (actor берется из токена)
- `GET /inventory/events` — список (только `system_admin`)
- `GET /inventory/events/{id}` — деталь (только `system_admin`)

