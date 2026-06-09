'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export const PLAYER_NOTES_DATA_ROW_COUNT = 2;

export type PlayerNotesGrid = string[][];

export type HostPlayerNotesState = Record<string, PlayerNotesGrid>;

const STORAGE_PREFIX = 'game-harbour:host-player-notes';

function storageKey(sessionId: string) {
  return `${STORAGE_PREFIX}:${sessionId}`;
}

export function createEmptyPlayerNotesGrid(sceneCount: number): PlayerNotesGrid {
  return Array.from({ length: PLAYER_NOTES_DATA_ROW_COUNT }, () =>
    Array.from({ length: sceneCount }, () => ''),
  );
}

export function normalizePlayerNotesGrid(
  grid: PlayerNotesGrid | undefined,
  sceneCount: number,
): PlayerNotesGrid {
  return Array.from({ length: PLAYER_NOTES_DATA_ROW_COUNT }, (_, rowIndex) => {
    const row = grid?.[rowIndex] ?? [];
    return Array.from({ length: sceneCount }, (_, colIndex) => row[colIndex] ?? '');
  });
}

function readStoredNotes(sessionId: string): HostPlayerNotesState {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey(sessionId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as HostPlayerNotesState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStoredNotes(sessionId: string, state: HostPlayerNotesState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(storageKey(sessionId), JSON.stringify(state));
  } catch {
    // Ignore quota errors for host scratch notes.
  }
}

function removeStoredNotes(sessionId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(storageKey(sessionId));
}

export function useHostPlayerNotes(
  sessionId: string,
  playerIds: string[],
  sceneCount: number,
) {
  const [notesByPlayer, setNotesByPlayer] = useState<HostPlayerNotesState>({});

  useEffect(() => {
    setNotesByPlayer(readStoredNotes(sessionId));
  }, [sessionId]);

  const normalizedNotes = useMemo(() => {
    const next: HostPlayerNotesState = {};

    for (const playerId of playerIds) {
      next[playerId] = normalizePlayerNotesGrid(notesByPlayer[playerId], sceneCount);
    }

    return next;
  }, [notesByPlayer, playerIds, sceneCount]);

  useEffect(() => {
    if (Object.keys(normalizedNotes).length === 0) {
      return;
    }
    writeStoredNotes(sessionId, normalizedNotes);
  }, [normalizedNotes, sessionId]);

  const setCell = useCallback(
    (playerId: string, rowIndex: number, sceneIndex: number, value: string) => {
      setNotesByPlayer((current) => {
        const grid = normalizePlayerNotesGrid(current[playerId], sceneCount);
        const nextGrid = grid.map((row, rowIdx) =>
          rowIdx === rowIndex
            ? row.map((cell, colIdx) => (colIdx === sceneIndex ? value : cell))
            : [...row],
        );

        return {
          ...current,
          [playerId]: nextGrid,
        };
      });
    },
    [sceneCount],
  );

  const clearNotes = useCallback(() => {
    setNotesByPlayer({});
    removeStoredNotes(sessionId);
  }, [sessionId]);

  return {
    notesByPlayer: normalizedNotes,
    setCell,
    clearNotes,
  };
}
