'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

const MIN_ROLL_MS = 3800;

type DiceRollSceneProps = {
  rollId: string;
  notation: string;
  onComplete: () => void;
  onError?: () => void;
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
  const t = useTranslations('dice');
  const containerRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const reactId = useId();
  const containerId = `dice-roll-scene-${reactId.replace(/:/g, '')}`;
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
  }, [onComplete, onError]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const sceneContainer = container;
    container.id = containerId;
    setHasFailed(false);

    async function runRoll() {
      try {
        await waitForLayout(sceneContainer);

        const DiceBox = (await import('@3d-dice/dice-box-threejs')).default;

        if (cancelled) {
          return;
        }

        const box = new DiceBox(`#${containerId}`, {
          assetPath: '/assets/dice-threejs/',
          sounds: false,
          shadows: true,
          theme_surface: 'green-felt',
          theme_colorset: 'white',
          theme_material: 'plastic',
          theme_texture: '',
          strength: 1.6,
          gravity_multiplier: 140,
          light_intensity: 0.85,
          iterationLimit: 5000,
        });

        await box.initialize();

        if (cancelled) {
          return;
        }

        window.dispatchEvent(new Event('resize'));

        const rollStartedAt = Date.now();
        await box.roll(notation);

        const elapsed = Date.now() - rollStartedAt;
        if (elapsed < MIN_ROLL_MS) {
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, MIN_ROLL_MS - elapsed);
          });
        }

        if (!cancelled) {
          onCompleteRef.current();
        }
      } catch (error) {
        console.error('Dice roll scene failed', error);
        if (!cancelled) {
          setHasFailed(true);
          onErrorRef.current?.();
          onCompleteRef.current();
        }
      }
    }

    void runRoll();

    return () => {
      cancelled = true;
      sceneContainer.replaceChildren();
    };
  }, [containerId, notation, rollId]);

  if (hasFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted">
        {t('sceneUnavailable')}
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
