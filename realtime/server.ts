import { config } from "dotenv";
import { createServer } from "http";
import { Server, type Socket } from "socket.io";
import { db } from "../src/lib/db";
import {
  rollD20,
  resolveRoll,
  performDiceRoll,
  isStandardDieSides,
} from "../src/session-engine/dice";
import {
  HOST_ONLY_EVENT_TYPES,
  type DiceRollPayload,
  type RoomEventPayload,
} from "../src/session-engine/room-events";
import {
  appendSessionEvent,
  claimHeroSlot,
  endLiveSession,
  getRoomState,
  getLiveSessionForHost,
  markPlayerReady,
  rerollPlayerTraits,
  SessionError,
  startLiveSession,
  verifyPlayerInSession,
} from "../src/server/sessions";

config();

const port = Number(process.env.REALTIME_PORT ?? 3001);
const appOrigin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: appOrigin,
    methods: ["GET", "POST"],
  },
});

type JoinPayload = {
  sessionId: string;
  role: "host" | "player";
  hostId?: string;
  playerId?: string;
};

type HostActionPayload = {
  sessionId: string;
  hostId: string;
  event: RoomEventPayload;
};

type PlayerRollPayload = {
  sessionId: string;
  playerId: string;
};

type PlayerDiceRollPayload = {
  sessionId: string;
  playerId: string;
  sides: number;
  count?: number;
};

type PlayerLobbyActionPayload = {
  sessionId: string;
  playerId: string;
  action: "claim_slot" | "reroll_traits" | "mark_ready";
  heroSlotId?: string;
};

function roomChannel(sessionId: string) {
  return `session:${sessionId}`;
}

function hostChannel(sessionId: string) {
  return `session:${sessionId}:host`;
}

type HostDiceRollRequest = {
  type: "dice_roll_request";
  sides: number;
  count?: number;
};

function sanitizeStateForPlayers(
  state: Awaited<ReturnType<typeof getRoomState>>,
) {
  if (!state) {
    return state;
  }

  return {
    ...state,
    hostPrivateNotes: [],
  };
}

function buildDiceRollPayload(
  rollerId: string,
  rollerName: string,
  rollerRole: DiceRollPayload["rollerRole"],
  sides: number,
  count: number,
): DiceRollPayload {
  const roll = performDiceRoll(count, sides);
  return {
    rollerId,
    rollerName,
    rollerRole,
    ...roll,
  };
}

async function broadcastEvent(
  sessionId: string,
  payload: RoomEventPayload,
  persistedId: string,
) {
  const envelope = {
    ...payload,
    id: persistedId,
    createdAt: new Date().toISOString(),
  };

  if (HOST_ONLY_EVENT_TYPES.has(payload.type)) {
    io.to(hostChannel(sessionId)).emit("room:event", envelope);
    return;
  }

  io.to(roomChannel(sessionId)).emit("room:event", envelope);
}

async function emitRoomState(sessionId: string) {
  const state = await getRoomState(sessionId);
  if (!state) {
    return;
  }

  io.to(roomChannel(sessionId)).emit(
    "room:state",
    sanitizeStateForPlayers(state),
  );
  io.to(hostChannel(sessionId)).emit("room:state", state);
}

