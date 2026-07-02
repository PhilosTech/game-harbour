"use client";

import { buildPredeterminedDiceNotation } from "@/lib/dice-notation";
import type { ActiveDiceRoll } from "@/session-engine/room-events";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const DiceRollSceneClient = dynamic(
  () =>
    import("@/components/shared/dice-roll-scene").then(
      (mod) => mod.DiceRollScene,
    ),
  { ssr: false },
);

type DiceRollOverlayProps = {
  roll: ActiveDiceRoll;
  isHost: boolean;
  onDismiss?: () => void;
};

export function DiceRollOverlay({
  roll,
  isHost,
  onDismiss,
}: DiceRollOverlayProps) {
  const t = useTranslations("dice");
  const [isRolling, setIsRolling] = useState(true);

  const handleComplete = useCallback(() => {
    setIsRolling(false);
  }, []);

  const rollerLabel =
    roll.rollerRole === "host" ? t("hostRoller") : roll.rollerName;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black/85 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-6 text-center">
        <p id="dice-roll-title" className="text-xs text-white/70">
          {t("rollBy", { name: rollerLabel })}
        </p>
        <p className="mt-1 text-sm font-medium text-accent">{roll.label}</p>
        {isRolling ? (
          <p className="mt-2 text-sm text-white/60">{t("rolling")}</p>
        ) : null}
      </div>

      <div
        className="relative min-h-0 flex-1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dice-roll-title"
      >
        <div className="mx-auto h-full w-full max-w-sm">
          <DiceRollSceneClient
            rollId={roll.id}
            notation={buildPredeterminedDiceNotation(
              roll.count,
              roll.sides,
              roll.values,
            )}
            onComplete={handleComplete}
          />
        </div>
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-card/95 px-4 py-4">
        {!isRolling ? (
          <div className="mb-4 space-y-1 text-center">
            {roll.count > 1 ? (
              <p className="text-sm text-muted">
                {roll.values.join(" + ")} ={" "}
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {roll.total}
                </span>
              </p>
            ) : (
              <p className="text-4xl font-bold tabular-nums text-foreground">
                {roll.total}
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4 h-10" aria-hidden="true" />
        )}

        {isHost && !isRolling && onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 w-full rounded-xl bg-accent text-sm font-semibold text-background"
          >
            {t("dismissRoll")}
          </button>
        ) : !isHost && !isRolling ? (
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
