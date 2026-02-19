# Notification Service

FastAPI microservice that stores and serves in-app notifications.

## Public API (via gateway)

Gateway route: `/notifications` → upstream `http://notifications:8000`

- `GET /notifications` — list current user notifications
- `GET /notifications/unread-count`
- `POST /notifications/mark-read`
- `POST /notifications/mark-all-read`
- `GET /notifications/preferences`
- `PUT /notifications/preferences`

Authentication: `Authorization: Bearer <token>` (validated via `AUTH_SERVICE_URL` → `/auth/me`).

## Internal API (service-to-service)

- `POST /internal/notifications` — create notifications for specific users

Security: header `X-Internal-Token: <NOTIFICATION_INTERNAL_TOKEN>`.

## Environment

- `NOTIFICATIONS_DATABASE_URL` (or `DATABASE_URL`)
- `AUTH_SERVICE_URL`
- `NOTIFICATION_INTERNAL_TOKEN`

