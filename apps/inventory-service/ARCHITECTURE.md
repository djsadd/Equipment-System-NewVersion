# Inventory Service — предлагаемая структура и логика

Этот документ фиксирует **вариант целевой архитектуры** микросервиса инвентаризации (equipment/inventory) в контексте текущего репозитория.

## 1) Что есть сейчас (по коду)

Сервис `apps/inventory-service` — это FastAPI + SQLAlchemy + Alembic.

Текущие сущности (таблицы):
- `inventory_items`: предмет инвентаря (оборудование) с полями `location_id`, `responsible_id`, `status`, `barcode_id`, `inventory_type_id`.
- `inventory_types`: справочник типов.
- `barcodes`: справочник штрих‑кодов (уникальный `value`).
- `inventory_audits`: записи аудита по предмету.

Текущие HTTP-ручки:
- `GET/POST/PUT/DELETE /items`
- `GET/POST/PUT/DELETE /types`
- `GET/POST/DELETE /audits`
- `GET/POST/DELETE /barcodes`
- `GET /items/my` (по `responsible_id == текущий пользователь`)
- `GET /items/room/{room_id}` (проверка доступа через `location-service /rooms/my/{room_id}`)

Интеграции сейчас:
- авторизация дергает `auth-service /auth/me` (Bearer token).
- права на комнату проверяются через `location-service`.

## 2) Граница ответственности (bounded context)

**Inventory Service должен владеть “правдой” о предметах оборудования и их жизненном цикле**, а также историей перемещений/выдач/возвратов/списаний.

При этом сервис **не должен “тащить” данные пользователей/кабинетов/отделов в свою БД** — только хранить ссылки (ID) и, при необходимости, валидировать их через другие сервисы.

Рекомендуемые интеграции:
- `auth-service`: пользователи/роли (кто действует и кому выдано).
- `location-service`: помещения/кабинеты/склады (где находится).
- `departments-service`: принадлежность пользователей отделам (для ограничений/отчетов).

## 3) Целевая доменная модель

### 3.1. Основные сущности

1) `InventoryItem` (оборудование / asset)
- идентификатор, наименование, описание, фото
- `barcode_id?` (или хранить `barcode_value` напрямую — см. ниже)
- `type_id?` (тип/модель/категория)
- текущее состояние:
  - `current_location_id?` (room/warehouse в `location-service`)
  - `current_responsible_id?` (user в `auth-service`)
  - `status` (см. state machine)
- технические поля: created/updated, `version` (для optimistic locking)

2) `InventoryType` (справочник)
- `name`, `description`
- (опционально) `manufacturer`, `model`, `warranty_months`, `category`

3) `Barcode`
- либо как отдельная таблица (как сейчас),
- либо проще: поле `barcode_value` в `InventoryItem` (уникальное, индексированное).

### 3.2. События/история (важнее, чем “CRUD”)

Добавить таблицу **журнала изменений**, например `inventory_events` (или `inventory_movements`):
- `id`, `item_id`, `event_type`
- `actor_user_id` (кто выполнил операцию)
- `from_location_id?` → `to_location_id?`
- `from_responsible_id?` → `to_responsible_id?`
- `metadata` (JSON): причина, комментарий, номер акта, фото, вложения
- `created_at`

Это позволит:
- строить отчеты/историю без сложных JOIN’ов,
- прозрачно расследовать “куда делось оборудование”,
- корректно поддержать выдачу/возврат/ремонт/списание.

### 3.3. Аудит инвентаризации (проверка наличия)

Вместо одиночных `inventory_audits` часто удобнее модель “сессия аудита”:

- `audit_sessions`:
  - `id`, `location_id` (кабинет/склад), период/дата
  - `initiator_id`, `status: draft|in_progress|closed`
  - `closed_at`
- `audit_entries`:
  - `session_id`, `item_id?`, `barcode_value?`
  - `result: found|missing|misplaced|unknown`
  - `notes`, `photo`

Если оставлять текущую `inventory_audits`, то хотя бы:
- добавить `location_id` к записи аудита,
- хранить `result` как enum (не строкой),
- фиксировать “ожидаемую” локацию на момент аудита.

## 4) State machine для оборудования (статусы и переходы)

Рекомендуемая модель статусов:
- `IN_STOCK` (на складе/в комнате, ни за кем не закреплено)
- `ASSIGNED` (закреплено за кабинетом/подразделением; ответственное лицо опционально)
- `ISSUED` (выдано пользователю)
- `IN_REPAIR` (в ремонте)
- `WRITTEN_OFF` (списано, финальное состояние)

