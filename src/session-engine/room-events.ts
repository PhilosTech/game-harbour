import type {
  LobbyHeroSlotSnapshot,
  LobbyTraitSnapshot,
  PlayerCharacterSnapshot,
} from "@/types/character";
import type { ActiveSceneState } from "@/types/scene-play-state";

export type SessionPhase = "LOBBY" | "ACTIVE" | "ENDED";

export type LobbySetupSnapshot = {
  heroSlots: LobbyHeroSlotSnapshot[];
  traits: LobbyTraitSnapshot[];
  traitPointsPerStat: number;
};

export type PlayerSnapshot = {
  id: string;
  displayName: string;
  character: PlayerCharacterSnapshot | null;
};

export type RollRequest = {
  playerId: string;
  label: string;
  modifier: number;
  dc: number;
};

export type RollResult = {
  playerId: string;
  natural: number;
  modifier: number;
  total: number;
  dc: number;
  success: boolean;
};

export type DiceRollerRole = "host" | "player";

export type DiceRollPayload = {
  rollerId: string;
  rollerName: string;
  rollerRole: DiceRollerRole;
  sides: number;
  count: number;
  label: string;
  values: number[];
  total: number;
};

export type ActiveDiceRoll = DiceRollPayload & {
  id: string;
};

export type RoomEventPayload =
  | { type: "player_joined"; player: PlayerSnapshot }
  | { type: "player_left"; playerId: string }
  | { type: "session_started" }
  | {
      type: "scene_started";
      sceneKey: string;
      sceneOrder: number;
      text: string;
      imageUrl?: string;
    }
  | { type: "scene_text_visibility"; visible: boolean }
  | {
      type: "scene_task_visibility";
      taskId: string;
      text: string;
      visible: boolean;
    }
  | {
      type: "scene_illustration_visibility";
      illustrationId: string;
      imageUrl: string;
      visible: boolean;
    }
  | { type: "scene_ended"; sceneKey: string }
  | {
      type: "scene_broadcast";
      text: string;
      imageUrl?: string;
      playerTask?: string;
      sceneKey?: string;
      sceneOrder?: number;
    }
  | { type: "roll_requested"; request: RollRequest }
  | { type: "roll_result"; result: RollResult }
  | { type: "dice_roll"; roll: DiceRollPayload }
  | { type: "dice_roll_dismissed" }
  | { type: "dice_roll_request"; sides: number; count?: number }
  | { type: "host_private_note"; text: string }
  | { type: "session_ended" };

export type PersistedRoomEvent = RoomEventPayload & {
  id: string;
  createdAt: string;
};

export type RoomState = {
  sessionId: string;
  roomCode: string;
  gameTitleRu: string;
  gameTitleEn: string;
  phase: SessionPhase;
  players: PlayerSnapshot[];
  lobby: LobbySetupSnapshot;
  activeScene: ActiveSceneState | null;
  completedSceneKeys: string[];
  pendingRoll: RollRequest | null;
  lastRollResult: RollResult | null;
  activeDiceRoll: ActiveDiceRoll | null;
  hostPrivateNotes: string[];
};

export const HOST_ONLY_EVENT_TYPES = new Set<RoomEventPayload["type"]>([
  "host_private_note",
]);

export function createInitialRoomState(
  sessionId: string,
  roomCode: string,
  gameTitleRu = "",
  gameTitleEn = "",
): RoomState {
  return {
    sessionId,
    roomCode,
    gameTitleRu,
    gameTitleEn,
    phase: "LOBBY",
    players: [],
    lobby: {
      heroSlots: [],
      traits: [],
      traitPointsPerStat: 30,
    },
    activeScene: null,
    completedSceneKeys: [],
    pendingRoll: null,
    lastRollResult: null,
    activeDiceRoll: null,
    hostPrivateNotes: [],
  };
}
