"use client";

import { useTranslations } from "next-intl";

type StartGameConfirmProps = {
  playerCount: number;
  readyCount: number;
  isOpen: boolean;
  isStarting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function StartGameConfirm({
  playerCount,
  readyCount,
  isOpen,
  isStarting,
  onCancel,
  onConfirm,
}: StartGameConfirmProps) {
  const t = useTranslations("session");

  if (!isOpen) {
    return null;
  }

  const notReadyCount = Math.max(0, playerCount - readyCount);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-game-title"
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="start-game-title" className="text-lg font-semibold">
          {t("startConfirmTitle")}
        </h2>
        <p className="text-sm text-muted">
          {t("startConfirmBody", { count: playerCount })}
        </p>
        {notReadyCount > 0 ? (
          <p className="text-sm text-amber-300">
            {t("startConfirmNotReady", { count: notReadyCount })}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isStarting}
            className="min-h-11 flex-1 rounded-xl bg-accent px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            {isStarting ? "..." : t("startConfirmYes")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isStarting}
            className="min-h-11 flex-1 rounded-xl border border-border px-4 text-sm disabled:opacity-50"
          >
            {t("startConfirmNo")}
          </button>
        </div>
      </div>
    </div>
  );
}
