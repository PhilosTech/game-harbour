import { SceneType } from "@prisma/client";
import { z } from "zod";
import { sceneKeySchema } from "@/lib/scene-key";

const importedSceneTaskSchema = z.object({
  textRu: z.string().trim(),
  textEn: z.string().trim(),
});

const illustrationHintSchema = z.object({
  hintRu: z.string().trim(),
  hintEn: z.string().trim(),
});

export const importedSceneSchema = z.object({
  sceneKey: sceneKeySchema,
  type: z.nativeEnum(SceneType).default(SceneType.STORY),
  contentRu: z.string().trim(),
  contentEn: z.string().trim(),
  hostOnlyNotes: z.string().trim().optional().default(""),
  imageUrl: z.string().trim().optional().default(""),
  illustrationHints: z.array(illustrationHintSchema).optional().default([]),
  tasks: z.array(importedSceneTaskSchema).optional().default([]),
  playerTaskRu: z.string().trim().optional().default(""),
  playerTaskEn: z.string().trim().optional().default(""),
});

export const importedScenesPayloadSchema = z.object({
  masterNotes: z.string().trim().optional().default(""),
  scenes: z.array(importedSceneSchema).min(1).max(50),
});

export type ImportedScene = z.infer<typeof importedSceneSchema>;

export type SceneImportError =
  | "INVALID_JSON"
  | "INVALID_FORMAT"
  | "DUPLICATE_SCENE_KEY"
  | "EMPTY_SCENES";

export type SceneImportResult =
  | { ok: true; scenes: ImportedScene[]; masterNotes: string }
  | { ok: false; code: SceneImportError; message?: string };

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

  const block = `\n\n[Image search labels]\n${lines.join("\n")}`;
  return `${hostOnlyNotes}${block}`.trim();
}

function normalizeImportedScene(scene: ImportedScene): ImportedScene {
  const { illustrationHints, imageUrl, ...rest } = scene;

  return {
    ...rest,
    imageUrl: imageUrl?.startsWith("http") ? imageUrl : "",
    hostOnlyNotes: appendIllustrationHintsToNotes(
      rest.hostOnlyNotes,
      illustrationHints,
    ),
    illustrationHints: [],
  };
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
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
    return { ok: false, code: "INVALID_JSON" };
  }

  const validated = importedScenesPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    return { ok: false, code: "INVALID_FORMAT" };
  }

  const keys = new Set<string>();
  const scenes: ImportedScene[] = [];
  const rawScenes = validated.data.scenes;
  const masterNotes = validated.data.masterNotes;

  for (let index = 0; index < rawScenes.length; index += 1) {
    const scene = rawScenes[index];

    if (keys.has(scene.sceneKey)) {
      return { ok: false, code: "DUPLICATE_SCENE_KEY" };
    }
    keys.add(scene.sceneKey);

    if (!scene.contentRu && !scene.contentEn) {
      return { ok: false, code: "INVALID_FORMAT" };
    }

    scenes.push(normalizeImportedScene(scene));
  }

  return { ok: true, scenes, masterNotes };
}

