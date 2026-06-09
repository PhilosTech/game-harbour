'use client';

import { CharacterCard } from '@/components/player/character-card';
import type { PlayerCharacterSnapshot } from '@/types/character';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

type MyCharacterModalProps = {
  character: PlayerCharacterSnapshot;
  isOpen: boolean;
  onClose: () => void;
};

export function MyCharacterModal({ character, isOpen, onClose }: MyCharacterModalProps) {
  const t = useTranslations('play');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-character-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="my-character-title" className="text-lg font-semibold">
            {t('myCharacterCard')}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-lg border border-border px-3 text-sm"
            aria-label={t('close')}
          >
            {t('close')}
          </button>
        </div>
        <CharacterCard character={character} />
      </div>
    </div>
  );
}
