'use client';

import { pickLocalizedGameText } from '@/lib/game-content-i18n';
import type { PlayerCharacterSnapshot } from '@/types/character';
import { useLocale, useTranslations } from 'next-intl';

type CharacterCardProps = {
  character: PlayerCharacterSnapshot;
  compact?: boolean;
  /** Hide shared traits block (e.g. when lobby renders it separately). */
  heroOnly?: boolean;
};

export function CharacterCard({
  character,
  compact = false,
  heroOnly = false,
}: CharacterCardProps) {
  const t = useTranslations('play');
  const locale = useLocale();

  const heroLabel = pickLocalizedGameText(
    locale,
    character.heroLabelRu,
    character.heroLabelEn,
  );
  const strengthLabel = pickLocalizedGameText(
    locale,
    character.strengthTraitRu,
    character.strengthTraitEn,
  );
  const weaknessLabel = pickLocalizedGameText(
    locale,
    character.weaknessTraitRu,
    character.weaknessTraitEn,
  );

  return (
    <div className={`space-y-3 ${compact ? 'text-sm' : ''}`}>
      {character.heroSlotId ? (
        <p className="font-semibold">{heroLabel}</p>
      ) : null}

      {character.heroSlotId ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2">
            <p className="text-xs text-emerald-300">{t('heroStrength')}</p>
            <p>
              {strengthLabel}{' '}
              <span className="text-muted">({character.strengthValue})</span>
            </p>
          </div>
          <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2">
            <p className="text-xs text-amber-300">{t('heroWeakness')}</p>
            <p>
              {weaknessLabel}{' '}
              <span className="text-muted">({character.weaknessValue})</span>
            </p>
          </div>
        </div>
      ) : null}

      {!heroOnly && character.heroSlotId ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted">{t('sharedTraits')}</p>
          {character.rolledTraits && character.rolledTraits.length > 0 ? (
            <ul className="space-y-1">
              {character.rolledTraits.map((trait) => (
                <li
                  key={trait.traitId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5"
                >
                  <span>
                    {pickLocalizedGameText(locale, trait.labelRu, trait.labelEn)}
                  </span>
                  <span className="font-medium">{trait.value}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