export function getAiSceneJsonExample(): string {
  // Generic placeholders only — no real setting, NPCs, or content.
  // The AI must derive all names, locations, and events from the game description above.
  return JSON.stringify(
    {
      masterNotes:
        "[NPC-1]: ([роль], [черта], [секрет]).\n[NPC-2]: ([роль], [черта], [что знает]).\nРесурсы: [что есть у группы].\nТайны: [скрытый факт 1]; [скрытый факт 2].\nКонцовки: [вариант A (рискованно)] / [вариант B (безопасно)] / [вариант C (неоднозначно)].",
      scenes: [
        {
          sceneKey: "scene_01",
          type: "STORY",
          contentRu:
            "[Описание сцены на русском — 600-900 символов, вовлекающее, без решения за игроков].",
          contentEn:
            "[Scene description in English — 600-900 chars, engaging, no decisions made for players].",
          hostOnlyNotes:
            "Тайны: [скрытый контекст, который ведущий знает, игроки — нет].\nПодсказки если застряли: [что сделать, если группа зависла].\nПоследствия вперёд: [как выбор здесь влияет на следующие сцены].\n[Таблица] Развилка: запиши каждому игроку [что именно фиксировать].",
          imageUrl: "",
          illustrationHints: [
            {
              hintRu: "[Локация или предмет из сеттинга игры]",
              hintEn: "[Location or item from the game setting]",
            },
          ],
          tasks: [
            {
              textRu: "[Герой 1]: [конкретное действие или решение].",
              textEn: "[Hero 1]: [specific action or decision].",
            },
            {
              textRu: "[Герой 2]: [конкретное действие или решение].",
              textEn: "[Hero 2]: [specific action or decision].",
            },
            {
              textRu: "[Герой 3]: [конкретное действие или решение].",
              textEn: "[Hero 3]: [specific action or decision].",
            },
            {
              textRu: "[Герой 4]: [конкретное действие или решение].",
              textEn: "[Hero 4]: [specific action or decision].",
            },
            {
              textRu: "[Герой 5]: [конкретное действие или решение].",
              textEn: "[Hero 5]: [specific action or decision].",
            },
          ],
        },
        {
          sceneKey: "scene_02",
          type: "CHECK",
          contentRu:
            "[Описание проверки на русском — напряжённый момент, требующий броска кубика].",
          contentEn:
            "[Check description in English — tense moment requiring a dice roll].",
          hostOnlyNotes:
            "Механика: Кубик: d6 / Проверка: [характеристика или без] / Кто бросает: [кто именно]\nИнтерпретация: 1 = [провал]; 2-3 = [частичный успех]; 4-5 = [успех]; 6 = [критический успех]\nТайны: [скрытый контекст].\nПодсказки если застряли: [что сделать].\nПоследствия вперёд: [как результат влияет на следующее].\n[Таблица] Развилка: запиши каждому [что именно фиксировать].",
          imageUrl: "",
          illustrationHints: [
            {
              hintRu: "[Элемент сцены из сеттинга игры]",
              hintEn: "[Scene element from the game setting]",
            },
          ],
          tasks: [
            {
              textRu: "[Герой 1]: [конкретное действие].",
              textEn: "[Hero 1]: [specific action].",
            },
            {
              textRu: "[Герой 2]: [конкретное действие].",
              textEn: "[Hero 2]: [specific action].",
            },
            {
              textRu: "[Герой 3]: [конкретное действие].",
              textEn: "[Hero 3]: [specific action].",
            },
            {
              textRu: "[Герой 4]: [конкретное действие].",
              textEn: "[Hero 4]: [specific action].",
            },
            {
              textRu: "[Герой 5]: [конкретное действие].",
              textEn: "[Hero 5]: [specific action].",
            },
          ],
        },
        {
          sceneKey: "scene_03",
          type: "STORY",
          contentRu: "[Описание финальной сцены акта — 600-900 символов].",
          contentEn: "[Final act scene description — 600-900 chars].",
          hostOnlyNotes:
            "Тайны: [что ведущий знает].\nПодсказки если застряли: [что сделать].\nПоследствия вперёд: [связь со следующим актом].",
          imageUrl: "",
          illustrationHints: [],
          tasks: [
            {
              textRu: "[Герой 1]: [действие или выбор].",
              textEn: "[Hero 1]: [action or choice].",
            },
            {
              textRu: "[Герой 2]: [действие или выбор].",
              textEn: "[Hero 2]: [action or choice].",
            },
            {
              textRu: "[Герой 3]: [действие или выбор].",
              textEn: "[Hero 3]: [action or choice].",
            },
            {
              textRu: "[Герой 4]: [действие или выбор].",
              textEn: "[Hero 4]: [action or choice].",
            },
            {
              textRu: "[Герой 5]: [действие или выбор].",
              textEn: "[Hero 5]: [action or choice].",
            },
          ],
        },
      ],
    },
    null,
    2,
  );
}
