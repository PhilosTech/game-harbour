import type { SceneType } from "@prisma/client";

export type SessionSceneTaskData = {
  id: string;
  order: number;
  textRu: string;
  textEn: string;
};

export type SessionSceneIllustrationData = {
  id: string;
  order: number;
  imageUrl: string;
};

export type SessionSceneData = {
  id: string;
  order: number;
  sceneKey: string;
  type: SceneType;
  contentRu: string;
  contentEn: string;
  hostOnlyNotes: string | null;
  imageUrl: string | null;
  tasks: SessionSceneTaskData[];
  illustrations: SessionSceneIllustrationData[];
};