Типовые команды (и события в журнал):
- `issue(item, to_user_id, from_location_id, comment)`
- `return(item, to_location_id, comment)`
- `move(item, to_location_id, reason)`
- `start_repair(item, vendor?, ticket?, comment)`
- `finish_repair(item, to_location_id, comment)`
- `write_off(item, reason, act_number?)`

Важно: **не позволять произвольные `PUT /items` менять всё сразу** (особенно `status/location/responsible`).
Лучше выделить отдельные “командные” endpoints, которые enforce’ят допустимые переходы.

## 5) HTTP API (вариант)

### 5.1. Query/CRUD (админские)
- `GET /items` (фильтры: `type_id`, `status`, `location_id`, `responsible_id`, `barcode`, `q`)
- `GET /items/{id}`
- `POST /items` (создание asset)
- `PATCH /items/{id}` (описательные поля: title/description/image/type/category)
- `GET/POST/PUT/DELETE /types`

### 5.2. Командные операции (бизнес‑логика)
- `POST /items/{id}/issue` `{ to_user_id, comment?, issued_type? }`
- `POST /items/{id}/return` `{ to_location_id, comment? }`
- `POST /items/{id}/move` `{ to_location_id, reason? }`
- `POST /items/{id}/repair/start` `{ vendor?, ticket?, comment? }`
- `POST /items/{id}/repair/finish` `{ to_location_id, comment? }`
- `POST /items/{id}/write-off` `{ reason, act_number? }`

### 5.3. История/отчеты
- `GET /items/{id}/events`
- `GET /reports/inventory` (агрегации по типам/статусам/локациям)
- `GET /reports/issued` (кому что выдано, с фильтрами по отделу)

### 5.4. Инвентаризация (аудит)
- `POST /audit-sessions` `{ location_id, comment? }`
- `POST /audit-sessions/{id}/scan` `{ barcode_value }` → создает/обновляет entry
- `POST /audit-sessions/{id}/close` (закрытие и генерация “missing/misplaced”)
- `GET /audit-sessions/{id}` + список entries

## 6) Авторизация и права (минимальная матрица)

Ориентируясь на паттерн `require_system_admin` в других сервисах:
- **Админ**: управление типами, создание/редактирование assets, списание.
- **Обычный пользователь**:
  - `GET /items/my`
  - `GET /items/room/{room_id}` только если `location-service` подтверждает доступ.
- **Кладовщик/инвентаризатор (роль)**:
  - выдача/возврат/перемещение (командные операции)
  - проведение аудита

## 7) Предлагаемая структура папок (внутри `app/`)

Сейчас структура уже близка к “слоям”, но есть пустые `clients/` и `repositories/`.
Вариант, который хорошо масштабируется:

```
app/
  api/                 # FastAPI роуты + схемы запросов/ответов
  domain/              # сущности/enum/правила переходов статусов
  application/         # use-cases (issue/return/move/audit close)
  infrastructure/
    db/                # модели SQLAlchemy + миграции
    repositories/      # работа с БД (SQLAlchemy)
    clients/           # http-клиенты к auth/location/departments
    outbox/            # (опц.) публикация событий
  core/                # settings, deps, auth, logging
```

Если не хочется добавлять новые папки — можно оставить текущую структуру,
но **разделить “CRUD” и “команды” на уровне сервисов** (`inventory_service.py` → `inventory_commands.py` + `inventory_queries.py`).

## 8) Пошаговый план внедрения без “большого взрыва”

1) Добавить `inventory_events` и писать событие при любых изменениях `status/location/responsible`.
2) Вынести “выдачу/возврат/перемещение” в отдельные endpoints (команды) и ограничить переходы.
3) Добавить роли и зависимости (`require_system_admin`, `require_inventory_manager`).
4) Реализовать аудит “сессиями” (или расширить текущий `inventory_audits`).
5) Подключить отчеты/агрегации под страницы web (Issue/Return/RoomAudit сейчас на моках).

## 9) Замечания по текущему коду (что стоит поправить позже)

- В `app/core/events.py` создаются таблицы через `Base.metadata.create_all(...)` на старте.
  При наличии Alembic лучше оставить это только для dev, чтобы не ловить рассинхрон схемы.
- В `app/models/inventory_status.py` строки статусов выглядят как “битая” кодировка.
  Лучше хранить статус как **английский enum** (`NEW`, `IN_STOCK`, ...) и отображать локализацию на фронте.

