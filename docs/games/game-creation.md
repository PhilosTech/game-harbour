# Game creation / Создание игр

How hosts build games in **Master Bridge**. Product spec for the game builder and live session flow.

Related:

- **[Шаблон игры (RU, для ведущих)](./shablon-igry.ru.md)** - scenes, characters, stats, flow in plain language
- [El Dorado](./el-dorado.md) - reference system game (structure, tone, acts)
- [Session engine](../session-engine.md) - how a live session runs (same for all games)
- [Project plan](../PROJECT_PLAN.md) - stack and roadmap

---

## What is a «game» on Game Harbour?

A **game** is a reusable template (`GameTemplate` + `GameScene[]`) that a host runs many times as separate **live sessions** (room code, players, dice, log).

| Layer             | Stored where           | Purpose                                       |
| ----------------- | ---------------------- | --------------------------------------------- |
| **Game template** | PostgreSQL             | Title, description, scenes, cover, visibility |
| **Live session**  | PostgreSQL + Socket.io | One play-through with real players            |

The app does **not** auto-play the story. The host reads scenes, improvises, requests rolls. The template is a **script + cue cards**, not a video game quest engine.

**One game template, many sessions.** Creating a game does not lock it. Any host with access can start their own `LiveSession` (own room code, own players). Ten hosts can run ten parallel sessions of the same public game.

---

## Three ways to get a game

| Path                        | Who      | Result                                                                 |
| --------------------------- | -------- | ---------------------------------------------------------------------- |
| **1. Blank**                | Host     | Empty template: metadata only, host adds scenes in editor              |
| **2. Copy system template** | Host     | Full copy of e.g. El Dorado into «My games» (private draft), then edit |
| **3. Play community game**  | Any host | No copy - only **Start session** on someone else's **public** game     |

**Visibility** (separate from path):

| Setting     | Meaning                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------ |
| **Private** | Only in author's «My games»                                                                      |
| **Public**  | Also in «Community games» for all hosts; can start a session. **One-way**: private → public only |

**Status** (`DRAFT` / `PUBLISHED`) - reserved for «ready to run» quality gate later. MVP: host can start a session on own games even in `DRAFT`. System templates use `PUBLISHED`.

---

## Minimum content for a playable game

### Game template (required)

| Field                            | Required     | Notes                                                    |
| -------------------------------- | ------------ | -------------------------------------------------------- |
| `titleRu`, `titleEn`             | Per language | See bilingual rules below                                |
| `descriptionRu`, `descriptionEn` | Per language | Pitch for dashboard / community list                     |
| `coverUrl`                       | No           | Card image; upload later (MinIO/R2)                      |
| `visibility`                     | Yes          | Default `PRIVATE`                                        |
| `scenes`                         | Yes (≥1)     | **Blocked** for start session and publish until ≥1 scene |

### Bilingual content (decided)

Hosts may write in **English only**, **Russian only**, or **both**.

| Rule                              | Behaviour                                                |
| --------------------------------- | -------------------------------------------------------- |
| At least one language             | Required                                                 |
| If any field filled in a language | Title **and** description required for that language     |
| Unused language                   | Empty strings in DB; section hidden in form              |
| Form order                        | **English block first**, then Russian                    |
| Form UX                           | Checkbox per language - hide blocks you do not need      |
| Display                           | UI locale first; fallback to the other language if empty |

Helper: `src/lib/game-content-i18n.ts` (`pickLocalizedGameText`, `bilingualGameContentSchema`).

### Per scene (required)

| Field                                       | Required     | Notes                                                                    |
| ------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `sceneKey`                                  | Yes          | Stable id, e.g. `briefing`, `rapids` (latin, no spaces)                  |
| `order`                                     | Yes          | Sort order in host scene picker (1, 2, 3…)                               |
| `type`                                      | Yes          | See scene types below                                                    |
| `contentRu`, `contentEn`                    | Per language | Same bilingual rules as game metadata                                    |
| `hostOnlyNotes`                             | No           | Spoilers, DC hints, NPC names - **never** sent to players                |
| `imageUrl`                                  | No           | Scene **background**; shown when host **starts** the scene               |
| `illustrations` (`GameSceneIllustration[]`) | No           | 0-20 pictures per scene; host reveals each separately (background stays) |
| `tasks` (`GameSceneTask[]`)                 | No           | 0-20 short tasks per scene; host reveals each separately during play     |

### Acts (optional, MVP)

**Acts are not in the database yet.** El Dorado uses 3 acts in the design doc only. Host orders scenes by `order`; act titles can be notes or a future `GameAct` table.

---

## Scene types (`SceneType`)

| Type      | Host use                                         | Player sees                                                                                      |
| --------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **STORY** | Narrative beat                                   | Background on scene start; text when host toggles **Show text**; tasks when host shows each task |
| **CHECK** | Moment for dice / skill check                    | Same staged reveal as STORY; host uses dice console                                              |
| **NOTE**  | Reference only (rules, endings list, NPC roster) | Nothing - NOTE scenes are not started for players                                                |

CHECK/NOTE are labels for the host. Later: CHECK could pre-fill roll UI (skill name, suggested DC).

### Scene play flow (live session)

| Host action                     | Player UI                                                       |
| ------------------------------- | --------------------------------------------------------------- |
| **Start scene**                 | «Scene N started» + `imageUrl` if set; no text or tasks yet     |
| **Show / hide text**            | `content` visible or hidden                                     |
| **Show / hide task** (per task) | That task's localized text visible or hidden                    |
| **End scene**                   | Scene marked done in host progress table; `activeScene` cleared |

