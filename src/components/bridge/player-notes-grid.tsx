"use client";

import {
  PLAYER_NOTES_DATA_ROW_COUNT,
  type PlayerNotesGrid,
} from "@/hooks/use-host-player-notes";
import type { SessionSceneData } from "@/types/session-scene";
import { useTranslations } from "next-intl";

type PlayerNotesGridProps = {
  scenes: SessionSceneData[];
  value: PlayerNotesGrid;
  onCellChange: (rowIndex: number, sceneIndex: number, value: string) => void;
};

export function PlayerNotesGrid({
  scenes,
  value,
  onCellChange,
}: PlayerNotesGridProps) {
  const t = useTranslations("session");

  if (scenes.length === 0) {
    return null;
  }

  const rowLabelKeys = ["playerNotesRow1", "playerNotesRow2"] as const;

  return (
    <div className="overflow-x-auto rounded-lg border border-border/80 bg-background/40">
      <table className="w-full min-w-[240px] border-collapse text-xs">
        <thead>
          <tr className="border-b border-border/80 bg-card/60">
            <th className="sticky left-0 z-10 min-w-[4.5rem] border-r border-border/60 bg-card/95 px-2 py-1.5 text-left font-medium text-muted">
              {t("playerNotesRowLabel")}
            </th>
            {scenes.map((scene) => (
              <th
                key={scene.id}
                className="min-w-[4.5rem] px-1.5 py-1.5 text-center font-medium text-muted"
                title={scene.sceneKey}
              >
                {t("playerNotesSceneColumn", { order: scene.order })}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from(
            { length: PLAYER_NOTES_DATA_ROW_COUNT },
            (_, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-border/50 last:border-0"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-border/60 bg-card/95 px-2 py-1.5 text-left font-normal text-muted"
                >
                  {t(rowLabelKeys[rowIndex])}
                </th>
                {scenes.map((scene, sceneIndex) => (
                  <td key={scene.id} className="p-1">
                    <input
                      type="text"
                      inputMode="text"
                      value={value[rowIndex]?.[sceneIndex] ?? ""}
                      onChange={(event) =>
                        onCellChange(rowIndex, sceneIndex, event.target.value)
                      }
                      className="min-h-8 w-full rounded-md border border-border/70 bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-accent"
                      aria-label={t("playerNotesCellLabel", {
                        row: rowIndex + 1,
                        scene: scene.order,
                      })}
                    />
                  </td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
