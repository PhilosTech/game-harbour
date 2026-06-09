# Game Harbour - Project Plan

## Vision

**Game Harbour** (рабочее имя платформы, см. варианты ниже) - PWA-платформа для настольных сюжетных игр с профессиональным ведущим.

Три зоны продукта:

| Зона | Кто | Что делает |
|------|-----|------------|
| **Публичная гавань** | Все | Лендинг, каталог игр, вход игрока по ссылке/коду |
| **Captain's Bridge** (Мастер-мостик) | Профессиональный ведущий | Библиотека игр, создание игр из шаблона, запуск сессии |
| **Player Deck** (палуба игрока) | Игроки (~90% телефон) | Мобильный UI: сцена, действия, кубики, лист персонажа |

Ведущий **всегда один профессионал** с аккаунтом. Игроки заходят без регистрации (код/ссылка).

Первая игра: [В поисках Эльдорадо / In Search of El Dorado](./games/el-dorado.md).

Спека создания игр (поля, сцены, пути): [game-creation.md](./games/game-creation.md).

---

## Naming (на выбор)

Платформа - «место, где у ведущего много игр»:

| Вариант | RU | EN | Комментарий |
|---------|----|----|-------------|
| **Game Harbour** | Игровая гавань | Game Harbour | Текущее repo-имя, метафора порта игр |
| **Quest Harbour** | Гавань квестов | Quest Harbour | Акцент на приключения |
| **Story Port** | Порт историй | Story Port | Короче, запоминается |

Финальное имя: **Game Harbour** (британское написание *harbour*). Не использовать American *harbor* или вариант *GameHubber*.

Английская локаль: **British English (en-GB)** - тексты в `messages/en.json`, URL остаётся `/en`.

Зона ведущего в UI: **Master Bridge** / **Мастер-мостик** (маршрут `/bridge`).

---

## Session model (не классический D&D)

Заимствуем **поток** настольной игры, не правила D&D:

```
Ведущий выбирает/создаёт игру -> Создаёт сессию -> Игроки join с телефона -> Сцены, действия, кубики -> Финал
```

- **Приземлённый реализм** - без магии и сверхъестественного (сокровища, джунгли, люди - ок; призраки - нет).
- **Mobile-first** для игроков; ведущий - любое устройство.

Подробнее: [session-engine.md](./session-engine.md).

---

## Tech Stack (full stack)

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | **Next.js 15** (App Router) | SSR, API routes, PWA, i18n |
| Language | **TypeScript** (strict) | Shared types client/server |
| Styling | **Tailwind CSS 4** | Mobile-first, safe-area |
| UI | **shadcn/ui** | Touch-friendly, accessible |
| i18n | **next-intl** | RU + EN, locale routing `/ru`, `/en` |
| ORM | **Prisma** | Migrations, type-safe queries |
| Database | **PostgreSQL** | Games, templates, sessions, hosts |
| Auth | **Auth.js (NextAuth v5)** | Login только для ведущих |
| Object storage | **S3-compatible** (R2 / MinIO) | Covers, scene images, uploads |
| Realtime | **Socket.io** + Redis adapter (or PartyKit) | Live session sync |
| Cache / pubsub | **Redis** (optional Phase 3) | Room state, rate limits |
| Client state | **Zustand** | Local UI state in session |
| PWA | **Serwist** + `manifest.json` | Install on phone |
| Testing | **Vitest** + **Testing Library** | Engine, API |
| Local dev | **Docker Compose** | PostgreSQL + MinIO + Redis |

### Why not frontend-only

- Ведущий создаёт и хранит игры (шаблоны) - нужна **БД**
- Картинки к играм - **object storage**
- Аккаунты ведущих - **auth + backend**
- Живые сессии - **realtime + persistence**

### Storage layout (S3/R2)

```
{bucket}/
  games/{gameId}/cover.webp
  games/{gameId}/scenes/{sceneId}.webp
  uploads/{hostId}/{assetId}.webp
```

### i18n

- Locales: `ru` (default), `en`
- UI strings: `messages/ru.json`, `messages/en.json`
- Game content: JSON fields `titleRu`, `titleEn` or nested `i18n: { ru, en }` in DB
- `next-intl` middleware on `/[locale]/...`

---

## Data model (PostgreSQL, draft)

```text
Host (User)
  id, email, name, role=host

GameTemplate
  id, hostId (null = system), slug, coverUrl
  titleRu, titleEn, descriptionRu, descriptionEn
  status: draft | published
  createdAt, updatedAt

GameAct / GameScene (or JSON blocks)
  id, gameId, order, type: story | check | note
  contentRu, contentEn
  hostOnlyNotes, imageUrl?

LiveSession
  id, gameId, hostId, roomCode, phase, startedAt, endedAt

SessionPlayer
  id, sessionId, displayName, characterJson, joinedAt

SessionEvent (log + realtime source of truth)
  id, sessionId, type, payload, createdAt

MediaAsset
  id, hostId, storageKey, mimeType, size
```

