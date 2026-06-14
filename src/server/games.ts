import { GameStatus, GameVisibility, SceneType } from "@prisma/client";
import { z } from "zod";
import {
  bilingualGameContentSchema,
  bilingualSceneBodySchema,
  updateGameSchema,
} from "@/lib/game-content-i18n";
import { db } from "@/lib/db";
import { sceneKeySchema } from "@/lib/scene-key";
import { createUniqueGameSlug } from "@/lib/slug";
import { importedSceneSchema } from "@/lib/ai-scene-import";

export class GameError extends Error {
  constructor(
    message: string,
    public code:
      | "NOT_FOUND"
      | "FORBIDDEN"
      | "NO_SCENES"
      | "NOT_EDITABLE"
      | "SCENE_KEY_TAKEN",
  ) {
    super(message);
    this.name = "GameError";
  }
}

export const createGameSchema = bilingualGameContentSchema.extend({
  visibility: z.nativeEnum(GameVisibility).default(GameVisibility.PRIVATE),
});

export { sceneKeySchema } from "@/lib/scene-key";

export const createSceneSchema = z
  .object({
    sceneKey: sceneKeySchema,
    type: z.nativeEnum(SceneType).default(SceneType.STORY),
    hostOnlyNotes: z.string().trim().optional(),
  })
  .merge(bilingualSceneBodySchema);

const sceneTaskInputSchema = z.object({
  textRu: z.string().trim().max(2000),
  textEn: z.string().trim().max(2000),
});

const sceneIllustrationInputSchema = z.object({
  imageUrl: z.string().trim().max(2000),
});

export const updateSceneSchema = z
  .object({
    type: z.nativeEnum(SceneType),
    hostOnlyNotes: z.string().trim(),
    imageUrl: z.string().trim().max(2000).optional().default(""),
    tasks: z.array(sceneTaskInputSchema).max(20).default([]),
    illustrations: z.array(sceneIllustrationInputSchema).max(20).default([]),
  })
  .merge(bilingualSceneBodySchema);

export async function getHostOwnGames(hostId: string) {
  return db.gameTemplate.findMany({
    where: { hostId },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { scenes: true } },
    },
  });
}

export async function getCommunityGames(excludeHostId: string) {
  return db.gameTemplate.findMany({
    where: {
      hostId: { not: null, notIn: [excludeHostId] },
      visibility: GameVisibility.PUBLIC,
    },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { scenes: true } },
      host: {
        select: {
          displayName: true,
          username: true,
        },
      },
    },
  });
}

export async function createHostGame(
  hostId: string,
  input: z.infer<typeof createGameSchema>,
) {
  const data = createGameSchema.parse(input);
  const slugBase = data.titleEn || data.titleRu;
  const slug = await createUniqueGameSlug(slugBase);

  return db.gameTemplate.create({
    data: {
      hostId,
      slug,
      titleRu: data.titleRu,
      titleEn: data.titleEn,
      descriptionRu: data.descriptionRu,
      descriptionEn: data.descriptionEn,
      status: GameStatus.DRAFT,
      visibility: data.visibility,
    },
  });
}

