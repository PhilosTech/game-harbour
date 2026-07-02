"use client";

import { buildPredeterminedDiceNotation } from "@/lib/dice-notation";
import type { ActiveDiceRoll } from "@/session-engine/room-events";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const DiceRollSceneClient = dynamic(
  () =>
    import("@/components/shared/dice-roll-scene").then(
      (mod) => mod.DiceRollScene,
    ),
  { ssr: false },
);

const MAX_STAGE_SIZE = 600;

type DiceRollOverlayProps = {
  activeRoll: ActiveDiceRoll | null;
  isHost: boolean;
  onDismiss?: () => void;
};

export function DiceRollOverlay({
  activeRoll,
  isHost,
  onDismiss,
}: DiceRollOverlayProps) {
  const t = useTranslations("dice");
  const [isRolling, setIsRolling] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState(MAX_STAGE_SIZE);
  const lastSeenRollIdRef = useRef<string | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const { width, height } = entry.contentRect;
      setStageSize(Math.min(MAX_STAGE_SIZE, width, height));
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (activeRoll && activeRoll.id !== lastSeenRollIdRef.current) {
      lastSeenRollIdRef.current = activeRoll.id;
      setIsRolling(true);
    }
  }, [activeRoll]);

  const handleComplete = useCallback((rollId: string) => {
    setIsRolling((current) => {
      if (lastSeenRollIdRef.current !== rollId) {
        return current;
      }
      return false;
    });
  }, []);

  const rollerLabel = activeRoll
    ? activeRoll.rollerRole === "host"
      ? t("hostRoller")
      : activeRoll.rollerName
    : "";

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-sm ${
        activeRoll ? "" : "invisible pointer-events-none"
      }`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-6 text-center">
        <p id="dice-roll-title" className="text-xs text-white/70">
          {activeRoll ? t("rollBy", { name: rollerLabel }) : ""}
        </p>
        <p className="mt-1 text-sm font-medium text-accent">
          {activeRoll?.label ?? ""}
        </p>
        {isRolling ? (
          <p className="mt-2 text-sm text-white/60">{t("rolling")}</p>
        ) : null}
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dice-roll-title"
      >
        <div style={{ width: stageSize, height: stageSize }}>
          <DiceRollSceneClient
            rollId={activeRoll?.id ?? null}
            notation={
              activeRoll
                ? buildPredeterminedDiceNotation(
                    activeRoll.count,
                    activeRoll.sides,
                    activeRoll.values,
                  )
                : null
            }
            onComplete={handleComplete}
          />
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-card/95 px-4 py-4">
        {activeRoll && !isRolling ? (
          <div className="mb-4 space-y-1 text-center">
            {activeRoll.count > 1 ? (
              <p className="text-sm text-muted">
                {activeRoll.values.join(" + ")} ={" "}
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {activeRoll.total}
                </span>
              </p>
            ) : (
              <p className="text-4xl font-bold tabular-nums text-foreground">
                {activeRoll.total}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 h-10" aria-hidden="true" />
        )}

        {isHost && activeRoll && !isRolling && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-semibold text-background"
          >
            {t("dismissRoll")}
          </button>
        ) : !isHost && activeRoll && !isRolling ? (
          <p className="text-center text-xs text-muted">
            {t("waitingHostDismiss")}
          </p>
        ) : (
          <div className="h-11" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
