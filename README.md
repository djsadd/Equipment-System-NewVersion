# Equipment System

Large React project skeleton with Feature-Sliced Design (FSD), Vite, and Docker.

## Structure

- `apps/web` - React app (Vite + TypeScript)
- `apps/web/src/app` - App composition, providers, global styles
- `apps/web/src/pages` - Route-level pages
- `apps/web/src/widgets` - Page sections composed of features/entities
- `apps/web/src/features` - User scenarios and feature logic
- `apps/web/src/entities` - Domain entities (UI + model + API)
- `apps/web/src/shared` - Reusable UI kit, helpers, config, API base
- `docker` - Nginx config for production
- `apps/gateway` - FastAPI API Gateway

## Local dev (without Docker)

```bash
cd apps/web
npm install
npm run dev
```

## Docker dev

```bash
docker compose --profile dev up --build
```

Open `http://localhost:5173`.

## Docker production

```bash
docker compose --profile prod up --build
```

Open `http://localhost:8080`.

## Notes

- Vite alias: `@` -> `apps/web/src`
- SPA routing handled in `docker/nginx.conf`
- Gateway is available at `http://localhost:8000` (or via `http://localhost:8080/api/` in prod)
- Configure upstreams via `GATEWAY_ROUTES` in `docker-compose.yml` (JSON array)
# Equipment-System-NewVersion
