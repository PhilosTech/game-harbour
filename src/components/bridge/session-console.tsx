"use client";

import { HostPlayerCard } from "@/components/bridge/host-player-card";
import { RoomCodeCopy } from "@/components/bridge/room-code-copy";
import { SceneProgressTable } from "@/components/bridge/scene-progress-table";
import { SessionScenePanel } from "@/components/bridge/session-scene-panel";
import { StartGameConfirm } from "@/components/bridge/start-game-confirm";
import { DiceRollButton } from "@/components/shared/dice-roll-button";
import { DiceRollOverlay } from "@/components/shared/dice-roll-overlay";
import { useHostPlayerNotes } from "@/hooks/use-host-player-notes";
import { useRoomSocket } from "@/hooks/use-room-socket";
import type { SessionSceneData } from "@/types/session-scene";
import { useLocale, useTranslations } from "next-intl";
import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import { useEffect, useMemo, useState } from "react";

type SessionConsoleProps = {
  sessionId: string;
  hostId: string;
  roomCode: string;
  scenes: SessionSceneData[];
  masterNotes: string;
};

const panelClass = "rounded-2xl border border-border bg-card p-5";

export function SessionConsole({
  sessionId,
  hostId,
  roomCode,
  scenes,
  masterNotes,
}: SessionConsoleProps) {
  const t = useTranslations("session");
  const td = useTranslations("dice");
  const locale = useLocale();
  const {
    roomState,
    isConnected,
    error,
    emitHostAction,
    submitDiceRoll,
    dismissDiceRoll,
  } = useRoomSocket({
    role: "host",
    sessionId,
    hostId,
  });

  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const playerCount = roomState?.players.length ?? 0;
  const readyCount =
    roomState?.players.filter((player) => player.character?.isReady).length ??
    0;

  const onStart = async () => {
    setIsStarting(true);
    try {
      await emitHostAction({ type: "session_started" });
      setShowStartConfirm(false);
    } finally {
      setIsStarting(false);
    }
  };

  const onEnd = async () => {
    await emitHostAction({ type: "session_ended" });
  };

  const phase = roomState?.phase ?? "LOBBY";
  const activeScene = roomState?.activeScene ?? null;
  const activeDiceRoll = roomState?.activeDiceRoll ?? null;
  const completedSceneKeys = roomState?.completedSceneKeys ?? [];
  const playerIds = useMemo(
    () => (roomState?.players ?? []).map((player) => player.id),
    [roomState?.players],
  );
  const { notesByPlayer, setCell, clearNotes } = useHostPlayerNotes(
    sessionId,
    playerIds,
    scenes.length,
  );
  const showPlayerNotes = phase === "ACTIVE" && scenes.length > 0;

  useEffect(() => {
    if (phase === "ENDED") {
      clearNotes();
    }
  }, [phase, clearNotes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <RoomCodeCopy roomCode={roomCode} label={t("roomCode")} />
        <span
          className={`rounded-lg px-3 py-1 ${isConnected ? "bg-emerald-900/40 text-emerald-200" : "bg-red-900/40 text-red-200"}`}
        >
          {isConnected ? t("connected") : t("disconnected")}
        </span>
        {roomState ? (
          <span className="text-muted">
            {t("phase")}: {roomState.phase.toLowerCase()}
          </span>
        ) : null}
      </div>
      {roomState ? (
        <p className="text-lg font-bold text-foreground">
          {pickLocalizedGameText(
            locale,
            roomState.gameTitleRu,
            roomState.gameTitleEn,
          )}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {phase === "ACTIVE" ? (
        <section
          className={`${panelClass} border-accent/20 bg-gradient-to-br from-card to-accent/5`}
        >
          <div className="mb-4 space-y-1">
            <h2 className="font-semibold">{td("rollDice")}</h2>
            <p className="text-sm text-muted">{td("rollDiceHostHint")}</p>
          </div>
          <DiceRollButton
            variant="panel"
            disabled={!isConnected || Boolean(activeDiceRoll)}
            onRoll={(sides, count) => {
              void submitDiceRoll(sides, count);
            }}
          />
        </section>
      ) : null}

      <SessionScenePanel
        scenes={scenes}
        phase={phase}
        activeScene={activeScene}
        onHostAction={emitHostAction}
      />

      {phase === "ACTIVE" ? (
        <div className="space-y-6">
          <section className={panelClass}>
            <h2 className="mb-3 font-semibold">{t("playersCompact")}</h2>
            <ul className="space-y-2 text-sm">
              {(roomState?.players ?? []).map((player) => (
                <HostPlayerCard
                  key={player.id}
                  player={player}
                  scenes={showPlayerNotes ? scenes : undefined}
                  notes={showPlayerNotes ? notesByPlayer[player.id] : undefined}
                  onNotesCellChange={
                    showPlayerNotes
                      ? (rowIndex, sceneIndex, value) => {
                          setCell(player.id, rowIndex, sceneIndex, value);
                        }
                      : undefined
                  }
                />
              ))}
              {(roomState?.players.length ?? 0) === 0 ? (
                <li className="text-muted">{t("waitingPlayers")}</li>
              ) : null}
            </ul>
          </section>

          <SceneProgressTable
            scenes={scenes}
            activeScene={activeScene}
            completedSceneKeys={completedSceneKeys}
          />
        </div>
      ) : (
        <section className={panelClass}>
          <h2 className="mb-3 font-semibold">{t("players")}</h2>
          <ul className="space-y-2 text-sm">
            {(roomState?.players ?? []).map((player) => (
              <HostPlayerCard key={player.id} player={player} />
            ))}
            {(roomState?.players.length ?? 0) === 0 ? (
              <li className="text-muted">{t("waitingPlayers")}</li>
            ) : null}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowStartConfirm(true)}
            disabled={phase !== "LOBBY" || playerCount === 0}
            className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            {t("startSession")}
          </button>
          <button
            type="button"
            onClick={onEnd}
            disabled={phase === "ENDED"}
            className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50"
          >
            {t("endSession")}
          </button>
        </div>
        {phase === "LOBBY" && playerCount === 0 ? (
          <p className="text-sm text-muted">{t("needPlayersToStart")}</p>
        ) : null}
      </section>

      {masterNotes ? (
        <section className={panelClass}>
          <h2 className="mb-2 text-sm font-semibold text-accent">
            {t("masterNotes")}
          </h2>
          <p className="whitespace-pre-wrap text-sm text-muted">{masterNotes}</p>
        </section>
      ) : null}

      <StartGameConfirm
        playerCount={playerCount}
        readyCount={readyCount}
        isOpen={showStartConfirm}
        isStarting={isStarting}
        onCancel={() => setShowStartConfirm(false)}
        onConfirm={onStart}
      />

      {activeDiceRoll ? (
        <DiceRollOverlay
          roll={activeDiceRoll}
          isHost
          onDismiss={() => {
            void dismissDiceRoll();
          }}
        />
      ) : null}
    </div>
  );
}
