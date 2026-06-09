import type {
  PersistedRoomEvent,
  PlayerSnapshot,
  RoomState,
  SessionPhase,
} from './room-events';
import { createInitialRoomState } from './room-events';

function completeActiveScene(state: RoomState): RoomState {
  if (!state.activeScene) {
    return state;
  }

  const completedSceneKeys = state.completedSceneKeys.includes(state.activeScene.sceneKey)
    ? state.completedSceneKeys
    : [...state.completedSceneKeys, state.activeScene.sceneKey];

  return {
    ...state,
    completedSceneKeys,
    activeScene: null,
  };
}

export function buildRoomState(
  sessionId: string,
  roomCode: string,
  phase: SessionPhase,
  players: PlayerSnapshot[],
  events: PersistedRoomEvent[],
): RoomState {
  let state = createInitialRoomState(sessionId, roomCode);
  state.phase = phase;
  state.players = players;

  for (const event of events) {
    state = applyRoomEvent(state, event);
  }

  return state;
}

export function applyRoomEvent(
  state: RoomState,
  event: PersistedRoomEvent,
): RoomState {
  switch (event.type) {
    case 'player_joined':
      if (state.players.some((player) => player.id === event.player.id)) {
        return state;
      }
      return {
        ...state,
        players: [...state.players, event.player],
      };
    case 'player_left':
      return {
        ...state,
        players: state.players.filter((player) => player.id !== event.playerId),
      };
    case 'session_started':
      return { ...state, phase: 'ACTIVE' };
    case 'scene_started': {
      const afterComplete = completeActiveScene(state);
      return {
        ...afterComplete,
        activeScene: {
          sceneKey: event.sceneKey,
          sceneOrder: event.sceneOrder,
          imageUrl: event.imageUrl,
          text: event.text,
          textVisible: false,
          visibleTasks: [],
          visibleIllustrations: [],
        },
      };
    }
    case 'scene_text_visibility':
      if (!state.activeScene) {
        return state;
      }
      return {
        ...state,
        activeScene: {
          ...state.activeScene,
          textVisible: event.visible,
        },
      };
    case 'scene_task_visibility': {
      if (!state.activeScene) {
        return state;
      }

      const visibleTasks = event.visible
        ? [
            ...state.activeScene.visibleTasks.filter((task) => task.id !== event.taskId),
            { id: event.taskId, text: event.text },
          ]
        : state.activeScene.visibleTasks.filter((task) => task.id !== event.taskId);

      return {
        ...state,
        activeScene: {
          ...state.activeScene,
          visibleTasks,
        },
      };
    }
    case 'scene_illustration_visibility': {
      if (!state.activeScene) {
        return state;
      }

      const visibleIllustrations = event.visible
        ? [
            ...state.activeScene.visibleIllustrations.filter(
              (item) => item.id !== event.illustrationId,
            ),
            { id: event.illustrationId, imageUrl: event.imageUrl },
          ]
        : state.activeScene.visibleIllustrations.filter(
            (item) => item.id !== event.illustrationId,
          );

      return {
        ...state,
        activeScene: {
          ...state.activeScene,
          visibleIllustrations,
        },
      };
    }
    case 'scene_ended':
      return completeActiveScene(state);
    case 'scene_broadcast': {
      const afterComplete = completeActiveScene(state);
      return {
        ...afterComplete,
        activeScene: {
          sceneKey: event.sceneKey ?? '',
          sceneOrder: event.sceneOrder ?? 0,
          imageUrl: event.imageUrl,
          text: event.text,
          textVisible: true,
          visibleTasks: event.playerTask
            ? [{ id: 'legacy', text: event.playerTask }]
            : [],
          visibleIllustrations: [],
        },
      };
    }
    case 'roll_requested':
      return { ...state, pendingRoll: event.request, lastRollResult: null };
    case 'roll_result':
      return { ...state, pendingRoll: null, lastRollResult: event.result };
    case 'dice_roll':
      return {
        ...state,
        activeDiceRoll: {
          id: event.id,
          ...event.roll,
        },
      };
    case 'dice_roll_dismissed':
      return { ...state, activeDiceRoll: null };
    case 'host_private_note':
      return {
        ...state,
        hostPrivateNotes: [...state.hostPrivateNotes, event.text],
      };
    case 'session_ended':
      return { ...state, phase: 'ENDED', activeDiceRoll: null };
    default:
      return state;
  }
}
