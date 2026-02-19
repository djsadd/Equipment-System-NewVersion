# Inventory Audit Service — структура и решение (полная инвентаризация)

Цель этого микросервиса — **проведение полной инвентаризации (аудита наличия)** по локациям/подразделениям с фиксацией результатов (сканы, фото, комментарии), расчетом расхождений и **контролируемым применением корректировок** в `inventory-service` после подтверждения.

## 1) Почему отдельный микросервис (bounded context)

`inventory-service` должен оставаться **источником истины** по карточке оборудования (asset): текущая локация, ответственный, статус, тип и т.д.

`inventory-audit-service` решает другую задачу:
- планирование/запуск сессий инвентаризации;
- сбор фактических данных (сканирование штрих-кодов, ручной ввод, фото);
- сравнение «ожидаемого» со «фактическим»;
- процесс согласования и применение корректировок как **команд** в `inventory-service`.

Преимущество: аудит — это процесс (workflow) со статусами, ролями и отчетностью. Если держать его в `inventory-service`, он начнет разрастаться в «оркестратор», что ухудшит поддержку и безопасность.

## 2) Интеграции

Синхронные HTTP-зависимости:
- `auth-service`: кто действует (actor), роли/права.
- `location-service`: справочник локаций и проверка доступа к комнатам/складам.
- `departments-service` (опционально): аудит по отделам/командам.
- `inventory-service`: получение списка оборудования в периметре и применение корректировок (перемещение/смена ответственного).
- `operations-service`: запись событий (audit started/closed, discrepancies approved, corrections applied).

Рекомендуемые базовые URL через env:
- `AUTH_SERVICE_URL`
- `LOCATION_SERVICE_URL`
- `DEPARTMENTS_SERVICE_URL` (опционально)
- `INVENTORY_SERVICE_URL`
- `OPERATIONS_SERVICE_URL`

## 3) Основные сценарии (workflow)

### 3.1. Планирование
1) Администратор/менеджер создает **план аудита** (audit plan): период, периметр (локации/отделы), правила (как считать «ожидаемое»), дедлайны.
2) По плану создаются **сессии** (audit sessions) по конкретным локациям (или группам локаций).

### 3.2. Проведение (сбор фактов)
1) Аудитор запускает сессию → сервис делает **снимок ожидаемых активов** (expected snapshot) из `inventory-service`.
2) В ходе обхода аудитор сканирует штрих‑коды / выбирает из списка / добавляет неизвестные.
3) Сервис на лету определяет первичный результат:
   - `found_expected` — найдено и совпадает с ожидаемой локацией,
   - `found_misplaced` — найдено, но локация не совпадает,
   - `unexpected` — найдено то, чего не было в ожидаемом списке,
   - `missing` — ожидаемое, но не найдено к моменту закрытия.

### 3.3. Сверка и согласование
1) После «закрытия обхода» сервис пересчитывает итоговые расхождения.
2) Роль «супервайзер/ответственный» подтверждает:
   - какие перемещения принять,
   - кому назначить ответственного,
   - какие позиции считать отсутствующими/списанными (если такой процесс есть — лучше отдельной операцией в `inventory-service`).

### 3.4. Применение корректировок
После утверждения сервис выполняет **детерминированный набор команд** в `inventory-service`:
- `bulk-move` / командные endpoints (предпочтительно) для смены локации/ответственного;
- запись события в `operations-service`.

Важно: применение должно быть **идемпотентным** (повтор запроса не должен «дублировать» эффект) — через `idempotency_key` на уровне `inventory-audit-service` и/или командных endpoints в `inventory-service`.

## 4) Модель данных (предлагаемая)

Ниже — ориентир, не финальная схема (можно начать проще и расширять).

### 4.1. Таблицы

**`audit_plans`**
- `id`
- `title`
- `scope_type`: `location|department|custom`
- `scope_payload` (JSON): список `location_id[]` / `department_id[]` / правила фильтрации
- `start_date`, `end_date`
- `status`: `draft|scheduled|active|closed|canceled`
- `created_by`, `created_at`

**`audit_sessions`**
- `id`
- `plan_id?`
- `location_id` (или `scope_payload` для кастомных сессий)
- `status`: `draft|in_progress|reconciling|awaiting_approval|approved|applied|closed|canceled`
- `started_by`, `started_at`
- `closed_by`, `closed_at`
- `approved_by?`, `approved_at?`
- `applied_at?`
- `expected_snapshot_version` (int/uuid)

