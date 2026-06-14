export type VisibleSceneTask = {
  id: string;

  text: string;
};

export type VisibleSceneIllustration = {
  id: string;

  imageUrl: string;
};

export type ActiveSceneState = {
  sceneKey: string;

  sceneOrder: number;

  imageUrl?: string;

  text: string;

  textVisible: boolean;

  visibleTasks: VisibleSceneTask[];

  visibleIllustrations: VisibleSceneIllustration[];
};
