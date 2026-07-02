"use client";

import { MyCharacterModal } from "@/components/player/my-character-modal";
import { PlayerLobby } from "@/components/player/player-lobby";
import { PlayerSceneStage } from "@/components/player/player-scene-stage";
import { SceneTaskModal } from "@/components/player/scene-task-modal";
import { DiceRollButton } from "@/components/shared/dice-roll-button";
import { DiceRollOverlay } from "@/components/shared/dice-roll-overlay";
import { clearPlayerSession } from "@/lib/player-session-storage";
import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import { useRoomSocket } from "@/hooks/use-room-socket";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type SessionRoomProps = {
  sessionId: string;
  playerId: string;
  roomCode: string;
  displayName: string;
  locale: string;
};

export function SessionRoom({
  sessionId,
  playerId,
  roomCode,
  displayName,
  locale,
}: SessionRoomProps) {
  const t = useTranslations("session");
  const tp = useTranslations("play");
  const router = useRouter();
  const {
    roomState,
    isConnected,
    error,
    submitRoll,
    submitDiceRoll,
    submitLobbyAction,
  } = useRoomSocket({
    role: "player",
    sessionId,
    playerId,
  });
  const [isCardOpen, setIsCardOpen] = useState(false);

  const self = roomState?.players.find((player) => player.id === playerId);
  const myCharacter = self?.character;
  const heroLabel = myCharacter?.heroSlotId
    ? pickLocalizedGameText(
        locale,
        myCharacter.heroLabelRu,
        myCharacter.heroLabelEn,
      )
    : undefined;
  const gameTitle = roomState
    ? pickLocalizedGameText(
        locale,
        roomState.gameTitleRu,
        roomState.gameTitleEn,
      )
    : null;
  const canShowCard =
    myCharacter?.heroSlotId &&
    myCharacter.rolledTraits &&
    myCharacter.rolledTraits.length > 0;
  const activeScene = roomState?.activeScene ?? null;
  const activeDiceRoll = roomState?.activeDiceRoll ?? null;
  const isActivePhase = roomState?.phase === "ACTIVE";
  const canRollDice = isActivePhase && isConnected && !activeDiceRoll;

  useEffect(() => {
    if (roomState?.phase === "ENDED") {
      clearPlayerSession(sessionId, roomCode);
    }
  }, [roomState?.phase, sessionId, roomCode]);

  const pendingRoll =
    roomState?.pendingRoll?.playerId === playerId
      ? roomState.pendingRoll
      : null;

  const openTask = activeScene?.visibleTasks[0] ?? null;
  const openTaskIndex = 0;

  if (roomState?.phase === "ENDED") {
    return (
      <div className="flex flex-col items-center gap-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 text-center">
        <p className="text-lg font-semibold">{tp("sessionEndedTitle")}</p>
        <button
          type="button"
          onClick={() => router.push(`/${locale}`)}
          className="min-h-11 w-full max-w-xs rounded-xl bg-accent px-5 text-sm font-semibold text-background"
        >
          {tp("backToHome")}
        </button>
        <p className="max-w-xs text-sm text-muted">{tp("sessionEndedHint")}</p>
      </div>
    );
  }

  if (isActivePhase) {
    return (
      <>
        <PlayerSceneStage
          displayName={displayName}
          heroLabel={heroLabel}
          gameTitle={gameTitle ?? undefined}
          isConnected={isConnected}
          activeScene={activeScene}
          canOpenCharacter={Boolean(canShowCard)}
          characterButtonLabel={tp("myCharacterCard")}
          characterButtonShortLabel={tp("myCharacterCardShort")}
          onOpenCharacter={() => setIsCardOpen(true)}
          bottomActions={
            canRollDice && !pendingRoll ? (
              <DiceRollButton
                variant="dock"
                disabled={!isConnected}
                onRoll={(sides, count) => {
                  void submitDiceRoll(sides, count);
                }}
              />
            ) : null
          }
        />

        {error ? (
          <p
            className="fixed inset-x-4 top-[max(3.5rem,env(safe-area-inset-top))] z-55 rounded-lg bg-red-950/90 px-3 py-2 text-center text-sm text-red-200"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {pendingRoll ? (
          <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-55 rounded-2xl border border-accent bg-card/95 p-5 shadow-xl backdrop-blur-sm">
            <p className="mb-3 text-sm">{pendingRoll.label}</p>
            <button
              type="button"
              onClick={() => submitRoll()}
              className="min-h-11 w-full rounded-xl bg-accent text-sm font-semibold text-background"
            >
              {t("rollD20")}
            </button>
          </div>
        ) : null}

        {roomState?.lastRollResult?.playerId === playerId ? (
          <p className="fixed inset-x-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-55 text-center text-sm text-white drop-shadow">
            {t("rollResult", {
              total: roomState.lastRollResult.total,
              dc: roomState.lastRollResult.dc,
              success: roomState.lastRollResult.success
                ? t("success")
                : t("fail"),
            })}
          </p>
        ) : null}

        <DiceRollOverlay activeRoll={activeDiceRoll} isHost={false} />

        {openTask ? (
          <SceneTaskModal
            task={openTask}
            taskIndex={openTaskIndex}
            totalVisible={activeScene!.visibleTasks.length}
          />
        ) : null}

        {myCharacter && canShowCard ? (
          <MyCharacterModal
            character={myCharacter}
            isOpen={isCardOpen}
            onClose={() => setIsCardOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between gap-2">
        <div className="rounded-xl border border-border bg-card px-3 py-1.5">
          <p className="text-sm leading-tight">
            <span className="font-bold text-accent">
              {heroLabel ?? displayName}
            </span>
            {heroLabel ? (
              <span className="ml-1.5 text-xs text-muted">· {displayName}</span>
            ) : null}
          </p>
        </div>
        <span
          className={`rounded-lg px-3 py-1 text-sm ${isConnected ? "bg-emerald-900/40 text-emerald-200" : "bg-red-900/40 text-red-200"}`}
        >
          {isConnected ? t("connected") : t("disconnected")}
        </span>
      </div>
      {gameTitle ? (
        <p className="text-center text-base font-semibold text-foreground">
          {gameTitle}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {roomState?.phase === "LOBBY" && roomState ? (
        <PlayerLobby
          roomState={roomState}
          playerId={playerId}
          submitLobbyAction={submitLobbyAction}
        />
      ) : null}

      {myCharacter && canShowCard ? (
        <MyCharacterModal
          character={myCharacter}
          isOpen={isCardOpen}
          onClose={() => setIsCardOpen(false)}
        />
      ) : null}
    </div>
  );
}
