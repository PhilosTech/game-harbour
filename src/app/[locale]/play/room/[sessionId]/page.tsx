"use client";

import { getStoredPlayerSession } from "@/lib/player-session-storage";
import { PlayJoinForm } from "@/components/player/play-join-form";
import { SessionRoom } from "@/components/player/session-room";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { StoredPlayerSession } from "@/lib/player-session-storage";

export default function PlayRoomPage() {
  const params = useParams<{ locale: string; sessionId: string }>();
  const router = useRouter();
  const t = useTranslations("play");
  const [stored, setStored] = useState<StoredPlayerSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    setStored(getStoredPlayerSession(params.sessionId));
  }, [params.sessionId]);

  if (stored === undefined) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <p className="text-muted">...</p>
      </main>
    );
  }

  if (!stored || stored.sessionId !== params.sessionId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
        <p className="text-center text-sm text-muted">{t("rejoinPrompt")}</p>
        <PlayJoinForm />
        <button
          type="button"
          onClick={() => router.push(`/${params.locale}`)}
          className="text-sm text-muted underline"
        >
          {t("backToHome")}
        </button>
      </main>
    );
  }

  return (
    <main className="relative mx-auto min-h-dvh max-w-md">
      <SessionRoom
        sessionId={stored.sessionId}
        playerId={stored.playerId}
        roomCode={stored.roomCode}
        displayName={stored.displayName}
        locale={params.locale}
      />
    </main>
  );
}