Host console shows a **scene progress table** (pending / active / done) for all template scenes.

---

## Recommended structure (authoring guide)

Not enforced by code - helps hosts write good games:

1. **Pitch** - 2-3 sentences in description (what players do, tone, length)
2. **Acts or chapters** - group scenes mentally (~3 acts, 60-90 min total)
3. **Scenes** - one clear beat each (location, conflict, choice)
4. **Host-only prep** - rivals' names, treasure amount, weather - in `hostOnlyNotes`
5. **Endings** - list in a NOTE scene or last STORY scenes (branching is host-led, not coded)

Example: [el-dorado.md](./el-dorado.md).

---

## Tone and content rules (platform default)

From product vision (hosts can deviate in own games):

| Encouraged                     | Discouraged in official templates |
| ------------------------------ | --------------------------------- |
| Real places, people, logistics | Magic, curses, monsters           |
| Moral choices, rivalry         | Supernatural as fact              |
| Skill checks, uncertainty      | Full D&D ruleset                  |

---

## Creation flow (target UX)

### Step 1 - Create metadata (implemented)

`/bridge/games/new`:

- English section (optional block)
- Russian section (optional block)
- Visibility: private or public

Creates `GameTemplate` with `status: DRAFT`, zero scenes.

### Step 2 - Edit game (implemented)

`/bridge/games/[id]/edit` - **private games only**:

- Cover upload
- Scene list: add, reorder, delete
- Per scene: type, bilingual content, host notes, image URL, multiple tasks
- Button «Make public» on dashboard when ready (needs ≥1 scene)

**Public games are frozen** - no edits after publish. Other hosts may be running sessions; changing text would confuse them.

### Step 3 - Run (implemented)

Dashboard → «Start session» (disabled until ≥1 scene) → host console → players join by code. Each click creates a **new** independent session.

---

## What the host does during a session

1. Start game when players are in lobby (min 1 player)
2. **Start scene** from the scene list (does not reveal text)
3. Optionally **show text**, then **show tasks** one by one
4. **End scene** when beat is done; progress table updates
5. Optionally request a roll (d20 + modifier vs DC)
6. End session

Player characters: see [shablon-igry.ru.md](./shablon-igry.ru.md) (RU product spec). Summary:

- Host configures **hero roster slots** per game template (presets + custom; duplicate role names allowed)
- Host picks **traits** (min 3, presets + custom); each slot has fixed strength + weakness
- Player picks hero on join, **random point pool** across shared traits, taps **Ready**
- Character modal anytime during play
- `GameHeroSlot`, `GameTrait`, `SessionPlayer.characterJson` in DB

---

## Implementation status

| Feature                                             | Status                                       |
| --------------------------------------------------- | -------------------------------------------- |
| Create game metadata                                | Done                                         |
| Flexible bilingual form (EN first)                  | Done                                         |
| Block session / publish without scenes              | Done                                         |
| Private / public visibility                         | Done                                         |
| Publish private → public                            | Done                                         |
| Public games not editable                           | Rule + server guard (`assertGameIsEditable`) |
| Duplicate system template                           | Done                                         |
| Community games list                                | Done                                         |
| Game editor (scenes CRUD)                           | Done (private games only)                    |
| Scene tasks (multiple per scene)                    | Done                                         |
| Scene image URL in editor                           | Done                                         |
| Hero roster in template                             | Done                                         |
| Traits + point generation                           | Done                                         |
| Player character card UI                            | Done                                         |
| Staged scene play (start / text / tasks / progress) | Done                                         |
| Scene image upload (MinIO)                          | Done                                         |
| Cover image upload                                  | **Not started**                              |
| Acts in DB                                          | **Not planned for MVP**                      |
| Auto branching                                      | **Out of scope**                             |

---

## Decided

| #   | Decision                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | ≥1 scene required before **Start session** and **Make public**                                                                                            |
| 2   | **Public games cannot be edited**; only private games                                                                                                     |
| 3   | No copying community games - only start session                                                                                                           |
| 4   | One template, many parallel sessions by different hosts                                                                                                   |
| 5   | Bilingual: complete each language you start; one language is OK                                                                                           |
| 6   | Form: English section first, optional language toggles                                                                                                    |
| 7   | **Hero roster slots**: host builds N slots (duplicates OK, e.g. 2× Doctor); each **slot** exclusive - one player per slot, taken slots hidden from others |
| 8   | **Stats**: reroll until player taps **Ready**; locked after                                                                                               |
| 9   | **Host** sees all player cards (hero + stats) in lobby and during play                                                                                    |
| 10  | **Scene play**: **Start scene** does not show text; image on start; text and tasks revealed separately                                                    |
| 11  | **Tasks**: 0-20 per scene in template; host shows/hides each; per-player tasks later                                                                      |
| 12  | **Scene progress table** on host console (pending / active / done)                                                                                        |

## Open (later)

| #   | Question                                     |
| --- | -------------------------------------------- | ----------------------------------- |
| 1   | Scene reorder UI                             | Drag-and-drop in editor             |
| 2   | `PUBLISHED` status for host games            | Defer; visibility is enough for MVP |
| 3   | Per-player task assignment from host console | Defer                               |

---

## File map (code)

```
prisma/schema.prisma        GameTemplate, GameScene, GameSceneTask, GameHeroSlot, GameTrait
src/server/games.ts         create, duplicate, publish, scene + task CRUD
src/server/sessions.ts      live session, scene list for host console
src/session-engine/         room events, staged activeScene state
src/components/bridge/      session-console, session-scene-panel, scene-progress-table
src/components/player/      session-room, player-lobby
docs/games/el-dorado.md     design reference for one game
```