io.on("connection", (socket: Socket) => {
  socket.on(
    "room:join",
    async (payload: JoinPayload, ack?: (result: unknown) => void) => {
      try {
        const session = await db.liveSession.findUnique({
          where: { id: payload.sessionId },
        });

        if (!session) {
          ack?.({ ok: false, error: "Session not found" });
          return;
        }

        if (payload.role === "host") {
          if (!payload.hostId || session.hostId !== payload.hostId) {
            ack?.({ ok: false, error: "Forbidden" });
            return;
          }
          socket.join(roomChannel(session.id));
          socket.join(hostChannel(session.id));
        } else {
          if (
            !payload.playerId ||
            !(await verifyPlayerInSession(session.id, payload.playerId))
          ) {
            ack?.({ ok: false, error: "Invalid player" });
            return;
          }
          socket.join(roomChannel(session.id));
        }

        const state = await getRoomState(session.id);
        const clientState =
          payload.role === "host" ? state : sanitizeStateForPlayers(state);

        ack?.({ ok: true, state: clientState });
        socket.emit("room:state", clientState);
      } catch {
        ack?.({ ok: false, error: "Join failed" });
      }
    },
  );

  socket.on(
    "host:action",
    async (payload: HostActionPayload, ack?: (result: unknown) => void) => {
      try {
        await getLiveSessionForHost(payload.sessionId, payload.hostId);

        if (payload.event.type === "session_started") {
          const record = await startLiveSession(
            payload.sessionId,
            payload.hostId,
          );
          await broadcastEvent(
            payload.sessionId,
            { type: "session_started" },
            record.id,
          );
        } else if (payload.event.type === "session_ended") {
          await endLiveSession(payload.sessionId, payload.hostId);
          await broadcastEvent(
            payload.sessionId,
            { type: "session_ended" },
            `end-${payload.sessionId}`,
          );
        } else if (payload.event.type === "dice_roll_dismissed") {
          const record = await appendSessionEvent(
            payload.sessionId,
            payload.event,
          );
          await broadcastEvent(payload.sessionId, payload.event, record.id);
        } else if (payload.event.type === "dice_roll_request") {
          const sides = payload.event.sides;
          const count = payload.event.count ?? 1;

          if (!isStandardDieSides(sides)) {
            ack?.({ ok: false, error: "Invalid die" });
            return;
          }

          const state = await getRoomState(payload.sessionId);
          if (state?.phase !== "ACTIVE") {
            ack?.({ ok: false, error: "Game is not active" });
            return;
          }

          const rollEvent: RoomEventPayload = {
            type: "dice_roll",
            roll: buildDiceRollPayload(
              payload.hostId,
              "",
              "host",
              sides,
              count,
            ),
          };
          const record = await appendSessionEvent(payload.sessionId, rollEvent);
          await broadcastEvent(payload.sessionId, rollEvent, record.id);
        } else {
          const record = await appendSessionEvent(
            payload.sessionId,
            payload.event,
          );
          await broadcastEvent(payload.sessionId, payload.event, record.id);
        }

        await emitRoomState(payload.sessionId);
        ack?.({ ok: true });
      } catch (error) {
        ack?.({
          ok: false,
          error: error instanceof Error ? error.message : "Action failed",
        });
      }
    },
  );

  socket.on(
    "player:lobby_action",
    async (
      payload: PlayerLobbyActionPayload,
      ack?: (result: unknown) => void,
    ) => {
      try {
        if (
          !(await verifyPlayerInSession(payload.sessionId, payload.playerId))
        ) {
          ack?.({ ok: false, error: "Invalid player" });
          return;
        }

        if (payload.action === "claim_slot") {
          if (!payload.heroSlotId) {
            ack?.({ ok: false, error: "Hero slot is required" });
            return;
          }
          await claimHeroSlot(
            payload.sessionId,
            payload.playerId,
            payload.heroSlotId,
          );
        } else if (payload.action === "reroll_traits") {
          await rerollPlayerTraits(payload.sessionId, payload.playerId);
        } else if (payload.action === "mark_ready") {
          await markPlayerReady(payload.sessionId, payload.playerId);
        } else {
          ack?.({ ok: false, error: "Unknown action" });
          return;
        }

        await emitRoomState(payload.sessionId);
        ack?.({ ok: true });
      } catch (error) {
        if (error instanceof SessionError) {
          ack?.({ ok: false, error: error.message, code: error.code });
          return;
        }
        ack?.({ ok: false, error: "Lobby action failed" });
      }
    },
  );

  socket.on(
    "player:dice_roll",
    async (payload: PlayerDiceRollPayload, ack?: (result: unknown) => void) => {
      try {
        if (
          !(await verifyPlayerInSession(payload.sessionId, payload.playerId))
        ) {
          ack?.({ ok: false, error: "Invalid player" });
          return;
        }

        if (!isStandardDieSides(payload.sides)) {
          ack?.({ ok: false, error: "Invalid die" });
          return;
        }

        const state = await getRoomState(payload.sessionId);
        if (state?.phase !== "ACTIVE") {
          ack?.({ ok: false, error: "Game is not active" });
          return;
        }

        const player = state.players.find(
          (entry) => entry.id === payload.playerId,
        );
        if (!player) {
          ack?.({ ok: false, error: "Player not found" });
          return;
        }

        const count = payload.count ?? 1;
        const rollEvent: RoomEventPayload = {
          type: "dice_roll",
          roll: buildDiceRollPayload(
            payload.playerId,
            player.displayName,
            "player",
            payload.sides,
            count,
          ),
        };

        const record = await appendSessionEvent(payload.sessionId, rollEvent);
        await broadcastEvent(payload.sessionId, rollEvent, record.id);
        await emitRoomState(payload.sessionId);
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: "Dice roll failed" });
      }
    },
  );

  socket.on(
    "player:roll",
    async (payload: PlayerRollPayload, ack?: (result: unknown) => void) => {
      try {
        const state = await getRoomState(payload.sessionId);
        if (
          !state?.pendingRoll ||
          state.pendingRoll.playerId !== payload.playerId
        ) {
          ack?.({ ok: false, error: "No roll requested" });
          return;
        }

        const natural = rollD20();
        const result = resolveRoll(
          natural,
          state.pendingRoll.modifier,
          state.pendingRoll.dc,
        );

        const event: RoomEventPayload = {
          type: "roll_result",
          result: {
            playerId: payload.playerId,
            ...result,
          },
        };

        const record = await appendSessionEvent(payload.sessionId, event);
        await broadcastEvent(payload.sessionId, event, record.id);
        await emitRoomState(payload.sessionId);
        ack?.({ ok: true, result });
      } catch {
        ack?.({ ok: false, error: "Roll failed" });
      }
    },
  );
});

httpServer.listen(port, () => {
  console.log(`Realtime server listening on http://localhost:${port}`);
});
