'use client';

import {
  AI_PLAYER_COUNT_MAX,
  AI_PLAYER_COUNT_MIN,
  buildAiScenePrompt,
  type GamePromptContext,
} from '@/lib/ai-scene-prompt';
import {
  parseImportedScenes,
  type ImportedScene,
  type SceneImportError,
} from '@/lib/ai-scene-import';
import { SceneType } from '@prisma/client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AiSceneImporterProps = {
  gameId: string;
  gameContext: GamePromptContext;
  existingSceneCount: number;
  onScenesSaved: () => void;
};

export function AiSceneImporter({
  gameId,
  gameContext,
  existingSceneCount,
  onScenesSaved,
}: AiSceneImporterProps) {
  const t = useTranslations('bridge');
  const locale = useLocale();
  const router = useRouter();
  const heroSlotCount = gameContext.heroSlots.length;
  const [sceneCount, setSceneCount] = useState(8);
  const [durationMinutes, setDurationMinutes] = useState(75);
  const [expectedPlayerCount, setExpectedPlayerCount] = useState(
    heroSlotCount > 0 ? heroSlotCount : 4,
  );
  const [hostNotes, setHostNotes] = useState(
    locale === 'ru'
      ? 'Тон: реализм без магии. Финал: открытый. Минимум 3 типа кубиков. Живые tasks и NPC, без рутины. Минимум 1 CHECK с таблицей сюрприза (кусты, зверь, человек). Каждый герой — минимум в 2 сценах.'
      : 'Tone: grounded realism, no magic. Open ending. At least 3 die types. Vivid tasks and NPCs, no chores. At least 1 CHECK with a surprise table (bushes, animal, person). Every hero in 2+ scenes.',
  );
  const [storyBrief, setStoryBrief] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [draftScenes, setDraftScenes] = useState<ImportedScene[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const generatePrompt = () => {
    setError(null);
    setSuccess(null);
    const prompt = buildAiScenePrompt(gameContext, {
      sceneCount,
      durationMinutes,
      hostNotes,
      storyBrief,
      expectedPlayerCount:
        heroSlotCount > 0 ? heroSlotCount : expectedPlayerCount,
      uiLocale: locale,
    });
    setGeneratedPrompt(prompt);
  };

  const copyPrompt = async () => {
    if (!generatedPrompt) return;
    await navigator.clipboard.writeText(generatedPrompt);
    setSuccess(t('promptCopied'));
  };

  const previewImport = () => {
    setError(null);
    setSuccess(null);
    const result = parseImportedScenes(aiResponse);
    if (!result.ok) {
      setError(t(`sceneImportErrors.${result.code as SceneImportError}`));
      return;
    }
    setDraftScenes(result.scenes);
    setSuccess(t('draftReady', { count: result.scenes.length }));
  };

  const saveDraft = async () => {
    if (draftScenes.length === 0) return;
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/games/${gameId}/scenes/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: replaceExisting && existingSceneCount > 0 ? 'replace' : 'append',
          scenes: draftScenes,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { code?: string; error?: string };
        setError(
          data.code ? t(`gameErrors.${data.code}`) : data.error ?? t('saveFailed'),
        );
        return;
      }

      setDraftScenes([]);
      setAiResponse('');
      setSuccess(t('scenesSaved'));
      onScenesSaved();
      router.refresh();
    } catch {
      setError(t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (index: number, patch: Partial<ImportedScene>) => {
    setDraftScenes((rows) =>
      rows.map((scene, rowIndex) => (rowIndex === index ? { ...scene, ...patch } : scene)),
    );
  };

  const removeDraft = (index: number) => {
    setDraftScenes((rows) => rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('aiScenes')}</h2>
        <p className="text-sm text-muted">{t('aiScenesHint')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-2">
          <span className="text-xs text-muted">{t('aiSceneCount')}</span>
          <input
            type="number"
            min={3}
            max={30}
            value={sceneCount}
            onChange={(event) => setSceneCount(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs text-muted">{t('aiDurationMinutes')}</span>
          <input
            type="number"
            min={30}
            max={240}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
        </label>
        {heroSlotCount > 0 ? (
          <div className="block space-y-2">
            <span className="text-xs text-muted">{t('aiPlayerCount')}</span>
            <p className="min-h-11 rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
              {t('aiPlayerCountFromHeroes', { count: heroSlotCount })}
            </p>
          </div>
        ) : (
          <label className="block space-y-2">
            <span className="text-xs text-muted">{t('aiPlayerCount')}</span>
            <input
              type="number"
              min={AI_PLAYER_COUNT_MIN}
              max={AI_PLAYER_COUNT_MAX}
              value={expectedPlayerCount}
              onChange={(event) => setExpectedPlayerCount(Number(event.target.value))}
              className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
            />
            <span className="text-xs text-muted">{t('aiPlayerCountHint')}</span>
          </label>
        )}
      </div>

      <label className="block space-y-2">
        <span className="text-xs text-muted">{t('aiStoryBrief')}</span>
        <textarea
          value={storyBrief}
          onChange={(event) => setStoryBrief(event.target.value)}
          rows={4}
          placeholder={t('aiStoryBriefPlaceholder')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs text-muted">{t('aiHostNotes')}</span>
        <textarea
          value={hostNotes}
          onChange={(event) => setHostNotes(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generatePrompt}
          className="min-h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-background hover:bg-accent-hover"
        >
          {t('generateAiPrompt')}
        </button>
        {generatedPrompt ? (
          <button
            type="button"
            onClick={copyPrompt}
            className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent"
          >
            {t('copyPrompt')}
          </button>
        ) : null}
      </div>

      {generatedPrompt ? (
        <label className="block space-y-2">
          <span className="text-xs text-muted">{t('generatedPrompt')}</span>
          <textarea
            readOnly
            value={generatedPrompt}
            rows={16}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs outline-none"
          />
        </label>
      ) : null}

      <label className="block space-y-2">
        <span className="text-xs text-muted">{t('pasteAiResponse')}</span>
        <textarea
          value={aiResponse}
          onChange={(event) => setAiResponse(event.target.value)}
          rows={10}
          placeholder={t('pasteAiResponsePlaceholder')}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-accent"
        />
      </label>

      <button
        type="button"
        onClick={previewImport}
        disabled={!aiResponse.trim()}
        className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent disabled:opacity-60"
      >
        {t('previewDraftScenes')}
      </button>

      {draftScenes.length > 0 ? (
        <div className="space-y-4 border-t border-border pt-4">
          <h3 className="text-sm font-medium">{t('draftScenesTitle', { count: draftScenes.length })}</h3>
          <ul className="space-y-3">
            {draftScenes.map((scene, index) => (
              <li key={`${scene.sceneKey}-${index}`} className="space-y-2 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    #{index + 1} · {scene.sceneKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDraft(index)}
                    className="text-xs text-red-300"
                  >
                    {t('delete')}
                  </button>
                </div>
                <label className="block space-y-1">
                  <span className="text-xs text-muted">{t('sceneType')}</span>
                  <select
                    value={scene.type}
                    onChange={(event) =>
                      updateDraft(index, { type: event.target.value as SceneType })
                    }
                    className="min-h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
                  >
                    <option value={SceneType.STORY}>{t('sceneTypes.STORY')}</option>
                    <option value={SceneType.CHECK}>{t('sceneTypes.CHECK')}</option>
                    <option value={SceneType.NOTE}>{t('sceneTypes.NOTE')}</option>
                  </select>
                </label>
                {scene.type === SceneType.NOTE ? (
                  <p className="text-xs text-muted">{t('noteSceneDraftHint')}</p>
                ) : null}
                <label className="block space-y-1">
                  <span className="text-xs text-muted">{t('sceneContentRu')}</span>
                  <textarea
                    value={scene.contentRu}
                    onChange={(event) => updateDraft(index, { contentRu: event.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-muted">{t('sceneContentEn')}</span>
                  <textarea
                    value={scene.contentEn}
                    onChange={(event) => updateDraft(index, { contentEn: event.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1 text-sm"
                  />
                </label>
              </li>
            ))}
          </ul>

          {existingSceneCount > 0 ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
              />
              {t('replaceExistingScenes')}
            </label>
          ) : null}

          <button
            type="button"
            onClick={saveDraft}
            disabled={isSaving}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-background disabled:opacity-60"
          >
            {isSaving ? '...' : t('saveDraftScenes')}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-300" role="status">
          {success}
        </p>
      ) : null}
    </section>
  );
}