export async function duplicateGameForHost(
  hostId: string,
  sourceGameId: string,
) {
  const source = await db.gameTemplate.findFirst({
    where: { id: sourceGameId },
    include: {
      heroSlots: { orderBy: { order: "asc" } },
      traits: { orderBy: { order: "asc" } },
      scenes: {
        orderBy: { order: "asc" },
        include: {
          tasks: { orderBy: { order: "asc" } },
          illustrations: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!source) {
    throw new GameError("Game not found", "NOT_FOUND");
  }

  const canDuplicate =
    source.hostId === hostId ||
    source.hostId === null ||
    source.visibility === GameVisibility.PUBLIC;

  if (!canDuplicate) {
    throw new GameError("Forbidden", "FORBIDDEN");
  }

  const slug = await createUniqueGameSlug(`${source.slug}-copy`);

  return db.$transaction(async (tx) => {
    const game = await tx.gameTemplate.create({
      data: {
        hostId,
        slug,
        titleRu: `${source.titleRu} (копия)`,
        titleEn: `${source.titleEn} (copy)`,
        descriptionRu: source.descriptionRu,
        descriptionEn: source.descriptionEn,
        coverUrl: source.coverUrl,
        status: GameStatus.DRAFT,
        visibility: GameVisibility.PRIVATE,
        traitPointsPerStat: source.traitPointsPerStat,
        defaultStrengthValue: source.defaultStrengthValue,
        defaultWeaknessValue: source.defaultWeaknessValue,
      },
    });

    if (source.heroSlots.length > 0) {
      await tx.gameHeroSlot.createMany({
        data: source.heroSlots.map((slot) => ({
          gameId: game.id,
          order: slot.order,
          labelRu: slot.labelRu,
          labelEn: slot.labelEn,
          strengthTraitRu: slot.strengthTraitRu,
          strengthTraitEn: slot.strengthTraitEn,
          strengthValue: slot.strengthValue,
          weaknessTraitRu: slot.weaknessTraitRu,
          weaknessTraitEn: slot.weaknessTraitEn,
          weaknessValue: slot.weaknessValue,
        })),
      });
    }

    if (source.traits.length > 0) {
      await tx.gameTrait.createMany({
        data: source.traits.map((trait) => ({
          gameId: game.id,
          order: trait.order,
          labelRu: trait.labelRu,
          labelEn: trait.labelEn,
        })),
      });
    }

    for (const scene of source.scenes) {
      const created = await tx.gameScene.create({
        data: {
          gameId: game.id,
          order: scene.order,
          sceneKey: scene.sceneKey,
          type: scene.type,
          contentRu: scene.contentRu,
          contentEn: scene.contentEn,
          hostOnlyNotes: scene.hostOnlyNotes,
          imageUrl: scene.imageUrl,
          playerTaskRu: scene.playerTaskRu,
          playerTaskEn: scene.playerTaskEn,
        },
      });

      if (scene.tasks.length > 0) {
        await tx.gameSceneTask.createMany({
          data: scene.tasks.map((task) => ({
            sceneId: created.id,
            order: task.order,
            textRu: task.textRu,
            textEn: task.textEn,
          })),
        });
      }

      if (scene.illustrations.length > 0) {
        await tx.gameSceneIllustration.createMany({
          data: scene.illustrations.map((illustration) => ({
            sceneId: created.id,
            order: illustration.order,
            imageUrl: illustration.imageUrl,
          })),
        });
      }
    }

    return game;
  });
}

export async function assertGameHasScenes(gameId: string) {
  const sceneCount = await db.gameScene.count({ where: { gameId } });

  if (sceneCount === 0) {
    throw new GameError("Game has no scenes", "NO_SCENES");
  }
}

export async function getEditableHostGame(hostId: string, gameId: string) {
  await assertGameIsEditable(hostId, gameId);

  return db.gameTemplate.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      heroSlots: { orderBy: { order: "asc" } },
      traits: { orderBy: { order: "asc" } },
      scenes: {
        orderBy: { order: "asc" },
        include: {
          tasks: { orderBy: { order: "asc" } },
          illustrations: { orderBy: { order: "asc" } },
        },
      },
      _count: { select: { scenes: true } },
    },
  });
}

const setupLabelSchema = z
  .object({
    labelRu: z.string().trim().max(80),
    labelEn: z.string().trim().max(80),
  })
  .refine((item) => Boolean(item.labelRu || item.labelEn), {
    message: "LABEL_REQUIRED",
  });

const heroSlotSetupSchema = setupLabelSchema
  .extend({
    strengthTraitRu: z.string().trim().max(80),
    strengthTraitEn: z.string().trim().max(80),
    strengthValue: z.number().int().min(20).max(50).default(35),
    weaknessTraitRu: z.string().trim().max(80),
    weaknessTraitEn: z.string().trim().max(80),
    weaknessValue: z.number().int().min(1).max(20).default(8),
  })
  .superRefine((slot, ctx) => {
    if (!slot.strengthTraitRu && !slot.strengthTraitEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRENGTH_REQUIRED",
        path: ["strengthTraitRu"],
      });
    }
    if (!slot.weaknessTraitRu && !slot.weaknessTraitEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WEAKNESS_REQUIRED",
        path: ["weaknessTraitRu"],
      });
    }
    const strengthKey = (
      slot.strengthTraitEn || slot.strengthTraitRu
    ).toLowerCase();
    const weaknessKey = (
      slot.weaknessTraitEn || slot.weaknessTraitRu
    ).toLowerCase();
    if (strengthKey && weaknessKey && strengthKey === weaknessKey) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "STRENGTH_WEAKNESS_SAME",
        path: ["weaknessTraitRu"],
      });
    }
  });

