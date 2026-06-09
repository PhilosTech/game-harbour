# Deployment

## Architecture

| Service | Platform | Role |
|---------|----------|------|
| **Next.js app** (frontend + API) | **Vercel** | Pages, Route Handlers, Auth.js, Prisma |
| **PostgreSQL** | **Neon** | Game templates, sessions, hosts |
| **Object storage** | Cloudflare R2 or S3 | Game images (S3 API) |
| **Realtime** (Phase 3) | **Render** | WebSocket server (Socket.io) - Vercel is not ideal for long-lived WS |

## Why Next.js API, not Express on Vercel

- Vercel is built for Next.js serverless functions.
- CRUD, auth, uploads use **Route Handlers** in `src/app/api/`.
- Express on Vercel is possible but awkward; a separate Express on Render only makes sense for **WebSocket** in Phase 3.

## Local development

```bash
cp .env.example .env
npm run docker:up
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000/ru

Hosts register at `/bridge/register` (username only, no email service). Seed does not create demo accounts or games.

## Vercel + Neon

1. Create Neon project, copy `DATABASE_URL` with `?sslmode=require`.
2. Import GitHub repo in Vercel.
3. Environment variables:

```env
DATABASE_URL=postgresql://...@...neon.tech/gamehubber?sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://your-domain.vercel.app
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
S3_ENDPOINT=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=gamehubber
S3_PUBLIC_URL=https://cdn.example.com
```

4. Build command: `prisma generate && next build` (postinstall already runs generate).
5. Run migrations against Neon:

```bash
npx prisma migrate deploy
npm run db:seed
```

## Render (realtime WebSocket)

Socket.io runs as a separate Node process (`realtime/server.ts`). Vercel hosts Next.js only.

1. Deploy `render.yaml` service on Render (or manual Web Service).
2. Set `DATABASE_URL` (same Neon URL as Vercel).
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain.
4. On Vercel, set `NEXT_PUBLIC_REALTIME_URL` to the Render service URL.

Local: `npm run dev` runs both servers. Players and host sync via WebSocket events.

## Docker (local only)

`docker-compose.yml` runs PostgreSQL and MinIO. Not used in production when Neon + R2 are configured.
