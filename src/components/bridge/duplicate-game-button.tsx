"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DuplicateGameButtonProps = {
  gameId: string;
  redirectToEdit?: boolean;
};

export function DuplicateGameButton({
  gameId,
  redirectToEdit = true,
}: DuplicateGameButtonProps) {
  const t = useTranslations("bridge");
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDuplicate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/games/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId }),
      });

      if (!response.ok) {
        setError(t("duplicateGameFailed"));
        return;
      }

      const game = (await response.json()) as { id: string };

      if (redirectToEdit) {
        router.push(`/${locale}/bridge/games/${game.id}/edit`);
        return;
      }

      router.refresh();
    } catch {
      setError(t("duplicateGameFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={onDuplicate}
        disabled={isLoading}
        aria-label={t("duplicateGame")}
        className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent disabled:opacity-60"
      >
        {isLoading ? "..." : t("duplicateGame")}
      </button>
      {error ? (
        <span className="text-xs text-red-400" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
