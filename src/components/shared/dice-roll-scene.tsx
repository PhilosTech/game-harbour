"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const MIN_ROLL_MS = 3800;

type DiceBoxInstance = {
  initialize: () => Promise<void>;
  roll: (notation: string) => Promise<unknown>;
};

type DiceRollSceneProps = {
  rollId: string | null;
  notation: string | null;
  onComplete: (rollId: string) => void;
  onError?: (rollId: string) => void;
};

async function waitForLayout(container: HTMLElement) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (container.clientWidth >= 200 && container.clientHeight >= 200) {
      return;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

export function DiceRollScene({
  rollId,
  notation,
  onComplete,
  onError,
}: DiceRollSceneProps) {
  const t = useTranslations("dice");
  const containerRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<DiceBoxInstance | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const rolledIdsRef = useRef<Set<string>>(new Set());
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const reactId = useId();
  const containerId = `dice-roll-scene-${reactId.replace(/:/g, "")}`;
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  // Create and initialize the dice box exactly once for the component's
  // lifetime. The container stays mounted (hidden when idle) for the whole
  // session so this expensive setup (new WebGL context, physics world,
  // theme assets) never repeats between rolls.
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    container.id = containerId;

    readyRef.current = (async () => {
      try {
        await waitForLayout(container);

        const DiceBox = (await import("@3d-dice/dice-box-threejs")).default;

        if (cancelled) {
          return;
        }

        const box = new DiceBox(`#${containerId}`, {
          assetPath: "/assets/dice-threejs/",
          sounds: false,
          shadows: false,
          theme_surface: "green-felt",
          theme_colorset: "white",
          theme_material: "plastic",
          theme_texture: "",
          strength: 1,
          gravity_multiplier: 400,
          light_intensity: 0.85,
          iterationLimit: 1000,
        }) as DiceBoxInstance;

        await box.initialize();

        if (cancelled) {
          return;
        }

        boxRef.current = box;
        window.dispatchEvent(new Event("resize"));
      } catch (error) {
        console.error("Dice roll scene failed to initialize", error);
        if (!cancelled) {
          setHasFailed(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [containerId]);

  useEffect(() => {
    if (!rollId || !notation || rolledIdsRef.current.has(rollId)) {
      return undefined;
    }

    let cancelled = false;
    const currentRollId = rollId;
    rolledIdsRef.current.add(currentRollId);

    async function performRoll() {
      try {
        await readyRef.current;
        const box = boxRef.current;

        if (cancelled || !box) {
          return;
        }

        const rollStartedAt = Date.now();
        await box.roll(notation as string);

        const elapsed = Date.now() - rollStartedAt;
        if (elapsed < MIN_ROLL_MS) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, MIN_ROLL_MS - elapsed);
          });
        }

        if (!cancelled) {
          onCompleteRef.current(currentRollId);
        }
      } catch (error) {
        console.error("Dice roll failed", error);
        if (!cancelled) {
          setHasFailed(true);
          onErrorRef.current?.(currentRollId);
          onCompleteRef.current(currentRollId);
        }
      }
    }

    void performRoll();

    return () => {
      cancelled = true;
    };
  }, [rollId, notation]);

  if (hasFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted">
        {t("sceneUnavailable")}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      id={containerId}
      className="h-full min-h-[320px] w-full [&_canvas]:!h-full [&_canvas]:!w-full"
      aria-hidden="true"
    />
  );
}
