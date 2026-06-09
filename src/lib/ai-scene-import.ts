import { SceneType } from '@prisma/client';
import { z } from 'zod';
import { sceneKeySchema } from '@/lib/scene-key';

const importedSceneTaskSchema = z.object({
  textRu: z.string().trim().max(2000),
  textEn: z.string().trim().max(2000),
});

const illustrationHintSchema = z.object({
  hintRu: z.string().trim().max(80),
  hintEn: z.string().trim().max(80),
});

export const importedSceneSchema = z.object({
  sceneKey: sceneKeySchema,
  type: z.nativeEnum(SceneType).default(SceneType.STORY),
  contentRu: z.string().trim().max(5000),
  contentEn: z.string().trim().max(5000),
  hostOnlyNotes: z.string().trim().max(2000).optional().default(''),
  imageUrl: z.string().trim().max(2000).optional().default(''),
  illustrationHints: z.array(illustrationHintSchema).max(5).optional().default([]),
  tasks: z.array(importedSceneTaskSchema).max(20).optional().default([]),
  playerTaskRu: z.string().trim().max(2000).optional().default(''),
  playerTaskEn: z.string().trim().max(2000).optional().default(''),
});

export const importedScenesPayloadSchema = z.object({
  scenes: z.array(importedSceneSchema).min(1).max(50),
});

export type ImportedScene = z.infer<typeof importedSceneSchema>;

export type SceneImportError =
  | 'INVALID_JSON'
  | 'INVALID_FORMAT'
  | 'DUPLICATE_SCENE_KEY'
  | 'EMPTY_SCENES'
  | 'NOTE_EMPTY_NOTES'
  | 'NOTE_NOT_LAST';

export type SceneImportResult =
  | { ok: true; scenes: ImportedScene[] }
  | { ok: false; code: SceneImportError; message?: string };

const HOST_NOTES_MAX = 2000;

export function appendIllustrationHintsToNotes(
  hostOnlyNotes: string,
  hints: Array<{ hintRu: string; hintEn: string }>,
): string {
  if (hints.length === 0) {
    return hostOnlyNotes;
  }

  const lines = hints.map((hint, index) => {
    const ru = hint.hintRu.trim();
    const en = hint.hintEn.trim();
    if (ru && en) {
      return `${index + 1}. ${ru} / ${en}`;
    }
    return `${index + 1}. ${ru || en}`;
  });

  const block = `\n\n[Image search labels]\n${lines.join('\n')}`;
  const merged = `${hostOnlyNotes}${block}`.trim();
  return merged.slice(0, HOST_NOTES_MAX);
}

function normalizeImportedScene(scene: ImportedScene): ImportedScene {
  const { illustrationHints, imageUrl, ...rest } = scene;

  return {
    ...rest,
    imageUrl: imageUrl?.startsWith('http') ? imageUrl : '',
    hostOnlyNotes: appendIllustrationHintsToNotes(rest.hostOnlyNotes, illustrationHints),
    illustrationHints: [],
  };
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw.trim();
}

export function parseImportedScenes(raw: string): SceneImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(extractJsonBlock(raw));
  } catch {
    return { ok: false, code: 'INVALID_JSON' };
  }

  const validated = importedScenesPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, code: 'INVALID_FORMAT' };
  }

  const keys = new Set<string>();
  const scenes: ImportedScene[] = [];
  const rawScenes = validated.data.scenes;

  for (let index = 0; index < rawScenes.length; index += 1) {
    const scene = rawScenes[index];

    if (keys.has(scene.sceneKey)) {
      return { ok: false, code: 'DUPLICATE_SCENE_KEY' };
    }
    keys.add(scene.sceneKey);

    if (!scene.contentRu && !scene.contentEn && scene.type !== SceneType.NOTE) {
      return { ok: false, code: 'INVALID_FORMAT' };
    }

    if (scene.type === SceneType.NOTE) {
      if (!scene.hostOnlyNotes.trim()) {
        return { ok: false, code: 'NOTE_EMPTY_NOTES' };
      }
      if (index !== rawScenes.length - 1) {
        return { ok: false, code: 'NOTE_NOT_LAST' };
      }
    }

    scenes.push(normalizeImportedScene(scene));
  }

  return { ok: true, scenes };
}

