'use client';

import { AiSceneImporter } from '@/components/bridge/ai-scene-importer';
import { ImageUploadField } from '@/components/bridge/image-upload-field';
import {
  GameSetupEditor,
  type SetupLabel,
} from '@/components/bridge/game-setup-editor';
import type { HeroSlotSetup } from '@/types/hero-slot-setup';
import { pickLocalizedGameText } from '@/lib/game-content-i18n';
import { SceneType } from '@prisma/client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

type SceneTaskData = {
  id: string;
  order: number;
  textRu: string;
  textEn: string;
};

type SceneTaskForm = {
  textRu: string;
  textEn: string;
};

type SceneIllustrationData = {
  id: string;
  order: number;
  imageUrl: string;
};

type IllustrationForm = {
  clientId: string;
  imageUrl: string;
};

type SceneData = {
  id: string;
  sceneKey: string;
  order: number;
  type: SceneType;
  contentRu: string;
  contentEn: string;
  hostOnlyNotes: string | null;
  imageUrl: string | null;
  tasks: SceneTaskData[];
  illustrations: SceneIllustrationData[];
};

type GameEditorProps = {
  gameId: string;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  heroSlots: HeroSlotSetup[];
  traits: SetupLabel[];
  traitPointsPerStat: number;
  defaultStrengthValue?: number;
  defaultWeaknessValue?: number;
  scenes: SceneData[];
};

