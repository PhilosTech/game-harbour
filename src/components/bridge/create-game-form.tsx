'use client';

import { GameVisibility } from '@prisma/client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function CreateGameForm() {
  const t = useTranslations('bridge');
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibility, setVisibility] = useState<GameVisibility>(GameVisibility.PRIVATE);
  const [useEnglish, setUseEnglish] = useState(locale === 'en');
  const [useRussian, setUseRussian] = useState(locale === 'ru');

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!useEnglish && !useRussian) {
      setError(t('languageRequired'));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const titleEn = useEnglish ? String(formData.get('titleEn') ?? '').trim() : '';
    const descriptionEn = useEnglish ? String(formData.get('descriptionEn') ?? '').trim() : '';
    const titleRu = useRussian ? String(formData.get('titleRu') ?? '').trim() : '';
    const descriptionRu = useRussian ? String(formData.get('descriptionRu') ?? '').trim() : '';

    if (useEnglish && (!titleEn || !descriptionEn)) {
      setError(t('englishIncomplete'));
      return;
    }

    if (useRussian && (!titleRu || !descriptionRu)) {
      setError(t('russianIncomplete'));
      return;
    }

    setIsLoading(true);

    const response = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titleRu,
        titleEn,
        descriptionRu,
        descriptionEn,
        visibility,
      }),
    });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string; code?: string };
      setError(data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('createFailed'));
      setIsLoading(false);
      return;
    }

    const game = (await response.json()) as { id: string };
    router.push(`/${locale}/bridge/games/${game.id}/edit`);
    router.refresh();
    setIsLoading(false);
  };

  const onToggleEnglish = () => {
    if (useEnglish && !useRussian) {
      return;
    }
    setUseEnglish((value) => !value);
  };

  const onToggleRussian = () => {
    if (useRussian && !useEnglish) {
      return;
    }
    setUseRussian((value) => !value);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted">{t('languageSectionsHint')}</p>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={useEnglish}
            onChange={onToggleEnglish}
            aria-label={t('includeEnglish')}
          />
          <span className="text-sm font-medium">{t('englishSection')}</span>
        </label>
        {useEnglish ? (
          <div className="space-y-3 pl-7">
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('titleEn')}</span>
              <input
                name="titleEn"
                maxLength={120}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('descriptionEn')}</span>
              <textarea
                name="descriptionEn"
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={useRussian}
            onChange={onToggleRussian}
            aria-label={t('includeRussian')}
          />
          <span className="text-sm font-medium">{t('russianSection')}</span>
        </label>
        {useRussian ? (
          <div className="space-y-3 pl-7">
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('titleRu')}</span>
              <input
                name="titleRu"
                maxLength={120}
                className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-muted">{t('descriptionRu')}</span>
              <textarea
                name="descriptionRu"
                rows={3}
                maxLength={2000}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </div>
        ) : null}
      </section>

      <fieldset className="space-y-3">
        <legend className="text-sm text-muted">{t('visibilityLabel')}</legend>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input
            type="radio"
            name="visibility"
            value={GameVisibility.PRIVATE}
            checked={visibility === GameVisibility.PRIVATE}
            onChange={() => setVisibility(GameVisibility.PRIVATE)}
            className="mt-1"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">{t('visibilityPrivate')}</span>
            <span className="block text-xs text-muted">{t('visibilityPrivateHint')}</span>
          </span>
        </label>
        <label className="flex cursor-pointer gap-3 rounded-xl border border-border p-3 has-[:checked]:border-accent has-[:checked]:bg-accent/5">
          <input
            type="radio"
            name="visibility"
            value={GameVisibility.PUBLIC}
            checked={visibility === GameVisibility.PUBLIC}
            onChange={() => setVisibility(GameVisibility.PUBLIC)}
            className="mt-1"
          />
          <span className="space-y-1">
            <span className="block text-sm font-medium">{t('visibilityPublic')}</span>
            <span className="block text-xs text-muted">{t('visibilityPublicHint')}</span>
          </span>
        </label>
      </fieldset>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-background disabled:opacity-60"
      >
        {isLoading ? '...' : t('saveGame')}
      </button>
    </form>
  );
}
