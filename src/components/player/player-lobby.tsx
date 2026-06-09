'use client';

import { CharacterCard } from '@/components/player/character-card';
import { pickLocalizedGameText } from '@/lib/game-content-i18n';
import type { ActionAck } from '@/lib/realtime-client';
import type { RoomState } from '@/session-engine/room-events';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

type PlayerLobbyProps = {
  roomState: RoomState;
  playerId: string;
  submitLobbyAction: (
    action: 'claim_slot' | 'reroll_traits' | 'mark_ready',
    heroSlotId?: string,
  ) => Promise<ActionAck>;
};

export function PlayerLobby({
  roomState,
  playerId,
  submitLobbyAction,
}: PlayerLobbyProps) {
  const t = useTranslations('play');
  const locale = useLocale();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const self = roomState.players.find((player) => player.id === playerId);
  const character = self?.character;
  const lobby = roomState.lobby;
  const hasHeroSlots = lobby.heroSlots.length > 0;

  const runAction = async (
    action: 'claim_slot' | 'reroll_traits' | 'mark_ready',
    heroSlotId?: string,
  ) => {
    setActionError(null);
    setIsBusy(true);
    try {
      const result = await submitLobbyAction(action, heroSlotId);
      if (!result.ok) {
        setActionError(mapLobbyError(result.error, t));
      }
    } catch {
      setActionError(t('lobbyErrors.UNKNOWN'));
    } finally {
      setIsBusy(false);
    }
  };

  if (!hasHeroSlots) {
    return (
      <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted">
        {t('noHeroSlotsConfigured')}
      </p>
    );
  }

  if (!character?.heroSlotId) {
    return (
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h2 className="font-semibold">{t('pickHero')}</h2>
          <p className="text-sm text-muted">{t('pickHeroHint')}</p>
        </div>
        {actionError ? (
          <p className="text-sm text-red-400" role="alert">
            {actionError}
          </p>
        ) : null}
        <ul className="space-y-2">
          {lobby.heroSlots.map((slot) => {
            const isTaken =
              slot.claimedByPlayerId !== null && slot.claimedByPlayerId !== playerId;
            const label = pickLocalizedGameText(locale, slot.labelRu, slot.labelEn);
            const strength = pickLocalizedGameText(
              locale,
              slot.strengthTraitRu,
              slot.strengthTraitEn,
            );
            const weakness = pickLocalizedGameText(
              locale,
              slot.weaknessTraitRu,
              slot.weaknessTraitEn,
            );

            return (
              <li key={slot.id}>
                <button
                  type="button"
                  disabled={isBusy || isTaken}
                  onClick={() => runAction('claim_slot', slot.id)}
                  className="w-full rounded-xl border border-border px-4 py-3 text-left hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <p className="font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted">
                    {t('heroStrength')}: {strength} ({slot.strengthValue}) ·{' '}
                    {t('heroWeakness')}: {weakness} ({slot.weaknessValue})
                  </p>
                  {isTaken ? (
                    <p className="mt-1 text-xs text-red-300">{t('slotTaken')}</p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  if (!character.isReady) {
    const hasRolled =
      character.rolledTraits !== null && character.rolledTraits.length > 0;

    return (
      <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <div className="space-y-1">
          <h2 className="font-semibold">{t('characterCard')}</h2>
          <p className="text-sm text-muted">{t('characterCardHeroHint')}</p>
        </div>
        <CharacterCard character={character} heroOnly />

        <div className="space-y-3 border-t border-border pt-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t('sharedTraits')}</h3>
            <p className="text-xs text-muted">
              {hasRolled ? t('sharedTraitsRerollHint') : t('sharedTraitsGenerateHint')}
            </p>
          </div>

          {hasRolled && character.rolledTraits ? (
            <ul className="space-y-1">
              {character.rolledTraits.map((trait) => (
                <li
                  key={trait.traitId}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>
                    {pickLocalizedGameText(locale, trait.labelRu, trait.labelEn)}
                  </span>
                  <span className="font-medium">{trait.value}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            disabled={isBusy}
            onClick={() => runAction('reroll_traits')}
            className="min-h-11 w-full rounded-xl border border-border px-4 text-sm hover:border-accent disabled:opacity-50 sm:w-auto"
          >
            {hasRolled ? t('rerollTraits') : t('generateTraits')}
          </button>
        </div>

        {actionError ? (
          <p className="text-sm text-red-400" role="alert">
            {actionError}
          </p>
        ) : null}

        <button
          type="button"
          disabled={isBusy || !hasRolled}
          onClick={() => runAction('mark_ready')}
          className="min-h-11 w-full rounded-xl bg-accent px-4 text-sm font-semibold text-background disabled:opacity-50"
        >
          {t('markReady')}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-card p-5">
      <p className="text-sm text-emerald-300">{t('readyWaiting')}</p>
      <CharacterCard character={character} compact />
    </section>
  );
}

function mapLobbyError(
  error: string | undefined,
  t: (key: string) => string,
): string {
  if (!error) {
    return t('lobbyErrors.UNKNOWN');
  }
  if (error.includes('already taken')) {
    return t('lobbyErrors.SLOT_TAKEN');
  }
  if (error.includes('Pick a hero')) {
    return t('lobbyErrors.NO_HERO');
  }
  if (error.includes('Generate traits')) {
    return t('lobbyErrors.NO_TRAITS');
  }
  if (error.includes('already locked')) {
    return t('lobbyErrors.ALREADY_READY');
  }
  if (error.includes('before the game starts')) {
    return t('lobbyErrors.NOT_LOBBY');
  }
  return error;
}
