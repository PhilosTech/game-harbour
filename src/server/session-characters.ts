import { SessionPhase, type GameHeroSlot, type GameTrait, type SessionPlayer } from '@prisma/client';
import { db } from '@/lib/db';
import { generateTraitRoll } from '@/session-engine/trait-pool';
import {
  EMPTY_CHARACTER_JSON,
  type LobbyHeroSlotSnapshot,
  type LobbyTraitSnapshot,
  type PlayerCharacterSnapshot,
  parseStoredCharacterJson,
} from '@/types/character';
import { SessionError } from '@/server/sessions';

type PlayerWithSlot = SessionPlayer & {
  heroSlot: GameHeroSlot | null;
};

function assertLobbyPhase(phase: SessionPhase) {
  if (phase !== SessionPhase.LOBBY) {
    throw new SessionError('Lobby actions are only allowed before the game starts', 'NOT_LOBBY');
  }
}

async function getPlayerInLobby(sessionId: string, playerId: string) {
  const player = await db.sessionPlayer.findFirst({
    where: { id: playerId, sessionId },
    include: {
      session: { select: { phase: true, gameId: true } },
      heroSlot: true,
    },
  });

  if (!player) {
    throw new SessionError('Player not found', 'NOT_FOUND');
  }

  assertLobbyPhase(player.session.phase);
  return player;
}

export function buildPlayerCharacterSnapshot(
  player: PlayerWithSlot,
  traits: GameTrait[],
): PlayerCharacterSnapshot | null {
  const character = parseStoredCharacterJson(player.characterJson);
  const slot = player.heroSlot;

  if (!slot) {
    return {
      heroSlotId: null,
      heroLabelRu: '',
      heroLabelEn: '',
      strengthTraitRu: '',
      strengthTraitEn: '',
      strengthValue: 0,
      weaknessTraitRu: '',
      weaknessTraitEn: '',
      weaknessValue: 0,
      rolledTraits: character.rolledTraits
        ? character.rolledTraits.map((rolled) => {
            const trait = traits.find((item) => item.id === rolled.traitId);
            return {
              traitId: rolled.traitId,
              labelRu: trait?.labelRu ?? '',
              labelEn: trait?.labelEn ?? '',
              value: rolled.value,
            };
          })
        : null,
      isReady: character.isReady,
    };
  }

  return {
    heroSlotId: slot.id,
    heroLabelRu: slot.labelRu,
    heroLabelEn: slot.labelEn,
    strengthTraitRu: slot.strengthTraitRu,
    strengthTraitEn: slot.strengthTraitEn,
    strengthValue: slot.strengthValue,
    weaknessTraitRu: slot.weaknessTraitRu,
    weaknessTraitEn: slot.weaknessTraitEn,
    weaknessValue: slot.weaknessValue,
    rolledTraits: character.rolledTraits
      ? character.rolledTraits.map((rolled) => {
          const trait = traits.find((item) => item.id === rolled.traitId);
          return {
            traitId: rolled.traitId,
            labelRu: trait?.labelRu ?? '',
            labelEn: trait?.labelEn ?? '',
            value: rolled.value,
          };
        })
      : null,
    isReady: character.isReady,
  };
}

export function buildLobbyHeroSlots(
  heroSlots: GameHeroSlot[],
  players: SessionPlayer[],
): LobbyHeroSlotSnapshot[] {
  const claims = new Map(
    players
      .filter((player) => player.heroSlotId)
      .map((player) => [player.heroSlotId as string, player.id]),
  );

  return heroSlots.map((slot) => ({
    id: slot.id,
    order: slot.order,
    labelRu: slot.labelRu,
    labelEn: slot.labelEn,
    strengthTraitRu: slot.strengthTraitRu,
    strengthTraitEn: slot.strengthTraitEn,
    strengthValue: slot.strengthValue,
    weaknessTraitRu: slot.weaknessTraitRu,
    weaknessTraitEn: slot.weaknessTraitEn,
    weaknessValue: slot.weaknessValue,
    claimedByPlayerId: claims.get(slot.id) ?? null,
  }));
}

export function buildLobbyTraits(traits: GameTrait[]): LobbyTraitSnapshot[] {
  return traits.map((trait) => ({
    id: trait.id,
    labelRu: trait.labelRu,
    labelEn: trait.labelEn,
  }));
}

export async function claimHeroSlot(
  sessionId: string,
  playerId: string,
  heroSlotId: string,
) {
  const player = await getPlayerInLobby(sessionId, playerId);
  const character = parseStoredCharacterJson(player.characterJson);

  if (character.isReady) {
    throw new SessionError('Character is already locked', 'ALREADY_READY');
  }

  const slot = await db.gameHeroSlot.findFirst({
    where: { id: heroSlotId, gameId: player.session.gameId },
  });

  if (!slot) {
    throw new SessionError('Hero slot not found', 'NOT_FOUND');
  }

  const taken = await db.sessionPlayer.findFirst({
    where: {
      sessionId,
      heroSlotId,
      NOT: { id: playerId },
    },
    select: { id: true },
  });

  if (taken) {
    throw new SessionError('Hero slot is already taken', 'SLOT_TAKEN');
  }

  return db.sessionPlayer.update({
    where: { id: playerId },
    data: {
      heroSlotId,
      characterJson: EMPTY_CHARACTER_JSON,
    },
  });
}

export async function rerollPlayerTraits(sessionId: string, playerId: string) {
  const player = await getPlayerInLobby(sessionId, playerId);
  const character = parseStoredCharacterJson(player.characterJson);

  if (!player.heroSlotId) {
    throw new SessionError('Pick a hero first', 'NO_HERO');
  }

  if (character.isReady) {
    throw new SessionError('Character is already locked', 'ALREADY_READY');
  }

  const game = await db.gameTemplate.findUnique({
    where: { id: player.session.gameId },
    include: { traits: { orderBy: { order: 'asc' } } },
  });

  if (!game || game.traits.length < 3) {
    throw new SessionError('Game traits are not configured', 'INVALID');
  }

  const rolledTraits = generateTraitRoll(
    game.traits.map((trait) => trait.id),
    game.traitPointsPerStat,
  );

  return db.sessionPlayer.update({
    where: { id: playerId },
    data: {
      characterJson: {
        rolledTraits,
        isReady: false,
      },
    },
  });
}

export async function markPlayerReady(sessionId: string, playerId: string) {
  const player = await getPlayerInLobby(sessionId, playerId);
  const character = parseStoredCharacterJson(player.characterJson);

  if (!player.heroSlotId) {
    throw new SessionError('Pick a hero first', 'NO_HERO');
  }

  if (!character.rolledTraits || character.rolledTraits.length === 0) {
    throw new SessionError('Generate traits before marking ready', 'NO_TRAITS');
  }

  if (character.isReady) {
    return player;
  }

  return db.sessionPlayer.update({
    where: { id: playerId },
    data: {
      characterJson: {
        rolledTraits: character.rolledTraits,
        isReady: true,
      },
    },
  });
}
