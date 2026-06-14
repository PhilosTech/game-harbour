import { io, type Socket } from "socket.io-client";
import type { RoomState } from "@/session-engine/room-events";

let socket: Socket | null = null;

export function getRealtimeUrl(): string {
  return process.env.NEXT_PUBLIC_REALTIME_URL ?? "http://localhost:3001";
}

export function getRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(getRealtimeUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export type JoinAck = {
  ok: boolean;
  error?: string;
  state?: RoomState;
};

export type ActionAck = {
  ok: boolean;
  error?: string;
};
