"use client";

import type { VisibleSceneTask } from "@/types/scene-play-state";
import { useTranslations } from "next-intl";

type SceneTaskModalProps = {
  task: VisibleSceneTask;
  taskIndex: number;
  totalVisible: number;
};

export function SceneTaskModal({
  task,
  taskIndex,
  totalVisible,
}: SceneTaskModalProps) {
  const tp = useTranslations("play");

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-task-title"
        className="w-full max-w-sm rounded-2xl border border-accent/40 bg-card p-6 shadow-2xl"
      >
        <p
          id="scene-task-title"
          className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-accent"
        >
          {tp("playerTask")}
          {totalVisible > 1 ? ` ${taskIndex + 1}` : ""}
        </p>
        <p className="whitespace-pre-wrap text-center text-lg leading-relaxed">
          {task.text}
        </p>
      </div>
    </div>
  );
}
