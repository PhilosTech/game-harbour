# Session Engine

Shared runtime for all games on Game Harbour. Game **content** lives in DB (templates, scenes); this doc describes **how a session runs**.

---

## Roles

| Role | Access | Device |
|------|--------|--------|
| **Host** (professional) | Captain's Bridge + session console | Any |
| **Player** | `/play/[code]` only | Mostly phone |

Host is narrative authority. The app syncs state; it does not auto-play the story.

---

## Core loop

```
Host picks game -> creates LiveSession -> shares code
  -> Players join -> Lobby (hero, stats, Ready) -> Host starts game
  -> [start scene | show/hide text | show/hide task | end scene | roll]* 
  -> Host ends session
```

---

## Realtime events

```typescript
type RoomEvent =
  | { type: 'player_joined'; player: Player }
  | { type: 'player_left'; playerId: string }
  | { type: 'session_started' }
  | {
      type: 'scene_started';
      sceneKey: string;
      sceneOrder: number;
      text: string;
      imageUrl?: string;
    }
  | { type: 'scene_text_visibility'; visible: boolean }
  | {
      type: 'scene_task_visibility';
      taskId: string;
      text: string;
      visible: boolean;
    }
  | { type: 'scene_ended'; sceneKey: string }
  | {
      type: 'scene_broadcast'; // legacy; maps to activeScene with text visible
      text: string;
      imageUrl?: string;
      playerTask?: string;
      sceneKey?: string;
      sceneOrder?: number;
    }
  | { type: 'roll_requested'; request: RollRequest }
  | { type: 'roll_result'; result: RollResult }
  | { type: 'host_private_note'; text: string } // host UI only, never to players
  | { type: 'session_ended' };
```

Persist each event to `SessionEvent` table; clients catch up on reconnect.

### Room state (play phase)

```typescript
type ActiveSceneState = {
  sceneKey: string;
  sceneOrder: number;
  imageUrl?: string;
  text: string;           // stored but hidden until textVisible
  textVisible: boolean;
  visibleTasks: { id: string; text: string }[];
};

type RoomState = {
  phase: 'LOBBY' | 'ACTIVE' | 'ENDED';
  players: PlayerSnapshot[];
  lobby: LobbySetupSnapshot;
  activeScene: ActiveSceneState | null;
  completedSceneKeys: string[];
  pendingRoll: RollRequest | null;
  lastRollResult: RollResult | null;
  // ...
};
```

- **scene_started** sets `textVisible: false`, `visibleTasks: []`; players see scene number + image only.
- **scene_ended** appends `sceneKey` to `completedSceneKeys` and clears `activeScene`.
- Starting a new scene auto-completes the previous active scene.

---

## Dice (MVP)

| Mechanic | Usage |
|----------|--------|
| d20 + modifier vs DC | Host sets DC, names skill |
| Advantage / disadvantage | 2d20, take high/low |
| Custom | `2d6+1` etc. |

Logic: `src/session-engine/dice.ts` - pure functions, unit tested.

---

## Host console (session)

1. **Lobby** - code, player list, hero cards, start game
2. **Scene progress** - table of all template scenes (pending / active / done)
3. **Scene panel** - start scene, show/hide text, show/hide each task, end scene
4. **Active scene** - host-only notes, visibility status
5. **Roll** - request d20 from a player
6. **Log** - all events, timestamps

Layout: multi-column on desktop; stacked sections on phone.

---

## Player UI (mobile-first)

1. **Join** - code or link, name
2. **Lobby** - pick hero, roll shared traits, Ready
3. **Play** - when scene active: image if set; text only when host shows it; tasks listed as revealed
4. **My character** - modal with hero + stats

Constraints: 375px baseline, 44px touch targets, safe-area insets, no hover-only.

---

## PWA

Players install from browser; deep link `/play/[code]` opens join flow.

---

## Success criteria (engine)

- [x] Socket.io server (`realtime/server.ts`) + client hook (`use-room-socket`)
- [x] Staged scene events (`scene_started`, text/task visibility, `scene_ended`)
- [x] Host-only events filtered on player clients
- [ ] Two phones + host laptop stay in sync (manual QA)
- [ ] Dice math covered by tests
- [ ] Reconnect within 30s restores room state
