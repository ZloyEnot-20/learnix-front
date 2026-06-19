# Learnix — Frontend (Next.js 15)

Student and staff UI for the Learnix / IELTS platform. Talks to `learnix-backend` over REST.

## Development

```bash
cd learnix-front
pnpm install
cp .env.example .env.local   # optional — defaults to http://localhost:4000/api
pnpm dev                     # http://localhost:3000
```

Start the backend (`learnix-backend`, port `4000`) before using the app.

## Production

Environment variables are read at **build time** for `NEXT_PUBLIC_*` (baked into the client bundle).
Set them in `.env.production` on the server before building.

```bash
cp .env.production.example .env.production
# edit NEXT_PUBLIC_API_URL, BACKEND_URL, PORT

pnpm install --frozen-lockfile
pnpm prod                    # next build && next start
```

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | **Required in prod.** Public API base with `/api` suffix, e.g. `https://api.learnix.space/api` |
| `BACKEND_URL` | Optional. Origin for Next.js `/api/*` rewrites (no `/api`). Derived from `NEXT_PUBLIC_API_URL` if omitted |
| `PORT` | `next start` port (default `3000`) |

Backend `CORS_ORIGINS` must include the frontend origin (e.g. `https://learnix.space`).

Typical VPS: `nginx → Next.js (PORT) + nginx → backend (4000)`.

### Build only / run separately

```bash
pnpm build
pnpm start
```

## API client

`lib/api-client.ts` uses `lib/env.ts` → `env.config.mjs`. No hard-coded production URLs;
dev falls back to `http://localhost:4000/api` when env is unset.