function hasEnglishText(...values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

function hasRussianText(...values: string[]) {
  return values.some((value) => value.trim().length > 0);
}

export function GameEditor({
  gameId,
  titleRu,
  titleEn,
  descriptionRu,
  descriptionEn,
  heroSlots,
  traits,
  traitPointsPerStat,
  defaultStrengthValue,
  defaultWeaknessValue,
  scenes: initialScenes,
}: GameEditorProps) {
  const t = useTranslations('bridge');
  const locale = useLocale();
  const router = useRouter();
  const [scenes, setScenes] = useState(initialScenes);
  const [metaError, setMetaError] = useState<string | null>(null);

  useEffect(() => {
    setScenes(initialScenes);
  }, [initialScenes]);
  const [metaSuccess, setMetaSuccess] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [useEnglish, setUseEnglish] = useState(hasEnglishText(titleEn, descriptionEn));
  const [useRussian, setUseRussian] = useState(hasRussianText(titleRu, descriptionRu));

  const saveMetadata = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMetaError(null);
    setMetaSuccess(false);

    if (!useEnglish && !useRussian) {
      setMetaError(t('languageRequired'));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      titleEn: useEnglish ? String(formData.get('titleEn') ?? '').trim() : '',
      descriptionEn: useEnglish ? String(formData.get('descriptionEn') ?? '').trim() : '',
      titleRu: useRussian ? String(formData.get('titleRu') ?? '').trim() : '',
      descriptionRu: useRussian ? String(formData.get('descriptionRu') ?? '').trim() : '',
    };

    if (useEnglish && (!payload.titleEn || !payload.descriptionEn)) {
      setMetaError(t('englishIncomplete'));
      return;
    }

    if (useRussian && (!payload.titleRu || !payload.descriptionRu)) {
      setMetaError(t('russianIncomplete'));
      return;
    }

    setIsSavingMeta(true);

    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { code?: string; error?: string };
        setMetaError(data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('saveFailed'));
        return;
      }

      setMetaSuccess(true);
      router.refresh();
    } catch {
      setMetaError(t('saveFailed'));
    } finally {
      setIsSavingMeta(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">{t('editGameDetails')}</h2>
        <form onSubmit={saveMetadata} className="space-y-4">
          <p className="text-sm text-muted">{t('languageSectionsHint')}</p>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={useEnglish}
                onChange={() => {
                  if (useEnglish && !useRussian) return;
                  setUseEnglish((value) => !value);
                }}
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
                    defaultValue={titleEn}
                    maxLength={120}
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('descriptionEn')}</span>
                  <textarea
                    name="descriptionEn"
                    defaultValue={descriptionEn}
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
                onChange={() => {
                  if (useRussian && !useEnglish) return;
                  setUseRussian((value) => !value);
                }}
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
                    defaultValue={titleRu}
                    maxLength={120}
                    className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-muted">{t('descriptionRu')}</span>
                  <textarea
                    name="descriptionRu"
                    defaultValue={descriptionRu}
                    rows={3}
                    maxLength={2000}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                  />
                </label>
              </div>
            ) : null}
          </section>

          {metaError ? (
            <p className="text-sm text-red-400" role="alert">
              {metaError}
            </p>
          ) : null}
          {metaSuccess ? (
            <p className="text-sm text-emerald-300" role="status">
              {t('saveSuccess')}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSavingMeta}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium hover:border-accent disabled:opacity-60"
          >
            {isSavingMeta ? '...' : t('saveChanges')}
          </button>
        </form>
      </section>

      <GameSetupEditor
        gameId={gameId}
        initialHeroSlots={heroSlots}
        initialTraits={traits}
        initialTraitPointsPerStat={traitPointsPerStat}
        initialDefaultStrengthValue={defaultStrengthValue}
        initialDefaultWeaknessValue={defaultWeaknessValue}
      />

      <AiSceneImporter
        gameId={gameId}
        existingSceneCount={scenes.length}
        gameContext={{
          titleRu,
          titleEn,
          descriptionRu,
          descriptionEn,
          heroSlots,
          traits,
          traitPointsPerStat,
        }}
        onScenesSaved={() => router.refresh()}
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t('savedScenes')}</h2>
          <p className="text-sm text-muted">{t('savedScenesHint')}</p>
        </div>

        {scenes.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
            {t('noScenesYet')}
          </p>
        ) : (
          <ul className="space-y-4">
            {scenes.map((scene) => (
              <SceneCard
                key={scene.id}
                gameId={gameId}
                scene={scene}
                locale={locale}
                onUpdated={(updated) => {
                  setScenes((current) =>
                    current.map((item) => (item.id === updated.id ? updated : item)),
                  );
                  router.refresh();
                }}
                onDeleted={(sceneId) => {
                  setScenes((current) => current.filter((item) => item.id !== sceneId));
                  router.refresh();
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

type SceneCardProps = {
  gameId: string;
  scene: SceneData;
  locale: string;
  onUpdated: (scene: SceneData) => void;
  onDeleted: (sceneId: string) => void;
};

function SceneCard({ gameId, scene, locale, onUpdated, onDeleted }: SceneCardProps) {
  const t = useTranslations('bridge');
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [useEnglish, setUseEnglish] = useState(hasEnglishText(scene.contentEn));
  const [useRussian, setUseRussian] = useState(hasRussianText(scene.contentRu));
  const [tasks, setTasks] = useState<SceneTaskForm[]>(() =>
    scene.tasks.map((task) => ({ textRu: task.textRu, textEn: task.textEn })),
  );
  const [backgroundUrl, setBackgroundUrl] = useState(scene.imageUrl ?? '');
  const [illustrations, setIllustrations] = useState<IllustrationForm[]>(() =>
    (scene.illustrations ?? []).map((item) => ({
      clientId: item.id,
      imageUrl: item.imageUrl,
    })),
  );

  const preview = pickLocalizedGameText(locale, scene.contentRu, scene.contentEn);

  const addIllustration = () => {
    setIllustrations((current) => [
      ...current,
      { clientId: crypto.randomUUID(), imageUrl: '' },
    ]);
  };

  const removeIllustration = (clientId: string) => {
    setIllustrations((current) => current.filter((item) => item.clientId !== clientId));
  };

  const updateIllustration = (clientId: string, imageUrl: string) => {
    setIllustrations((current) =>
      current.map((item) => (item.clientId === clientId ? { ...item, imageUrl } : item)),
    );
  };

  const addTask = () => {
    setTasks((current) => [...current, { textRu: '', textEn: '' }]);
  };

  const removeTask = (index: number) => {
    setTasks((current) => current.filter((_, taskIndex) => taskIndex !== index));
  };

  const updateTask = (index: number, field: keyof SceneTaskForm, value: string) => {
    setTasks((current) =>
      current.map((task, taskIndex) =>
        taskIndex === index ? { ...task, [field]: value } : task,
      ),
    );
  };

  const saveScene = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!useEnglish && !useRussian) {
      setError(t('sceneLanguageRequired'));
      return;
    }

    const formData = new FormData(event.currentTarget);
    const payload = {
      type: String(formData.get('type')) as SceneType,
      contentEn: useEnglish ? String(formData.get('contentEn') ?? '').trim() : '',
      contentRu: useRussian ? String(formData.get('contentRu') ?? '').trim() : '',
      hostOnlyNotes: String(formData.get('hostOnlyNotes') ?? '').trim(),
      imageUrl: backgroundUrl.trim(),
      tasks: tasks
        .map((task) => ({
          textRu: useRussian ? task.textRu.trim() : '',
          textEn: useEnglish ? task.textEn.trim() : '',
        }))
        .filter((task) => task.textRu || task.textEn),
      illustrations: illustrations
        .filter((item) => item.imageUrl.trim())
        .map((item) => ({ imageUrl: item.imageUrl.trim() })),
    };

    if (useEnglish && !payload.contentEn) {
      setError(t('englishSceneIncomplete'));
      return;
    }

    if (useRussian && !payload.contentRu) {
      setError(t('russianSceneIncomplete'));
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/games/${gameId}/scenes/${scene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { code?: string; error?: string };
        setError(data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('saveFailed'));
        return;
      }

      const updated = (await response.json()) as SceneData;
      onUpdated(updated);
      setIsOpen(false);
    } catch {
      setError(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteScene = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/games/${gameId}/scenes/${scene.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = (await response.json()) as { code?: string; error?: string };
        setError(data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('deleteFailed'));
        return;
      }

      onDeleted(scene.id);
    } catch {
      setError(t('deleteFailed'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-xs text-muted">
            #{scene.order} · {scene.sceneKey} · {t(`sceneTypes.${scene.type}`)}
          </p>
          <p className="line-clamp-2 text-sm">{preview}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent"
          >
            {isOpen ? t('collapse') : t('edit')}
          </button>
          <button
            type="button"
            onClick={deleteScene}
            disabled={isDeleting}
            className="min-h-11 rounded-xl border border-red-900/50 px-4 text-sm text-red-300 hover:border-red-500 disabled:opacity-60"
          >
            {isDeleting ? '...' : t('delete')}
          </button>
        </div>
      </div>

      {isOpen ? (
        <form onSubmit={saveScene} className="mt-4 space-y-4 border-t border-border pt-4">
          <label className="block space-y-2">
            <span className="text-sm text-muted">{t('sceneType')}</span>
            <select
              name="type"
              defaultValue={scene.type}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            >
              <option value={SceneType.STORY}>{t('sceneTypes.STORY')}</option>
              <option value={SceneType.CHECK}>{t('sceneTypes.CHECK')}</option>
              <option value={SceneType.NOTE}>{t('sceneTypes.NOTE')}</option>
            </select>
          </label>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={useEnglish}
                onChange={() => {
                  if (useEnglish && !useRussian) return;
                  setUseEnglish((value) => !value);
                }}
              />
              <span className="text-sm font-medium">{t('englishSection')}</span>
            </label>
            {useEnglish ? (
              <label className="block space-y-2 pl-7">
                <span className="text-sm text-muted">{t('sceneContentEn')}</span>
                <textarea
                  name="contentEn"
                  defaultValue={scene.contentEn}
                  rows={6}
                  maxLength={5000}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={useRussian}
                onChange={() => {
                  if (useRussian && !useEnglish) return;
                  setUseRussian((value) => !value);
                }}
              />
              <span className="text-sm font-medium">{t('russianSection')}</span>
            </label>
            {useRussian ? (
              <label className="block space-y-2 pl-7">
                <span className="text-sm text-muted">{t('sceneContentRu')}</span>
                <textarea
                  name="contentRu"
                  defaultValue={scene.contentRu}
                  rows={6}
                  maxLength={5000}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </label>
            ) : null}
          </section>

          <label className="block space-y-2">
            <span className="text-sm text-muted">{t('hostOnlyNotes')}</span>
            <textarea
              name="hostOnlyNotes"
              defaultValue={scene.hostOnlyNotes ?? ''}
              rows={4}
              maxLength={2000}
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>

          <ImageUploadField
            gameId={gameId}
            sceneId={scene.id}
            kind="background"
            title={t('sceneBackground')}
            hint={t('sceneBackgroundHint')}
            value={backgroundUrl}
            onChange={setBackgroundUrl}
          />

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('sceneIllustrations')}</p>
              <p className="text-xs text-muted">{t('sceneIllustrationsHint')}</p>
            </div>
            {illustrations.length === 0 ? (
              <p className="text-xs text-muted">{t('sceneIllustrationsEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {illustrations.map((illustration, index) => (
                  <li key={illustration.clientId} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted">
                        {t('sceneIllustrationNumber', { number: index + 1 })}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeIllustration(illustration.clientId)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        {t('removeSceneIllustration')}
                      </button>
                    </div>
                    <ImageUploadField
                      gameId={gameId}
                      sceneId={scene.id}
                      kind="illustration"
                      assetId={illustration.clientId}
                      title={t('sceneIllustrationNumber', { number: index + 1 })}
                      value={illustration.imageUrl}
                      onChange={(url) => updateIllustration(illustration.clientId, url)}
                      compact
                    />
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={addIllustration}
              disabled={illustrations.length >= 20}
              className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-50"
            >
              {t('addSceneIllustration')}
            </button>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('sceneTasks')}</p>
              <p className="text-xs text-muted">{t('playerTaskHint')}</p>
            </div>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted">{t('playerTask')}</p>
            ) : (
              <ul className="space-y-3">
                {tasks.map((task, index) => (
                  <li key={index} className="space-y-2 rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-muted">
                        {t('playerTask')} {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeTask(index)}
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        {t('removeSceneTask')}
                      </button>
                    </div>
                    {useRussian ? (
                      <textarea
                        value={task.textRu}
                        onChange={(event) => updateTask(index, 'textRu', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder={t('playerTaskRu')}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    ) : null}
                    {useEnglish ? (
                      <textarea
                        value={task.textEn}
                        onChange={(event) => updateTask(index, 'textEn', event.target.value)}
                        rows={2}
                        maxLength={2000}
                        placeholder={t('playerTaskEn')}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={addTask}
              disabled={tasks.length >= 20}
              className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-50"
            >
              {t('addSceneTask')}
            </button>
          </section>

          {error ? (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-background disabled:opacity-60"
          >
            {isSaving ? '...' : t('saveScene')}
          </button>
        </form>
      ) : null}
    </li>
  );
}
