"use client";

import type { ActiveSceneState } from "@/types/scene-play-state";
import type { SessionSceneData } from "@/types/session-scene";
import { useTranslations } from "next-intl";

type SceneProgressTableProps = {
  scenes: SessionSceneData[];
  activeScene: ActiveSceneState | null;
  completedSceneKeys: string[];
};

type SceneStatus = "pending" | "active" | "done";

function getSceneStatus(
  scene: SessionSceneData,
  activeScene: ActiveSceneState | null,
  completedSceneKeys: string[],
): SceneStatus {
  if (
    activeScene &&
    (activeScene.sceneKey === scene.sceneKey ||
      activeScene.sceneOrder === scene.order)
  ) {
    return "active";
  }
  if (completedSceneKeys.includes(scene.sceneKey)) {
    return "done";
  }
  return "pending";
}

export function SceneProgressTable({
  scenes,
  activeScene,
  completedSceneKeys,
}: SceneProgressTableProps) {
  const t = useTranslations("session");

  if (scenes.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">{t("sceneProgress")}</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[280px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="pb-2 pr-3 font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">{t("sceneProgressKey")}</th>
              <th className="pb-2 font-medium">{t("sceneProgressStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {scenes.map((scene) => {
              const status = getSceneStatus(
                scene,
                activeScene,
                completedSceneKeys,
              );
              return (
                <tr
                  key={scene.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <td className="py-2 pr-3">{scene.order}</td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {scene.sceneKey}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        status === "active"
                          ? "text-accent"
                          : status === "done"
                            ? "text-emerald-300"
                            : "text-muted"
                      }
                    >
                      {t(`sceneStatus.${status}`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