export const updateGameSetupSchema = z
  .object({
    traitPointsPerStat: z.number().int().min(10).max(100).default(30),
    defaultStrengthValue: z.number().int().min(20).max(50).default(35),
    defaultWeaknessValue: z.number().int().min(1).max(20).default(8),
    heroSlots: z.array(heroSlotSetupSchema).max(24),
    traits: z.array(setupLabelSchema).min(3).max(20),
  })
  .superRefine((data, ctx) => {
    const strengthKeys = new Set<string>();
    const weaknessKeys = new Set<string>();

    for (const [index, slot] of data.heroSlots.entries()) {
      const strengthKey = (
        slot.strengthTraitEn || slot.strengthTraitRu
      ).toLowerCase();
      const weaknessKey = (
        slot.weaknessTraitEn || slot.weaknessTraitRu
      ).toLowerCase();

      if (strengthKey) {
        if (strengthKeys.has(strengthKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "DUPLICATE_STRENGTH",
            path: ["heroSlots", index, "strengthTraitRu"],
          });
        }
        strengthKeys.add(strengthKey);
      }

      if (weaknessKey) {
        if (weaknessKeys.has(weaknessKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "DUPLICATE_WEAKNESS",
            path: ["heroSlots", index, "weaknessTraitRu"],
          });
        }
        weaknessKeys.add(weaknessKey);
      }
    }
  });

export const importScenesSchema = z.object({
  mode: z.enum(["append", "replace"]).default("append"),
  masterNotes: z.string().trim().optional().default(""),
  scenes: z.array(importedSceneSchema).min(1).max(50),
});

export async function updateGameSetup(
  hostId: string,
  gameId: string,
  input: z.infer<typeof updateGameSetupSchema>,
) {
  await assertGameIsEditable(hostId, gameId);
  const data = updateGameSetupSchema.parse(input);

  return db.$transaction(async (tx) => {
    await tx.gameHeroSlot.deleteMany({ where: { gameId } });
    await tx.gameTrait.deleteMany({ where: { gameId } });

    if (data.heroSlots.length > 0) {
      await tx.gameHeroSlot.createMany({
        data: data.heroSlots.map((slot, index) => ({
          gameId,
          order: index + 1,
          labelRu: slot.labelRu,
          labelEn: slot.labelEn,
          strengthTraitRu: slot.strengthTraitRu,
          strengthTraitEn: slot.strengthTraitEn,
          strengthValue: slot.strengthValue,
          weaknessTraitRu: slot.weaknessTraitRu,
          weaknessTraitEn: slot.weaknessTraitEn,
          weaknessValue: slot.weaknessValue,
        })),
      });
    }

    await tx.gameTrait.createMany({
      data: data.traits.map((trait, index) => ({
        gameId,
        order: index + 1,
        labelRu: trait.labelRu,
        labelEn: trait.labelEn,
      })),
    });

    return tx.gameTemplate.update({
      where: { id: gameId },
      data: {
        traitPointsPerStat: data.traitPointsPerStat,
        defaultStrengthValue: data.defaultStrengthValue,
        defaultWeaknessValue: data.defaultWeaknessValue,
      },
      include: {
        heroSlots: { orderBy: { order: "asc" } },
        traits: { orderBy: { order: "asc" } },
        scenes: { orderBy: { order: "asc" } },
      },
    });
  });
}

