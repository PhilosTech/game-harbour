# Game Harbour

PWA platform for narrative tabletop-style games. Professional host uses **Master Bridge**; players join on phones.

English UI uses **British English** (harbour, not harbor).

## Stack

Next.js 15, PostgreSQL (Prisma), MinIO/R2, Auth.js, next-intl (RU/EN).

## Local setup

```bash
cp .env.example .env
npm run docker:up
npm install
npm run db:reset
```

`db:reset` recreates the local database from migrations. Seed is empty (no demo games or users).

First-time setup alternative:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run dev` starts **Next.js** (port 3000), **Socket.io** (port 3001), and Prisma client watch.
UI-only work without live rooms: `npm run dev:next`.

### When to restart `npm run dev`

| Change | Action |
|--------|--------|
| React components, styles, API routes, `messages/*.json` | Usually nothing - Next.js hot-reloads. Hard refresh if UI looks stale. |
| `realtime/`, `src/server/`, `src/session-engine/` | WebSocket process restarts automatically (`tsx watch`). Refresh the browser tab. |
| `prisma/schema.prisma` | Run `npm run db:migrate` (or `db:push` locally). Prisma client regenerates in the background; **restart `npm run dev` once** so Next.js picks up the new client. |
| `.env`, `middleware.ts`, `next.config.ts` | **Restart `npm run dev`** |
| After `npm run db:reset` | **Restart `npm run dev`** |

You do **not** need a full restart for every code edit. Restart only when env, Prisma schema, or Next config changes, or when the dev server looks stuck.

- App: http://localhost:3000/ru
- MinIO console: http://localhost:19001 (gamehubber / gamehubber_secret)
- Demo host: username `demo` / password `host123456`
- New hosts: `/ru/bridge/register` (no email, no SMTP)

## Deployment

[Vercel](https://vercel.com) + [Neon](https://neon.tech) + R2; Render for WebSocket later. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Docs

| File | Purpose |
|------|---------|
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Architecture and roadmap |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Vercel, Neon, Render |
| [docs/games/el-dorado.md](docs/games/el-dorado.md) | First game |
| [docs/session-engine.md](docs/session-engine.md) | Live session runtime |
