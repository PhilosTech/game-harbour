'use client';



import type { ActiveSceneState } from '@/types/scene-play-state';

import { useTranslations } from 'next-intl';

import type { ReactNode } from 'react';



type PlayerSceneStageProps = {

  displayName: string;

  roomCode: string;

  isConnected: boolean;

  activeScene: ActiveSceneState | null;

  onOpenCharacter?: () => void;

  canOpenCharacter?: boolean;

  characterButtonLabel?: string;

  characterButtonShortLabel?: string;

  bottomActions?: ReactNode;

};



export function PlayerSceneStage({

  displayName,

  roomCode,

  isConnected,

  activeScene,

  onOpenCharacter,

  canOpenCharacter,

  characterButtonLabel,

  characterButtonShortLabel,

  bottomActions,

}: PlayerSceneStageProps) {

  const t = useTranslations('session');



  const hasBackground = Boolean(activeScene?.imageUrl);

  const hasIllustrations = (activeScene?.visibleIllustrations.length ?? 0) > 0;

  const hasText = Boolean(activeScene?.textVisible && activeScene.text.trim());

  const showWaitingBeat =

    activeScene &&

    !hasText &&

    !hasIllustrations &&

    activeScene.visibleTasks.length === 0;

  const hasBottomBar = Boolean(bottomActions) || Boolean(canOpenCharacter && onOpenCharacter);



  return (

    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden">

      {hasBackground ? (

        <div

          className="absolute inset-0 bg-cover bg-center bg-no-repeat"

          style={{ backgroundImage: `url(${activeScene?.imageUrl})` }}

          aria-hidden

        />

      ) : (

        <div className="absolute inset-0 bg-background" aria-hidden />

      )}



      <div

        className={`absolute inset-0 ${

          hasBackground ? 'bg-gradient-to-t from-black/85 via-black/35 to-black/50' : 'bg-background'

        }`}

        aria-hidden

      />



      <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-sm">

        <span className={hasBackground ? 'text-white/90 drop-shadow' : 'text-muted'}>

          {displayName} · {roomCode}

        </span>

        <span

          className={`rounded-lg px-3 py-1 ${

            isConnected ? 'bg-emerald-900/60 text-emerald-100' : 'bg-red-900/60 text-red-100'

          }`}

        >

          {isConnected ? t('connected') : t('disconnected')}

        </span>

      </header>



      {!activeScene ? (

        <div className="relative z-10 flex flex-1 items-center justify-center px-6">

          <p

            className={`text-center text-lg leading-relaxed ${

              hasBackground ? 'text-white drop-shadow' : 'text-muted'

            }`}

          >

            {t('gameStartedWaiting')}

          </p>

        </div>

      ) : (

        <div className="relative z-10 flex min-h-0 flex-1 flex-col">

          {activeScene.sceneOrder ? (

            <p

              className={`px-4 text-center text-xs uppercase tracking-wide ${

                hasBackground ? 'text-white/70' : 'text-muted'

              }`}

            >

              {t('scene')} #{activeScene.sceneOrder}

            </p>

          ) : null}



          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-3">

            {hasIllustrations ? (

              <ul className="flex w-full max-w-sm flex-col gap-3">

                {activeScene.visibleIllustrations.map((illustration) => (

                  <li

                    key={illustration.id}

                    className="overflow-hidden rounded-2xl border border-white/20 bg-black/40 shadow-xl backdrop-blur-sm"

                  >

                    <img

                      src={illustration.imageUrl}

                      alt=""

                      className="max-h-[min(42vh,320px)] w-full object-contain"

                    />

                  </li>

                ))}

              </ul>

            ) : showWaitingBeat ? (

              <p

                className={`max-w-sm text-center text-lg leading-relaxed ${

                  hasBackground ? 'text-white drop-shadow-md' : 'text-foreground'

                }`}

              >

                {t('sceneInProgress', { order: activeScene.sceneOrder })}

              </p>

            ) : null}

          </div>



          {hasText ? (

            <div className={`relative z-20 shrink-0 px-4 ${hasBottomBar ? 'pb-2' : 'pb-3'}`}>

              <p

                className={`whitespace-pre-wrap text-center text-lg leading-relaxed ${

                  hasBackground

                    ? 'rounded-2xl bg-black/45 px-4 py-4 text-white backdrop-blur-sm'

                    : 'text-foreground'

                }`}

              >

                {activeScene.text}

              </p>

            </div>

          ) : null}

        </div>

      )}



      {hasBottomBar ? (

        <div className="relative z-20 shrink-0 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">

          <div className="flex items-end gap-2">

            {canOpenCharacter && onOpenCharacter && characterButtonLabel ? (

              <button

                type="button"

                onClick={onOpenCharacter}

                className={`min-h-11 flex-1 rounded-xl px-3 text-xs font-medium sm:text-sm ${

                  hasBackground

                    ? 'border border-white/30 bg-black/40 text-white backdrop-blur-sm hover:bg-black/55'

                    : 'border border-border hover:border-accent'

                }`}

              >

                {characterButtonShortLabel ?? characterButtonLabel}

              </button>

            ) : null}

            {bottomActions}

          </div>

        </div>

      ) : (

        <div className="pb-[max(0.75rem,env(safe-area-inset-bottom))]" />

      )}

    </div>

  );

}