export async function importGameScenes(
  hostId: string,
  gameId: string,
  input: z.infer<typeof importScenesSchema>,
) {
  await assertGameIsEditable(hostId, gameId);
  const data = importScenesSchema.parse(input);

  if (data.mode === "replace") {
    await db.gameScene.deleteMany({ where: { gameId } });
  }

  if (data.masterNotes) {
    await db.gameTemplate.update({
      where: { id: gameId },
      data: { masterNotes: data.masterNotes },
    });
  }

  const existing = await db.gameScene.findMany({
    where: { gameId },
    select: { sceneKey: true, order: true },
  });
  const existingKeys = new Set(existing.map((scene) => scene.sceneKey));
  let nextOrder = existing.reduce(
    (max, scene) => Math.max(max, scene.order),
    0,
  );

  for (const scene of data.scenes) {
    if (existingKeys.has(scene.sceneKey)) {
      throw new GameError("Scene key already exists", "SCENE_KEY_TAKEN");
    }
    existingKeys.add(scene.sceneKey);
    nextOrder += 1;

    const importedTasks =
      scene.tasks.length > 0
        ? scene.tasks
        : scene.playerTaskRu || scene.playerTaskEn
          ? [{ textRu: scene.playerTaskRu, textEn: scene.playerTaskEn }]
          : [];

    const created = await db.gameScene.create({
      data: {
        gameId,
        sceneKey: scene.sceneKey,
        order: nextOrder,
        type: scene.type,
        contentRu: scene.contentRu,
        contentEn: scene.contentEn,
        hostOnlyNotes: scene.hostOnlyNotes || null,
        imageUrl: scene.imageUrl || null,
        playerTaskRu: importedTasks[0]?.textRu || null,
        playerTaskEn: importedTasks[0]?.textEn || null,
      },
    });

    if (importedTasks.length > 0) {
      await db.gameSceneTask.createMany({
        data: importedTasks.map((task, index) => ({
          sceneId: created.id,
          order: index + 1,
          textRu: task.textRu,
          textEn: task.textEn,
        })),
      });
    }
  }

  return db.gameScene.findMany({
    where: { gameId },
    orderBy: { order: "asc" },
    include: {
      tasks: { orderBy: { order: "asc" } },
      illustrations: { orderBy: { order: "asc" } },
    },
  });
}

export async function updateHostGame(
  hostId: string,
  gameId: string,
  input: z.infer<typeof updateGameSchema>,
) {
  await assertGameIsEditable(hostId, gameId);
  const data = updateGameSchema.parse(input);

  return db.gameTemplate.update({
    where: { id: gameId },
    data: {
      titleRu: data.titleRu,
      titleEn: data.titleEn,
      descriptionRu: data.descriptionRu,
      descriptionEn: data.descriptionEn,
      masterNotes: data.masterNotes || null,
    },
  });
}

