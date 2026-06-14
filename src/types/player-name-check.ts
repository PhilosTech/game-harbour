export type PlayerNameCheckStatus =
  | "available"
  | "reconnect"
  | "blocked"
  | "session_not_found"
  | "session_ended"
  | "invalid_name"
  | "invalid_code";

export type PlayerNameCheckResult = {
  status: PlayerNameCheckStatus;
  phase?: "LOBBY" | "ACTIVE" | "ENDED";
};
