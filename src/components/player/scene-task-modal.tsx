'use client';

import type { VisibleSceneTask } from '@/types/scene-play-state';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

type SceneTaskModalProps = {
  task: VisibleSceneTask;
  taskIndex: number;
  totalVisible: number;
  onDismiss: () => void;
};

export function SceneTaskModal({
  task,
  taskIndex,
  totalVisible,
  onDismiss,
}: SceneTaskModalProps) {
  const tp = useTranslations('play');
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, [task.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismiss();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-task-title"
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="scene-task-title" className="mb-1 text-center text-xs font-medium uppercase tracking-wide text-accent">
          {tp('playerTask')}
          {totalVisible > 1 ? ` ${taskIndex + 1}` : ''}
        </p>
        <p className="mb-6 whitespace-pre-wrap text-center text-lg leading-relaxed">
          {task.text}
        </p>
        <button
          ref={buttonRef}
          type="button"
          onClick={onDismiss}
          className="min-h-11 w-full rounded-xl bg-accent text-sm font-semibold text-background"
        >
          {tp('taskGotIt')}
        </button>
      </div>
    </div>
  );
}
