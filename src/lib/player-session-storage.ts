export type StoredPlayerSession = {
  playerId: string;
  sessionId: string;
  roomCode: string;
  displayName: string;
};

const STORAGE_PREFIX = "game-harbour-player";

function sessionKey(sessionId: string) {
  return `${STORAGE_PREFIX}:session:${sessionId}`;
}

function roomKey(roomCode: string) {
  return `${STORAGE_PREFIX}:room:${roomCode.toUpperCase()}`;
}

export function storePlayerSession(data: StoredPlayerSession): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload = JSON.stringify(data);
  localStorage.setItem(sessionKey(data.sessionId), payload);
  localStorage.setItem(roomKey(data.roomCode), payload);
}

export function getStoredPlayerSession(
  sessionId: string,
): StoredPlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  return parseStored(localStorage.getItem(sessionKey(sessionId)));
}

export function getStoredPlayerByRoomCode(
  roomCode: string,
): StoredPlayerSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  return parseStored(localStorage.getItem(roomKey(roomCode)));
}

export function clearPlayerSession(sessionId: string, roomCode?: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(sessionKey(sessionId));
  if (roomCode) {
    localStorage.removeItem(roomKey(roomCode));
  }
}

function parseStored(raw: string | null): StoredPlayerSession | null {
  if (!raw) {
    return null;
  }
  try {
    const data = JSON.parse(raw) as StoredPlayerSession;
    if (data.playerId && data.sessionId && data.roomCode && data.displayName) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}
