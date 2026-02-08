# Auth Service

FastAPI микросервис для аутентификации и авторизации пользователей.

**What it does**
- Регистрация и логин пользователей.
- JWT access/refresh токены с отзывом refresh токенов.
- Роли и разрешения (RBAC) с назначением пользователям.
- Административные операции по управлению пользователями, ролями и разрешениями.

**Entry points**
- HTTP API: `apps/auth/app/main.py`
- Health check: `GET /health`

**Project layout**
- `app/api/v1/` — HTTP роуты.
- `app/services/` — бизнес‑логика.
- `app/models/` — SQLAlchemy модели.
- `app/schemas/` — Pydantic схемы.
- `app/core/` — конфигурация, безопасность, зависимости.
- `app/db/` — подключение к БД.
- `alembic/` — миграции.
- `tests/` — базовые заготовки для тестов.

**Runtime**
- Python 3.12
- FastAPI + Uvicorn
- SQLAlchemy 2.x
- Alembic
- PostgreSQL (по умолчанию)

**Configuration**
Все настройки читаются из окружения. Значения по умолчанию заданы в `app/core/config.py`.

- `ENV` — окружение (`development`).
- `DATABASE_URL` — строка подключения к БД (`postgresql+psycopg://auth:auth@postgres:5432/auth`).
- `SECRET_KEY` — ключ для подписи JWT.
- `JWT_ALGORITHM` — алгоритм JWT (`HS256`).
- `ACCESS_TOKEN_EXPIRES_MINUTES` — срок жизни access токена (минуты, `15`).
- `REFRESH_TOKEN_EXPIRES_DAYS` — срок жизни refresh токена (дни, `30`).
- `SYSTEM_ADMIN_ROLE` — имя системной роли администратора (`system_admin`).

Файл окружения для локального запуска: `apps/auth/.env`.

**Data model**
- `User` — пользователи.
- `Role` — роли (many-to-many с пользователями).
- `Permission` — разрешения (many-to-many с ролями).
- `RefreshToken` — refresh токены с флагом `revoked`.

**Migrations**
Миграции Alembic в `apps/auth/alembic/versions`:
- `0001` — пользователи и refresh токены.
- `0002` — роли, разрешения и связи.
- `0003` — профиль пользователя (first_name, last_name, department_id, role).

**Security**
- Пароли хэшируются `bcrypt` (через `passlib`).
- Длина пароля ограничена 72 байтами (ограничение bcrypt).
- Access токен содержит `sub`, `type=access`, а также `roles` и `permissions`.
- Refresh токен содержит `sub`, `type=refresh`, `jti`.
- Refresh токены сохраняются в БД и могут быть отозваны.

**System admin role**
При старте сервиса создается роль `SYSTEM_ADMIN_ROLE`, если ее нет.
Функция: `app/services/auth_service.ensure_system_admin_role`.

**API**
Все эндпоинты находятся под `app/api/v1`. Примеры путей приведены без префиксов.

Auth
- `POST /auth/register` — регистрация пользователя.
- `POST /auth/login` — логин, выдача пары токенов.
- `POST /auth/refresh` — обновление токенов.
- `POST /auth/logout` — отзыв refresh токена.
- `GET /auth/me` — текущий пользователь (access токен).

Users (требует системного администратора)
- `GET /auth/users` — список пользователей.
- `GET /auth/users/{user_id}` — получить пользователя.
- `POST /auth/users` — создать пользователя.
- `PUT /auth/users/{user_id}` — обновить пользователя.
- `DELETE /auth/users/{user_id}` — удалить пользователя.
- `PUT /auth/users/{user_id}/roles` — назначить роли.

Для совместимости доступны алиасы путей:
- `/admin/...`
- `/auth/admin/...`

Roles & Permissions (требует системного администратора)
- `GET /auth/roles` — список ролей.
- `POST /auth/roles` — создать роль.
- `PUT /auth/roles/{role_id}` — обновить роль.
- `DELETE /auth/roles/{role_id}` — удалить роль.
- `PUT /auth/roles/{role_id}/permissions` — назначить разрешения роли.

- `GET /auth/permissions` — список разрешений.
- `POST /auth/permissions` — создать разрешение.
- `PUT /auth/permissions/{permission_id}` — обновить разрешение.
- `DELETE /auth/permissions/{permission_id}` — удалить разрешение.

**Auth flow**
1. `POST /auth/register` для создания пользователя.
2. `POST /auth/login` для получения токенов.
3. Access токен используется для защиты API.
4. `POST /auth/refresh` обновляет пару токенов, старый refresh токен помечается как `revoked`.
5. `POST /auth/logout` отзывает refresh токен.

**Common error codes**
- `400/401` — неверные токены или учетные данные.
- `403` — доступ запрещен (не администратор).
- `404` — сущность не найдена.
- `409` — конфликт (email/role/permission уже существует).
- `422` — невалидные входные данные.

**Local run (Docker)**
Сервис можно поднять локально через `apps/auth/docker-compose.yml`.

**Local run (manual)**
1. Установить зависимости из `apps/auth/requirements.txt`.
2. Запустить миграции Alembic.
3. Запустить `uvicorn app.main:app`.

**Notes**
- Репозитории `app/repositories/*` сейчас служат заглушками для слоя доступа к данным.
- Логирование базовое и настраивается через `app/core/logging.py`.
