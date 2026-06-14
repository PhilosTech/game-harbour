import { SessionPhase } from "@prisma/client";
import { db } from "@/lib/db";
import { assertGameHasScenes, assertHostCanRunGame } from "@/server/games";
import { generateRoomCode } from "@/session-engine/room-code";
import { buildRoomState } from "@/session-engine/room-state";
import {
  formatDisplayName,
  isValidDisplayName,
  normalizeDisplayNameKey,
} from "@/session-engine/player-name";
import type { PlayerNameCheckResult } from "@/types/player-name-check";
import {
  buildLobbyHeroSlots,
  buildLobbyTraits,
  buildPlayerCharacterSnapshot,
  claimHeroSlot,
  markPlayerReady,
  rerollPlayerTraits,
} from "@/server/session-characters";
import { generateTraitRoll } from "@/session-engine/trait-pool";
import { parseStoredCharacterJson } from "@/types/character";
import type {
  LobbySetupSnapshot,
  PersistedRoomEvent,
  PlayerSnapshot,
  RoomEventPayload,
  RoomState,
} from "@/session-engine/room-events";

export { claimHeroSlot, markPlayerReady, rerollPlayerTraits };

export type SessionErrorCode =
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "ENDED"
  | "INVALID"
  | "NAME_NOT_IN_SESSION"
  | "NOT_LOBBY"
  | "SLOT_TAKEN"
  | "ALREADY_READY"
  | "NO_HERO"
  | "NO_TRAITS";

export class SessionError extends Error {
  constructor(
    message: string,
    public code: SessionErrorCode,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

export type JoinSessionResult = {
  sessionId: string;
  roomCode: string;
  playerId: string;
  displayName: string;
  phase: SessionPhase;
  reconnected: boolean;
};

export async function checkPlayerNameInSession(
  roomCode: string,
  displayName: string,
): Promise<PlayerNameCheckResult> {
  const normalizedCode = roomCode.trim().toUpperCase();
  if (!normalizedCode) {
    return { status: "invalid_code" };
  }

  if (!isValidDisplayName(displayName)) {
    return { status: "invalid_name" };
  }

  const displayNameKey = normalizeDisplayNameKey(displayName);

  const session = await db.liveSession.findUnique({
    where: { roomCode: normalizedCode },
    select: { id: true, phase: true },
  });

  if (!session) {
    return { status: "session_not_found" };
  }

  if (session.phase === SessionPhase.ENDED) {
    return { status: "session_ended", phase: session.phase };
  }

  const existingPlayer = await db.sessionPlayer.findUnique({
    where: {
      sessionId_displayNameKey: {
        sessionId: session.id,
        displayNameKey,
      },
    },
    select: { id: true },
  });

  if (existingPlayer) {
    return { status: "reconnect", phase: session.phase };
  }

  if (session.phase === SessionPhase.ACTIVE) {
    return { status: "blocked", phase: session.phase };
  }

  return { status: "available", phase: session.phase };
}

async function createUniqueRoomCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = generateRoomCode();
    const existing = await db.liveSession.findUnique({
      where: { roomCode },
      select: { id: true },
    });
    if (!existing) {
      return roomCode;
    }
  }
  throw new SessionError("Could not allocate room code", "INVALID");
}

export async function createLiveSession(hostId: string, gameId: string) {
  await assertHostCanRunGame(hostId, gameId);
  await assertGameHasScenes(gameId);
  const roomCode = await createUniqueRoomCode();

  return db.liveSession.create({
    data: {
      hostId,
      gameId,
      roomCode,
      phase: SessionPhase.LOBBY,
    },
    select: {
      id: true,
      roomCode: true,
      phase: true,
      gameId: true,
    },
  });
}

export async function joinSession(
  roomCode: string,
  displayName: string,
): Promise<JoinSessionResult> {
  if (!isValidDisplayName(displayName)) {
    throw new SessionError("Invalid display name", "INVALID");
  }

  const formattedName = formatDisplayName(displayName);
  const displayNameKey = normalizeDisplayNameKey(displayName);

  const session = await db.liveSession.findUnique({
    where: { roomCode: roomCode.toUpperCase() },
  });

  if (!session) {
    throw new SessionError("Session not found", "NOT_FOUND");
  }

  if (session.phase === SessionPhase.ENDED) {
    throw new SessionError("Session has ended", "ENDED");
  }

  const existingPlayer = await db.sessionPlayer.findUnique({
    where: {
      sessionId_displayNameKey: {
        sessionId: session.id,
        displayNameKey,
      },
    },
  });

  if (existingPlayer) {
    return {
      sessionId: session.id,
      roomCode: session.roomCode,
      playerId: existingPlayer.id,
      displayName: existingPlayer.displayName,
      phase: session.phase,
      reconnected: true,
    };
  }

  if (session.phase === SessionPhase.ACTIVE) {
    throw new SessionError(
      "Game already started. Only players who joined before start can reconnect with their name.",
      "NAME_NOT_IN_SESSION",
    );
  }

  const player = await db.sessionPlayer.create({
    data: {
      sessionId: session.id,
      displayName: formattedName,
      displayNameKey,
    },
  });

  const payload: RoomEventPayload = {
    type: "player_joined",
    player: {
      id: player.id,
      displayName: player.displayName,
      character: null,
    },
  };

  await appendSessionEvent(session.id, payload);

  return {
    sessionId: session.id,
    roomCode: session.roomCode,
    playerId: player.id,
    displayName: player.displayName,
    phase: session.phase,
    reconnected: false,
  };
}