export async function createGameScene(
  hostId: string,
  gameId: string,
  input: z.infer<typeof createSceneSchema>,
) {
  await assertGameIsEditable(hostId, gameId);
  const data = createSceneSchema.parse(input);

  const existingKey = await db.gameScene.findUnique({
    where: { gameId_sceneKey: { gameId, sceneKey: data.sceneKey } },
    select: { id: true },
  });

  if (existingKey) {
    throw new GameError("Scene key already exists", "SCENE_KEY_TAKEN");
  }

  const lastScene = await db.gameScene.findFirst({
    where: { gameId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return db.gameScene.create({
    data: {
      gameId,
      sceneKey: data.sceneKey,
      order: (lastScene?.order ?? 0) + 1,
      type: data.type,
      contentRu: data.contentRu,
      contentEn: data.contentEn,
      hostOnlyNotes: data.hostOnlyNotes || null,
      playerTaskRu: null,
      playerTaskEn: null,
    },
  });
}

export async function updateGameScene(
  hostId: string,
  gameId: string,
  sceneId: string,
  input: z.infer<typeof updateSceneSchema>,
) {
  await assertGameIsEditable(hostId, gameId);
  const data = updateSceneSchema.parse(input);

  const scene = await db.gameScene.findFirst({
    where: { id: sceneId, gameId },
    select: { id: true },
  });

  if (!scene) {
    throw new GameError("Scene not found", "NOT_FOUND");
  }

  return db.$transaction(async (tx) => {
    await tx.gameSceneTask.deleteMany({ where: { sceneId } });
    await tx.gameSceneIllustration.deleteMany({ where: { sceneId } });

    if (data.tasks.length > 0) {
      await tx.gameSceneTask.createMany({
        data: data.tasks.map((task, index) => ({
          sceneId,
          order: index + 1,
          textRu: task.textRu,
          textEn: task.textEn,
        })),
      });
    }

    if (data.illustrations.length > 0) {
      await tx.gameSceneIllustration.createMany({
        data: data.illustrations
          .filter((illustration) => illustration.imageUrl)
          .map((illustration, index) => ({
            sceneId,
            order: index + 1,
            imageUrl: illustration.imageUrl,
          })),
      });
    }

    return tx.gameScene.update({
      where: { id: sceneId },
      data: {
        type: data.type,
        contentRu: data.contentRu,
        contentEn: data.contentEn,
        hostOnlyNotes: data.hostOnlyNotes,
        imageUrl: data.imageUrl || null,
        playerTaskRu: data.tasks[0]?.textRu || null,
        playerTaskEn: data.tasks[0]?.textEn || null,
      },
      include: {
        tasks: { orderBy: { order: "asc" } },
        illustrations: { orderBy: { order: "asc" } },
      },
    });
  });
}

export async function deleteGameScene(
  hostId: string,
  gameId: string,
  sceneId: string,
) {
  await assertGameIsEditable(hostId, gameId);

  const scene = await db.gameScene.findFirst({
    where: { id: sceneId, gameId },
    select: { id: true },
  });

  if (!scene) {
    throw new GameError("Scene not found", "NOT_FOUND");
  }

  await db.gameScene.delete({ where: { id: sceneId } });
}

export async function assertGameIsEditable(hostId: string, gameId: string) {
  const game = await db.gameTemplate.findUnique({
    where: { id: gameId },
    select: { hostId: true, visibility: true },
  });

  if (!game) {
    throw new GameError("Game not found", "NOT_FOUND");
  }

  if (game.hostId !== hostId) {
    throw new GameError("Forbidden", "FORBIDDEN");
  }

  if (game.visibility === GameVisibility.PUBLIC) {
    throw new GameError("Public games cannot be edited", "NOT_EDITABLE");
  }

  return game;
}

export async function makeGamePublic(hostId: string, gameId: string) {
  const game = await db.gameTemplate.findUnique({
    where: { id: gameId },
    select: { hostId: true, visibility: true },
  });

  if (!game) {
    throw new GameError("Game not found", "NOT_FOUND");
  }

  if (game.hostId !== hostId) {
    throw new GameError("Forbidden", "FORBIDDEN");
  }

  if (game.visibility === GameVisibility.PUBLIC) {
    return db.gameTemplate.findUniqueOrThrow({
      where: { id: gameId },
      include: { _count: { select: { scenes: true } } },
    });
  }

  await assertGameHasScenes(gameId);

  return db.gameTemplate.update({
    where: { id: gameId },
    data: { visibility: GameVisibility.PUBLIC },
    include: { _count: { select: { scenes: true } } },
  });
}

export async function assertHostOwnsGame(hostId: string, gameId: string) {
  const game = await db.gameTemplate.findUnique({
    where: { id: gameId },
    select: { hostId: true },
  });

  if (!game) {
    throw new GameError("Game not found", "NOT_FOUND");
  }

  if (game.hostId !== hostId) {
    throw new GameError("Forbidden", "FORBIDDEN");
  }

  return game;
}

export async function assertHostCanRunGame(hostId: string, gameId: string) {
  const game = await db.gameTemplate.findUnique({
    where: { id: gameId },
    select: { hostId: true, status: true, visibility: true },
  });

  if (!game) {
    throw new GameError("Game not found", "NOT_FOUND");
  }

  if (game.hostId === hostId) {
    return game;
  }

  if (game.visibility === GameVisibility.PUBLIC) {
    return game;
  }

  throw new GameError("Forbidden", "FORBIDDEN");
}