export function getAiSceneJsonExample(): string {
  return JSON.stringify(
    {
      scenes: [
        {
          sceneKey: 'briefing',
          type: 'STORY',
          contentRu:
            'Утро в порту встречает вас сырой солью и гулом двигателей. Спонсор разворачивает на столе выцветшие карты — последняя зацепка ведёт вглубь джунглей.',
          contentEn:
            'Morning at the port greets you with salt air and engine noise. The sponsor spreads faded maps on the table — the last lead points deep into the jungle.',
          hostOnlyNotes:
            'Акт 1. Подчеркните ограниченный бюджет и срок. Герои: дайте каждому одну реплику о мотивации.',
          imageUrl: '',
          illustrationHints: [
            {
              hintRu: 'Порт Манауса',
              hintEn: 'Manaus port',
            },
            {
              hintRu: 'Дневник картографа',
              hintEn: 'Cartographer diary',
            },
          ],
          tasks: [
            {
              textRu: 'Журналист: задайте спонсору вопрос, от которого он отмахнётся.',
              textEn: 'Journalist: ask the sponsor one question they try to dodge.',
            },
          ],
        },
        {
          sceneKey: 'bush_rustle',
          type: 'CHECK',
          contentRu:
            'Тропа сужается, и в кустах справа внезапно шевелится что-то тяжёлое. На секунду все замирают — впереди только узкий проход и тёмная вода.',
          contentEn:
            'The trail narrows, and something heavy shifts in the bushes to your right. Everyone freezes for a second — ahead lies only a tight passage and dark water.',
          hostOnlyNotes:
            'Кубик: d6\nПроверка: без характеристики\nКто бросает: любой игрок\nИнтерпретация: 1 = капибара убегает; 2 = змея шипит и уходит; 3 = агрессивная собака рычит; 4 = шпион конкурентов; 5 = пусто, ветер; 6 = обрывок карты в грязи\nНе game over. После броска дайте группе отреагировать.',
          imageUrl: '',
          illustrationHints: [
            {
              hintRu: 'Джунгли Амазонки',
              hintEn: 'Amazon jungle',
            },
          ],
          tasks: [
            {
              textRu: 'Подойдите к шороху или обходите — скажите, почему.',
              textEn: 'Approach the rustling or go around — say why.',
            },
          ],
        },
        {
          sceneKey: 'jungle_gate',
          type: 'STORY',
          contentRu:
            'К вечеру выходите к старой заставе на границе джунглей. Карта совпала — дальше путь только вперёд, и каждый решает, что готов отдать за ответ.',
          contentEn:
            'By evening you reach an old outpost on the jungle edge. The map was right — the only way is forward, and everyone must decide what they will give for an answer.',
          hostOnlyNotes:
            'Финал акта 1. Открытый финал: не объявляйте победу. Дайте игрокам назвать личную цель на акт 2.',
          imageUrl: '',
          tasks: [
            {
              textRu: 'Назовите, ради чего вы идёте дальше.',
              textEn: 'Name what drives you to go on.',
            },
          ],
        },
        {
          sceneKey: 'host_reference',
          type: 'NOTE',
          contentRu: '',
          contentEn: '',
          hostOnlyNotes:
            'Справка ведущему (игроки не видят):\nNPC: торговец Мартин (осторожный, знает слухи), бригадир Руис (скрытный конкурент).\nРесурсы: 5 дней провизии, 1 запасной мотор.\nТайны: на свежей тропе следы не местной техники.\nКонцовки: углубиться в джунгли / отступить с уликами / договориться с Руисом.',
          imageUrl: '',
        },
      ],
    },
    null,
    2,
  );
}