export async function getHostActiveLiveSessions(hostId: string) {
  return db.liveSession.findMany({
    where: {
      hostId,
      phase: { in: [SessionPhase.LOBBY, SessionPhase.ACTIVE] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      game: {
        select: {
          id: true,
          titleRu: true,
          titleEn: true,
        },
      },
      _count: {
        select: { players: true },
      },
    },
  });
}

export async function getLiveSessionForHost(sessionId: string, hostId: string) {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new SessionError("Session not found", "NOT_FOUND");
  }

  if (session.hostId !== hostId) {
    throw new SessionError("Forbidden", "FORBIDDEN");
  }

  return session;
}

export async function getSessionScenesForHost(
  sessionId: string,
  hostId: string,
) {
  const session = await getLiveSessionForHost(sessionId, hostId);

  return db.gameScene.findMany({
    where: { gameId: session.gameId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      sceneKey: true,
      type: true,
      contentRu: true,
      contentEn: true,
      hostOnlyNotes: true,
      imageUrl: true,
      tasks: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          textRu: true,
          textEn: true,
        },
      },
      illustrations: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          order: true,
          imageUrl: true,
        },
      },
    },
  });
}

export async function verifyPlayerInSession(
  sessionId: string,
  playerId: string,
): Promise<boolean> {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    select: { phase: true },
  });

  if (!session || session.phase === SessionPhase.ENDED) {
    return false;
  }

  const player = await db.sessionPlayer.findFirst({
    where: { id: playerId, sessionId },
    select: { id: true },
  });
  return Boolean(player);
}

export async function appendSessionEvent(
  sessionId: string,
  payload: RoomEventPayload,
) {
  return db.sessionEvent.create({
    data: {
      sessionId,
      type: payload.type,
      payload,
    },
  });
}

export async function getRoomState(
  sessionId: string,
): Promise<RoomState | null> {
  const session = await db.liveSession.findUnique({
    where: { id: sessionId },
    include: {
      game: {
        include: {
          heroSlots: { orderBy: { order: "asc" } },
          traits: { orderBy: { order: "asc" } },
        },
      },
      players: {
        orderBy: { joinedAt: "asc" },
        include: { heroSlot: true },
      },
      events: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session) {
    return null;
  }

  const traits = session.game.traits;
  const players: PlayerSnapshot[] = session.players.map((player) => ({
    id: player.id,
    displayName: player.displayName,
    character: buildPlayerCharacterSnapshot(player, traits),
  }));

  const events: PersistedRoomEvent[] = session.events.map((event) => {
    const payload = event.payload as RoomEventPayload;
    return {
      ...payload,
      id: event.id,
      createdAt: event.createdAt.toISOString(),
    };
  });

  const lobby: LobbySetupSnapshot = {
    heroSlots: buildLobbyHeroSlots(session.game.heroSlots, session.players),
    traits: buildLobbyTraits(traits),
    traitPointsPerStat: session.game.traitPointsPerStat,
  };

  const state = buildRoomState(
    session.id,
    session.roomCode,
    session.phase,
    players,
    events,
    session.game.titleRu,
    session.game.titleEn,
  );

  return { ...state, lobby };
}

export async function startLiveSession(sessionId: string, hostId: string) {
  const session = await getLiveSessionForHost(sessionId, hostId);

  const players = await db.sessionPlayer.findMany({
    where: { sessionId },
    select: { id: true, heroSlotId: true, characterJson: true },
  });

  const game = await db.gameTemplate.findUnique({
    where: { id: session.gameId },
    select: {
      traits: { select: { id: true }, orderBy: { order: "asc" } },
      traitPointsPerStat: true,
    },
  });

  const traitIds = game?.traits.map((t) => t.id) ?? [];

  await db.$transaction(async (tx) => {
    for (const player of players) {
      if (!player.heroSlotId) {
        await tx.sessionPlayer.delete({ where: { id: player.id } });
        continue;
      }

      const character = parseStoredCharacterJson(player.characterJson);
      if (!character.isReady) {
        const rolledTraits =
          character.rolledTraits && character.rolledTraits.length > 0
            ? character.rolledTraits
            : traitIds.length > 0
              ? generateTraitRoll(traitIds, game?.traitPointsPerStat ?? 30)
              : [];

        await tx.sessionPlayer.update({
          where: { id: player.id },
          data: { characterJson: { rolledTraits, isReady: true } },
        });
      }
    }

    await tx.liveSession.update({
      where: { id: sessionId },
      data: { phase: SessionPhase.ACTIVE, startedAt: new Date() },
    });
  });

  return appendSessionEvent(sessionId, { type: "session_started" });
}

export async function endLiveSession(sessionId: string, hostId: string) {
  await getLiveSessionForHost(sessionId, hostId);

  await db.$transaction(async (tx) => {
    await tx.liveSession.update({
      where: { id: sessionId },
      data: {
        phase: SessionPhase.ENDED,
        endedAt: new Date(),
      },
    });

    await tx.sessionEvent.deleteMany({ where: { sessionId } });
    await tx.sessionPlayer.deleteMany({ where: { sessionId } });
  });

  return { id: "ended", sessionId };
}
