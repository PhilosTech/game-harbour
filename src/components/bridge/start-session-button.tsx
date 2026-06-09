'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type StartSessionButtonProps = {
  gameId: string;
  sceneCount: number;
};

export function StartSessionButton({ gameId, sceneCount }: StartSessionButtonProps) {
  const t = useTranslations('bridge');
  const locale = useLocale();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isBlocked = sceneCount === 0;

  const onStart = async () => {
    if (isBlocked) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { code?: string };
        setError(data.code ? t(`gameErrors.${data.code}`) : t('startSessionFailed'));
        return;
      }

      const data = (await response.json()) as { id: string };
      router.push(`/${locale}/bridge/session/${data.id}`);
    } catch {
      setError(t('startSessionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onStart}
        disabled={isLoading || isBlocked}
        title={isBlocked ? t('noScenesHint') : undefined}
        className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-60"
      >
        {isLoading ? '...' : t('startSession')}
      </button>
      {isBlocked ? (
        <p className="max-w-xs text-xs text-muted">{t('noScenesHint')}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
