"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

type RoomCodeCopyProps = {
  roomCode: string;
  label?: string;
};

export function RoomCodeCopy({ roomCode, label }: RoomCodeCopyProps) {
  const t = useTranslations("session");
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [roomCode]);

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
      {label ? <span className="text-muted">{label}:</span> : null}
      <button
        type="button"
        onClick={copyCode}
        className="font-mono text-base font-bold tracking-widest hover:text-accent"
        title={t("copyRoomCode")}
      >
        {roomCode}
      </button>
      <button
        type="button"
        onClick={copyCode}
        className="min-h-8 rounded-md border border-border px-2.5 text-xs hover:border-accent"
        aria-label={t("copyRoomCode")}
      >
        {copied ? t("roomCodeCopied") : t("copyRoomCode")}
      </button>
    </span>
  );
}