**`audit_expected_items`** (снимок «ожидаемого» на момент старта)
- `id`
- `session_id`
- `item_id` (ID из `inventory-service`)
- `expected_location_id`
- `expected_responsible_id?`
- `barcode_value?` (денормализация для быстрого сопоставления)
- `captured_at`

**`audit_scans`** (фактические наблюдения)
- `id`
- `session_id`
- `scanner_user_id`
- `scan_time`
- `barcode_value?`
- `item_id?` (если удалось однозначно сопоставить)
- `found_location_id` (где нашли)
- `notes?`
- `photo_url?`
- `client_scan_id` (идемпотентность от устройства)

**`audit_discrepancies`** (итоговые расхождения)
- `id`
- `session_id`
- `type`: `missing|misplaced|unexpected|duplicate|unknown_barcode`
- `item_id?`
- `barcode_value?`
- `expected_location_id?`
- `found_location_id?`
- `resolution_status`: `open|resolved|ignored`
- `resolution_payload` (JSON): выбранное решение/обоснование

**`audit_actions`** (что применяем в `inventory-service`)
- `id`
- `session_id`
- `action_type`: `move|assign_responsible|clear_responsible|...`
- `payload` (JSON): например `{ item_id, to_location_id, to_responsible_id }`
- `status`: `pending|sent|done|failed`
- `idempotency_key` (unique)
- `created_at`, `last_error?`

Индексы (минимум):
- `audit_scans(session_id, barcode_value)`
- `audit_expected_items(session_id, item_id)`
- `audit_actions(idempotency_key)` unique

## 5) HTTP API (предлагаемая)

### 5.1. Служебные
- `GET /health`

### 5.2. Планы
- `POST /audit/plans`
- `GET /audit/plans`
- `GET /audit/plans/{plan_id}`
- `PATCH /audit/plans/{plan_id}` (статусы, периоды, периметр)

### 5.3. Сессии
- `POST /audit/sessions` (создать сессию/привязать к локации)
- `POST /audit/sessions/{id}/start` (сделать expected snapshot)
- `GET /audit/sessions/{id}` (детали + прогресс)
- `POST /audit/sessions/{id}/close` (закрыть обход)
- `POST /audit/sessions/{id}/approve` (утверждение)
- `POST /audit/sessions/{id}/apply` (применить корректировки в `inventory-service`)

### 5.4. Сбор фактов
- `POST /audit/sessions/{id}/scans`
  - body: `{ barcode_value?, item_id?, found_location_id, notes?, photo_url?, client_scan_id }`
- `GET /audit/sessions/{id}/expected` (ожидаемый список)
- `GET /audit/sessions/{id}/discrepancies` (расхождения)

### 5.5. Разрешение расхождений
- `POST /audit/discrepancies/{id}/resolve`
  - body: `{ resolution_status, resolution_payload }`

## 6) Авторизация (минимальный вариант)

Роли (пример):
- `system_admin`: полный доступ.
- `inventory_auditor`: запуск/сканирование в своих доступных локациях.
- `inventory_audit_supervisor`: утверждение и применение корректировок.

Проверки:
- доступ к `location_id` через `location-service` (по аналогии с `inventory-service`).
- при `apply` — требовать роль супервайзера или админа.

## 7) Структура репозитория (предлагаемая)

Ориентируемся на стиль текущих сервисов (FastAPI + SQLAlchemy + Alembic):

```text
apps/inventory-audit-service/
  README.md
  ARCHITECTURE.md
  requirements.txt
  .env.example
  alembic.ini
  alembic/
    env.py
    script.py.mako
    versions/
  docker/
    Dockerfile
  app/
    main.py
    config.py
    core/
      config.py
    db/
      base.py
      session.py
      __init__.py
    api/
      v1/
        router.py
    models/
      __init__.py
    schemas/
      __init__.py
    services/
      __init__.py
    clients/
      __init__.py
```

## 8) План внедрения (миграция от текущего состояния)

1) Запустить `inventory-audit-service` в режиме «только аудит» (без применения корректировок), чтобы проверить UX и качество данных.
2) Добавить этап `approve/apply` и минимальные командные endpoints в `inventory-service` (если сейчас есть только общий `PUT /items/{id}` — лучше выделить командные ручки).
3) Прокинуть роут через `apps/gateway` и `docker-compose.yml` (пример: путь `/audit`, upstream на новый сервис).
4) Постепенно депрекейтить/заменить старые `inventory_audits` (если они используются как «простая история проверок» — можно оставить, но источник будет `inventory-audit-service`).

