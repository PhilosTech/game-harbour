"use client";

import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import type { ActiveSceneState } from "@/types/scene-play-state";
import type { RoomEventPayload } from "@/session-engine/room-events";
import type {
  SessionSceneData,
  SessionSceneIllustrationData,
  SessionSceneTaskData,
} from "@/types/session-scene";
import { SceneType } from "@prisma/client";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

type SessionScenePanelProps = {
  scenes: SessionSceneData[];
  phase: "LOBBY" | "ACTIVE" | "ENDED";
  activeScene: ActiveSceneState | null;
  onHostAction: (event: RoomEventPayload) => Promise<unknown>;
};

export function SessionScenePanel({
  scenes,
  phase,
  activeScene,
  onHostAction,
}: SessionScenePanelProps) {
  const t = useTranslations("session");
  const locale = useLocale();
  const [isBusy, setIsBusy] = useState(false);

  if (scenes.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted">
        {t("noScenesInGame")}
      </section>
    );
  }

  const runAction = async (event: RoomEventPayload) => {
    setIsBusy(true);
    try {
      await onHostAction(event);
    } finally {
      setIsBusy(false);
    }
  };

  const isSessionActive = phase === "ACTIVE";

  const isSceneActive = (scene: SessionSceneData) =>
    Boolean(
      activeScene &&
      (activeScene.sceneKey === scene.sceneKey ||
        activeScene.sceneOrder === scene.order),
    );

  const startScene = async (scene: SessionSceneData) => {
    const text = pickLocalizedGameText(
      locale,
      scene.contentRu,
      scene.contentEn,
    );
    const hasContent =
      text.trim().length > 0 ||
      Boolean(scene.imageUrl) ||
      scene.illustrations.length > 0 ||
      scene.tasks.some((task) =>
        pickLocalizedGameText(locale, task.textRu, task.textEn).trim(),
      );

    if (!hasContent) {
      return;
    }

    await runAction({
      type: "scene_started",
      sceneKey: scene.sceneKey,
      sceneOrder: scene.order,
      text: text.trim(),
      imageUrl: scene.imageUrl ?? undefined,
    });
  };

  const isTaskVisible = (taskId: string) =>
    activeScene?.visibleTasks.some((task) => task.id === taskId) ?? false;

  const isIllustrationVisible = (illustrationId: string) =>
    activeScene?.visibleIllustrations.some(
      (item) => item.id === illustrationId,
    ) ?? false;

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="font-semibold">{t("scenes")}</h2>
        <p className="text-sm text-muted">
          {isSessionActive ? t("scenesActiveHint") : t("scenesLobbyHint")}
        </p>
      </div>

      <ul className="space-y-3">
        {scenes.map((scene) => {
          const preview = pickLocalizedGameText(
            locale,
            scene.contentRu,
            scene.contentEn,
          );
          const isNote = scene.type === SceneType.NOTE;
          const active = isSceneActive(scene);
          const noteText = preview || scene.hostOnlyNotes || "";

          return (
            <li
              key={scene.id}
              className={`space-y-3 rounded-xl border p-4 ${
                active ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">
                    #{scene.order} · {scene.sceneKey}
                    <span className="ml-2 text-xs font-normal text-muted">
                      {t(`sceneTypes.${scene.type}`)}
                    </span>
                    {active ? (
                      <span className="ml-2 text-xs text-accent">
                        {t("currentScene")}
                      </span>
                    ) : null}
                  </p>
                  {isNote ? (
                    <p className="whitespace-pre-wrap text-xs text-muted">
                      {noteText}
                    </p>
                  ) : active && preview ? (
                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                      {preview}
                    </p>
                  ) : preview ? (
                    <p className="line-clamp-2 text-xs text-muted">{preview}</p>
                  ) : null}
                  {active && !isNote ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                      {scene.imageUrl ? (
                        <span>{t("sceneHasBackground")}</span>
                      ) : null}
                      {scene.illustrations.length > 0 ? (
                        <span>
                          {t("sceneIllustrationsCount", {
                            count: scene.illustrations.length,
                          })}
                        </span>
                      ) : null}
                      <span>
                        {activeScene?.textVisible
                          ? t("sceneTextVisible")
                          : t("sceneTextHiddenFromPlayers")}
                      </span>
                    </div>
                  ) : !active ? (
                    <>
                      {scene.imageUrl ? (
                        <p className="text-xs text-muted">
                          {t("sceneHasBackground")}
                        </p>
                      ) : null}
                      {scene.illustrations.length > 0 ? (
                        <p className="text-xs text-muted">
                          {t("sceneIllustrationsCount", {
                            count: scene.illustrations.length,
                          })}
                        </p>
                      ) : null}
                    </>
                  ) : null}
                </div>
                {!isNote && !active ? (
                  <button
                    type="button"
                    onClick={() => startScene(scene)}
                    disabled={
                      !isSessionActive ||
                      isBusy ||
                      (!preview.trim() &&
                        !scene.imageUrl &&
                        scene.illustrations.length === 0 &&
                        !scene.tasks.some((task) =>
                          pickLocalizedGameText(
                            locale,
                            task.textRu,
                            task.textEn,
                          ).trim(),
                        ))
                    }
                    className="min-h-9 shrink-0 rounded-lg bg-accent px-3 text-xs font-semibold text-background disabled:opacity-50"
                  >
                    {t("startScene")}
                  </button>
                ) : null}
              </div>

              {active && !isNote ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        runAction({
                          type: "scene_text_visibility",
                          visible: !activeScene?.textVisible,
                        })
                      }
                      className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-50"
                    >
                      {activeScene?.textVisible
                        ? t("hideSceneText")
                        : t("showSceneText")}
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        runAction({
                          type: "scene_ended",
                          sceneKey: scene.sceneKey,
                        })
                      }
                      className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-50"
                    >
                      {t("endScene")}
                    </button>
                  </div>

                  {scene.tasks.length > 0 ? (
                    <ul className="space-y-2">
                      {scene.tasks.map((task, index) => (
                        <TaskToggleRow
                          key={task.id}
                          task={task}
                          index={index}
                          locale={locale}
                          isVisible={isTaskVisible(task.id)}
                          isBusy={isBusy}
                          onToggle={async (visible) => {
                            const text = pickLocalizedGameText(
                              locale,
                              task.textRu,
                              task.textEn,
                            );
                            if (!text.trim()) {
                              return;
                            }
                            await runAction({
                              type: "scene_task_visibility",
                              taskId: task.id,
                              text,
                              visible,
                            });
                          }}
                          showLabel={t("showTask")}
                          hideLabel={t("hideTask")}
                          taskLabel={t("taskNumber", { number: index + 1 })}
                        />
                      ))}
                    </ul>
                  ) : null}

                  {scene.illustrations.length > 0 ? (
                    <ul className="space-y-2">
                      {scene.illustrations.map((illustration, index) => (
                        <IllustrationToggleRow
                          key={illustration.id}
                          illustration={illustration}
                          index={index}
                          isVisible={isIllustrationVisible(illustration.id)}
                          isBusy={isBusy}
                          onToggle={async (visible) => {
                            if (!illustration.imageUrl.trim()) {
                              return;
                            }
                            await runAction({
                              type: "scene_illustration_visibility",
                              illustrationId: illustration.id,
                              imageUrl: illustration.imageUrl,
                              visible,
                            });
                          }}
                          showLabel={t("showIllustration")}
                          hideLabel={t("hideIllustration")}
                          illustrationLabel={t("illustrationNumber", {
                            number: index + 1,
                          })}
                        />
                      ))}
                    </ul>
                  ) : null}

                  {scene.hostOnlyNotes ? (
                    <p className="whitespace-pre-wrap border-t border-border pt-3 text-sm leading-relaxed text-muted">
                      <span className="font-medium text-foreground">
                        {t("hostOnlyNotes")}:{" "}
                      </span>
                      {scene.hostOnlyNotes}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

type TaskToggleRowProps = {
  task: SessionSceneTaskData;
  index: number;
  locale: string;
  isVisible: boolean;
  isBusy: boolean;
  showLabel: string;
  hideLabel: string;
  taskLabel: string;
  onToggle: (visible: boolean) => Promise<void>;
};

type IllustrationToggleRowProps = {
  illustration: SessionSceneIllustrationData;
  index: number;
  isVisible: boolean;
  isBusy: boolean;
  showLabel: string;
  hideLabel: string;
  illustrationLabel: string;
  onToggle: (visible: boolean) => Promise<void>;
};

function IllustrationToggleRow({
  illustration,
  isVisible,
  isBusy,
  showLabel,
  hideLabel,
  illustrationLabel,
  onToggle,
}: IllustrationToggleRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <img
          src={illustration.imageUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-md object-cover"
        />
        <span className="font-medium text-foreground">{illustrationLabel}</span>
      </div>
      <button
        type="button"
        disabled={isBusy || !illustration.imageUrl.trim()}
        onClick={() => onToggle(!isVisible)}
        className="min-h-8 shrink-0 rounded-lg border border-border px-2.5 hover:border-accent disabled:opacity-50"
      >
        {isVisible ? hideLabel : showLabel}
      </button>
    </li>
  );
}

function TaskToggleRow({
  task,
  locale,
  isVisible,
  isBusy,
  showLabel,
  hideLabel,
  taskLabel,
  onToggle,
}: TaskToggleRowProps) {
  const preview = pickLocalizedGameText(locale, task.textRu, task.textEn);

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
      <span className="min-w-0 flex-1 text-muted">
        <span className="font-medium text-foreground">{taskLabel}:</span>{" "}
        {preview}
      </span>
      <button
        type="button"
        disabled={isBusy || !preview.trim()}
        onClick={() => onToggle(!isVisible)}
        className="min-h-8 shrink-0 rounded-lg border border-border px-2.5 hover:border-accent disabled:opacity-50"
      >
        {isVisible ? hideLabel : showLabel}
      </button>
    </li>
  );
}
