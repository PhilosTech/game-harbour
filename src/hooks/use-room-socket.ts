"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getRealtimeSocket,
  type ActionAck,
  type JoinAck,
} from "@/lib/realtime-client";
import type { RoomEventPayload, RoomState } from "@/session-engine/room-events";

type HostJoin = {
  role: "host";
  sessionId: string;
  hostId: string;
};

type PlayerJoin = {
  role: "player";
  sessionId: string;
  playerId: string;
};

type UseRoomSocketOptions = HostJoin | PlayerJoin;

export function useRoomSocket(options: UseRoomSocketOptions | null) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionId = options?.sessionId ?? null;
  const role = options?.role ?? null;
  const hostId = options?.role === "host" ? options.hostId : null;
  const playerId = options?.role === "player" ? options.playerId : null;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!sessionId || !role) {
      return;
    }

    const socket = getRealtimeSocket();
    let isActive = true;

    const onConnect = () => {
      if (!isActive || !optionsRef.current) {
        return;
      }

      setIsConnected(true);
      setError(null);

      const joinPayload =
        optionsRef.current.role === "host"
          ? {
              sessionId: optionsRef.current.sessionId,
              role: "host" as const,
              hostId: optionsRef.current.hostId,
            }
          : {
              sessionId: optionsRef.current.sessionId,
              role: "player" as const,
              playerId: optionsRef.current.playerId,
            };

      socket.emit("room:join", joinPayload, (ack: JoinAck) => {
        if (!isActive) {
          return;
        }
        if (!ack.ok) {
          setError(ack.error ?? "Join failed");
          return;
        }
        if (ack.state) {
          setRoomState(ack.state);
        }
      });
    };

    const onState = (state: RoomState) => {
      if (isActive) {
        setRoomState(state);
      }
    };

    socket.on("connect", onConnect);
    socket.on("room:state", onState);

    if (!socket.connected) {
      socket.connect();
    } else {
      onConnect();
    }

    return () => {
      isActive = false;
      socket.off("connect", onConnect);
      socket.off("room:state", onState);
      socket.disconnect();
    };
  }, [sessionId, role, hostId, playerId]);

  const emitHostAction = useCallback(
    (event: RoomEventPayload) =>
      new Promise<ActionAck>((resolve) => {
        if (!options || options.role !== "host") {
          resolve({ ok: false, error: "Not a host" });
          return;
        }

        const socket = getRealtimeSocket();
        socket.emit(
          "host:action",
          {
            sessionId: options.sessionId,
            hostId: options.hostId,
            event,
          },
          (ack: ActionAck) => resolve(ack),
        );
      }),
    [options],
  );

  const submitRoll = useCallback(() => {
    if (!options || options.role !== "player") {
      return Promise.resolve({ ok: false, error: "Not a player" });
    }

    const socket = getRealtimeSocket();
    return new Promise<ActionAck>((resolve) => {
      socket.emit(
        "player:roll",
        {
          sessionId: options.sessionId,
          playerId: options.playerId,
        },
        (ack: ActionAck) => resolve(ack),
      );
    });
  }, [options]);

  const submitLobbyAction = useCallback(
    (
      action: "claim_slot" | "reroll_traits" | "mark_ready",
      heroSlotId?: string,
    ) => {
      if (!options || options.role !== "player") {
        return Promise.resolve({ ok: false, error: "Not a player" });
      }

      const socket = getRealtimeSocket();
      return new Promise<ActionAck>((resolve) => {
        socket.emit(
          "player:lobby_action",
          {
            sessionId: options.sessionId,
            playerId: options.playerId,
            action,
            heroSlotId,
          },
          (ack: ActionAck) => resolve(ack),
        );
      });
    },
    [options],
  );

  const submitDiceRoll = useCallback(
    (sides: number, count = 1) => {
      if (!options) {
        return Promise.resolve({ ok: false, error: "Not connected" });
      }

      if (options.role === "host") {
        return emitHostAction({ type: "dice_roll_request", sides, count });
      }

      const socket = getRealtimeSocket();
      return new Promise<ActionAck>((resolve) => {
        socket.emit(
          "player:dice_roll",
          {
            sessionId: options.sessionId,
            playerId: options.playerId,
            sides,
            count,
          },
          (ack: ActionAck) => resolve(ack),
        );
      });
    },
    [options, emitHostAction],
  );

  const dismissDiceRoll = useCallback(() => {
    if (!options || options.role !== "host") {
      return Promise.resolve({ ok: false, error: "Not a host" });
    }
    return emitHostAction({ type: "dice_roll_dismissed" });
  }, [options, emitHostAction]);

  return {
    roomState,
    isConnected,
    error,
    emitHostAction,
    submitRoll,
    submitDiceRoll,
    dismissDiceRoll,
    submitLobbyAction,
  };
}
