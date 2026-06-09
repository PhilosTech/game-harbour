'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type PublishGameButtonProps = {
  gameId: string;
  sceneCount: number;
};

export function PublishGameButton({ gameId, sceneCount }: PublishGameButtonProps) {
  const t = useTranslations('bridge');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBlocked = sceneCount === 0;

  const onPublish = async () => {
    if (isBlocked) {
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; code?: string };
        setError(data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('publishFailed'));
        return;
      }

      router.refresh();
    } catch {
      setError(t('publishFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onPublish}
        disabled={isLoading || isBlocked}
        title={isBlocked ? t('noScenesHint') : undefined}
        className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent disabled:opacity-60"
      >
        {isLoading ? '...' : t('makePublic')}
      </button>
      {isBlocked ? (
        <p className="max-w-xs text-xs text-muted">{t('noScenesPublishHint')}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
