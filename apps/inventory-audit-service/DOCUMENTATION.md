# Inventory Audit Service (audit) — документация

Микросервис `inventory-audit-service` отвечает за процесс **инвентаризации (аудита наличия)** по локациям (комнатам): запуск сессии, сбор факта (сканы), вычисление расхождений, согласование и (опционально) применение корректировок в `inventory-service`.

## Базовые URL

- **Внутри сервиса (FastAPI):** роуты объявлены без общего префикса, например `POST /sessions/{id}/start`.
- **Через gateway (как используется во фронте):** обычно проброшено с префиксом `audit`, например `POST /audit/sessions/{id}/start`.

## Авторизация и доступ

- Все endpoints работают с `Authorization: Bearer <jwt>`.
- Проверка пользователя: `auth-service GET /auth/me` (см. `app/core/dependencies.py`).
- Роли (по умолчанию, переопределяются env):
  - `AUDIT_AUDITOR_ROLE` → `inventory_auditor` — создание/ведение сессии
  - `AUDIT_SUPERVISOR_ROLE` → `inventory_audit_supervisor` — резолвы/approve/build-actions
  - `SYSTEM_ADMIN_ROLE` → `system_admin` — `apply` (т.к. меняет данные в `inventory-service`)
- Доступ к комнате (room) проверяется через `location-service GET /rooms/my/{room_id}`:
  - при `POST /sessions` (по `payload.location_id`)
  - при `POST /sessions/{id}/start` (по `session.location_id`)

## Что в БД означает «инвентаризация началась»

Старт фиксируется **в таблице `audit_sessions`**:

- `status` меняется с `draft` на `in_progress`
- выставляются `started_at`, `started_by`
- выставляется `expected_snapshot_version` (UUID строкой)

Дополнительно, в момент старта пересоздаются «снимки» по комнате:

- `audit_expected_items` — ожидаемый состав (snapshot на момент старта)
- `audit_item_results` — результаты по item’ам (на старте все `missing`)

Практический признак «сессия реально стартовала»: `audit_sessions.status='in_progress'` и `started_at IS NOT NULL`.

## Статусы сессии

Enum: `draft → in_progress → reconciling → awaiting_approval → approved → applied` (так используется текущей логикой).

> `closed`/`canceled` присутствуют в enum, но в текущем workflow endpoints не переводят сессию в `closed`/`canceled`.

## Модель данных (PostgreSQL)

Основные таблицы (см. `app/models/*.py`):

- `audit_plans` — планы инвентаризаций (title, scope, даты, статус)
- `audit_sessions` — сессии по комнатам/локациям (status + timestamps/actors)
- `audit_expected_items` — ожидаемые item’ы на момент старта сессии
- `audit_scans` — фактические наблюдения (сканы)
  - уникальность: (`session_id`, `client_scan_id`) — идемпотентность со стороны клиента
- `audit_item_results` — агрегированный итог по item’у в сессии (`missing|found|found_in_place`)
- `audit_discrepancies` — расхождения (`missing|misplaced|unexpected|duplicate|unknown_barcode`) + резолвы
- `audit_actions` — команды, которые будут применены в `inventory-service` (сейчас генерится только `move`)

## API (v1)

### Plans

- `GET /plans` — список планов
- `GET /plans/{plan_id}` — план по id
- `POST /plans` (**audit_auditor**) — создать план
- `PATCH /plans/{plan_id}` (**audit_supervisor**) — обновить план (в т.ч. статус)

### Sessions

- `GET /sessions` — список сессий (`location_id`, `plan_id`, `status`, `limit/offset`)
- `GET /sessions/{session_id}` — сессия по id
- `POST /sessions` (**audit_auditor**) — создать сессию (делает room access check)

**Запуск / факт / итоги**

- `POST /sessions/{session_id}/start` (**audit_auditor**) — старт:
  - делает `inventory-service GET /items/room/{room_id}`
  - пересоздаёт `audit_expected_items` и `audit_item_results`
  - переводит сессию в `in_progress` + проставляет `started_at/started_by`
- `POST /sessions/{session_id}/scans` (**audit_auditor**) — добавить скан (идемпотентно по `client_scan_id`)
  - `found_location_id` обязан совпадать с `session.location_id`
  - можно передать `item_id` или `barcode_value`
  - если `item_id` не передан и есть `barcode_value`, сервис пытается резолвить item через `inventory-service POST /items/resolve`
- `GET /sessions/{session_id}/expected` — expected snapshot
- `GET /sessions/{session_id}/results` — агрегированные результаты по item’ам
- `GET /sessions/{session_id}/discrepancies` — расхождения
- `GET /sessions/{session_id}/actions` — действия (команды), которые будут применяться

**Завершение / согласование / применение**

- `POST /sessions/{session_id}/close` (**audit_auditor**) — закрыть сбор факта:
  - `in_progress → reconciling → awaiting_approval`
  - пересчитывает расхождения по всем сканам/expected
- `POST /sessions/{session_id}/approve` (**audit_supervisor**) — approve:
  - требует, чтобы не осталось `audit_discrepancies` со статусом `open`
  - переводит `awaiting_approval → approved`
- `POST /sessions/{session_id}/build-actions` (**audit_supervisor**) — построить `audit_actions` из `resolution_payload` расхождений со статусом `resolved`
- `POST /sessions/{session_id}/apply` (**system_admin**) — применить pending actions:
  - группирует `move` и вызывает `inventory-service POST /items/bulk-move`
  - при успехе переводит `approved → applied`

### Discrepancies

- `POST /discrepancies/{discrepancy_id}/resolve` (**audit_supervisor**) — выставить `resolution_status` и `resolution_payload`

### Reports

- `GET /reports/plans/{plan_id}` (**audit_supervisor**) — сводный отчёт по плану

## Переменные окружения

См. `app/core/config.py`:

- `AUDIT_DATABASE_URL` (или `DATABASE_URL`) — Postgres DSN (по умолчанию `postgresql+psycopg://auth:auth@postgres:5432/audit`)
- `AUTH_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `LOCATION_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`, `NOTIFICATION_INTERNAL_TOKEN` (опционально)
- `AUDIT_AUDITOR_ROLE`, `AUDIT_SUPERVISOR_ROLE`, `SYSTEM_ADMIN_ROLE`

