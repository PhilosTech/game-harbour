'use client';

import { PlayerNotesGrid } from '@/components/bridge/player-notes-grid';
import { pickLocalizedGameText } from '@/lib/game-content-i18n';
import type { PlayerNotesGrid as PlayerNotesGridValue } from '@/hooks/use-host-player-notes';
import type { PlayerSnapshot } from '@/session-engine/room-events';
import type { SessionSceneData } from '@/types/session-scene';
import { useLocale, useTranslations } from 'next-intl';

type HostPlayerCardProps = {
  player: PlayerSnapshot;
  scenes?: SessionSceneData[];
  notes?: PlayerNotesGridValue;
  onNotesCellChange?: (rowIndex: number, sceneIndex: number, value: string) => void;
};

export function HostPlayerCard({
  player,
  scenes,
  notes,
  onNotesCellChange,
}: HostPlayerCardProps) {
  const t = useTranslations('session');
  const locale = useLocale();
  const character = player.character;

  let statusKey:
    | 'playerReady'
    | 'playerReviewing'
    | 'playerChoosing'
    | 'playerNoHero' = 'playerNoHero';

  if (character?.isReady) {
    statusKey = 'playerReady';
  } else if (
    character?.heroSlotId &&
    character.rolledTraits &&
    character.rolledTraits.length > 0
  ) {
    statusKey = 'playerReviewing';
  } else if (character?.heroSlotId) {
    statusKey = 'playerChoosing';
  }

  const showNotes = Boolean(scenes && notes && onNotesCellChange);

  return (
    <li className="space-y-3 rounded-lg border border-border px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{player.displayName}</span>
        <span className="text-xs text-muted">{t(statusKey)}</span>
      </div>

      {character?.heroSlotId ? (
        <div className="space-y-1 text-xs">
          <p>
            {pickLocalizedGameText(locale, character.heroLabelRu, character.heroLabelEn)}
          </p>
          <p className="text-muted">
            {t('strength')}:{' '}
            {pickLocalizedGameText(
              locale,
              character.strengthTraitRu,
              character.strengthTraitEn,
            )}{' '}
            ({character.strengthValue}) · {t('weakness')}:{' '}
            {pickLocalizedGameText(
              locale,
              character.weaknessTraitRu,
              character.weaknessTraitEn,
            )}{' '}
            ({character.weaknessValue})
          </p>
          {character.rolledTraits && character.rolledTraits.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-1">
              {character.rolledTraits.map((trait) => (
                <li
                  key={trait.traitId}
                  className="rounded-md border border-border px-2 py-0.5"
                >
                  {pickLocalizedGameText(locale, trait.labelRu, trait.labelEn)}:{' '}
                  {trait.value}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {showNotes && scenes && notes && onNotesCellChange ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">{t('playerNotesTitle')}</p>
          <PlayerNotesGrid
            scenes={scenes}
            value={notes}
            onCellChange={onNotesCellChange}
          />
        </div>
      ) : null}
    </li>
  );
}
