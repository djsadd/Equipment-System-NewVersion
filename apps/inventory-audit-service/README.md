# Inventory Audit Service

Микросервис для проведения **полной инвентаризации (аудита)**: планирование сессий, сбор фактических данных (сканы/фото), расчет расхождений и применение корректировок в `inventory-service` после утверждения.

Подробности: `apps/inventory-audit-service/ARCHITECTURE.md`.

## Endpoints (через gateway)

- `POST /audit/plans`
- `POST /audit/sessions`
- `POST /audit/sessions/{id}/start`
- `POST /audit/sessions/{id}/scans`
- `POST /audit/sessions/{id}/close`
- `POST /audit/discrepancies/{id}/resolve`
- `POST /audit/sessions/{id}/approve`
- `POST /audit/sessions/{id}/build-actions`
- `POST /audit/sessions/{id}/apply` (требует `system_admin`, т.к. вызывает `inventory-service /items/bulk-move`)

## Troubleshooting

Если увидишь ошибку `FATAL:  database "audit" does not exist`, значит `postgres_data` volume был создан до добавления БД `audit`.
Решения:
- создать БД вручную: `docker compose exec -T postgres psql -U auth -d postgres -c "CREATE DATABASE audit OWNER auth;"`
- либо пересоздать volume (удалит данные): `docker compose down -v && docker compose up --build`