Game **builder** in Captain's Bridge edits `GameTemplate` + scenes; optional seed from system template.

---

## Folder Structure

```
game-harbour/
├── docker-compose.yml           # postgres, minio, redis
├── prisma/
│   └── schema.prisma
├── messages/
│   ├── ru.json
│   └── en.json
├── docs/
│   ├── PROJECT_PLAN.md
│   ├── session-engine.md
│   └── games/
│       └── el-dorado.md
├── public/
│   ├── manifest.json
│   └── icons/
├── src/
│   ├── app/
│   │   └── [locale]/
│   │       ├── page.tsx              # public harbour
│   │       ├── bridge/               # Captain's Bridge (auth)
│   │       │   ├── page.tsx          # game library
│   │       │   ├── games/new/        # create from template
│   │       │   ├── games/[id]/edit/
│   │       │   └── session/[id]/     # live host console
│   │       ├── play/[code]/          # player join (mobile-first)
│   │       └── api/                  # REST + auth webhooks
│   ├── components/
│   │   ├── harbour/                  # public landing
│   │   ├── bridge/                   # host UI
│   │   └── player/                   # player UI
│   ├── lib/
│   │   ├── db.ts                     # Prisma client
│   │   ├── storage.ts                # S3 upload/download
│   │   ├── auth.ts
│   │   └── realtime/
│   ├── server/                       # services, repositories
│   └── session-engine/               # dice, room events (shared)
│       ├── dice.ts
│       └── room-events.ts
└── package.json
```

Игры больше не только папки в `src/games/` - контент в **БД**, движок сессии общий (`session-engine`).

---

## Captain's Bridge (Мастер-мостик)

Экраны для профессионального ведущего:

1. **Login** - email/password or magic link (hosts only)
2. **Game library** - системные + свои игры (карточки как в гавани)
3. **Create game** - из пустого шаблона или дубликат существующей
4. **Game editor** - название, описание (ru/en), обложка, акты/сцены, картинки, заметки ведущего
5. **Start session** - выбор игры -> комната + код -> консоль ведущия
6. **Session console** - broadcast, кубики, игроки, лог (см. session-engine)

---

## Public Harbour (главная)

Игры **не** показываются на главной - они привязаны к ведущему и его сессии.

- **Участник** (основной блок, mobile-first): код комнаты + имя -> join в live session
- **Ведущий**: вход / регистрация в Master Bridge
- Отдельный маршрут `/play` - тот же join-flow (для прямых ссылок)
- PWA, переключатель RU / EN

---

## Development Phases

### Phase 0 - Planning (current)

- [x] Vision, stack, DB, storage, i18n
- [x] First game: El Dorado
- [x] Captain's Bridge concept
- [ ] Final platform display name
- [ ] Approve Prisma schema draft

### Phase 1 - Infrastructure

- [ ] Next.js + Tailwind + next-intl (ru/en)
- [ ] Docker Compose: PostgreSQL, MinIO
- [ ] Prisma schema + first migration
- [ ] Auth.js host login
- [ ] PWA manifest + icons

### Phase 2 - Captain's Bridge (CRUD)

- [ ] Game library UI
- [ ] Game editor (title, description, scenes, image upload to MinIO/R2)
- [ ] Seed: El Dorado as system game

### Phase 3 - Live session

- [ ] Create session, room code, share link
- [ ] Realtime sync (Socket.io)
- [ ] Host console + Player mobile UI
- [ ] Dice engine

### Phase 4 - Polish

- [ ] Full El Dorado content (ru/en)
- [ ] PWA on iOS/Android tested
- [ ] a11y, performance

### Phase 5 - More games

- [ ] Second template; host-created game without code deploy

---

## Non-goals (MVP)

- Игроки с аккаунтами
- Магия / сверхъестественное в официальном контенте
- Native App Store (PWA first)
- Voice/video
- Полные правила D&D 5e

---

## Open Questions

| # | Question | Default |
|---|----------|---------|
| 1 | Финальное имя платформы | Game Harbour |
| 2 | Hosting prod | Vercel + Neon PG + R2 (TBD) |
| 3 | Max players | 8 |
| 4 | Ведущих несколько в одной организации? | Один аккаунт = один ведущий (MVP) |

---

## References

- [Session engine](./session-engine.md)
- [El Dorado - first game](./games/el-dorado.md)
- `.cursor/rules/`
