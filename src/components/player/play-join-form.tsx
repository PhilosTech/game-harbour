'use client';

import { FieldStatus } from '@/components/shared/field-status';
import { storePlayerSession } from '@/lib/player-session-storage';
import type { JoinErrorCode } from '@/lib/session-errors';
import type { PlayerNameCheckStatus } from '@/types/player-name-check';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useRef, useState } from 'react';

type JoinSuccess = {
  sessionId: string;
  roomCode: string;
  playerId: string;
  displayName: string;
  reconnected: boolean;
};

type NameCheckState = 'idle' | 'checking' | PlayerNameCheckStatus;

export function PlayJoinForm() {
  const t = useTranslations('play');
  const locale = useLocale();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errorCode, setErrorCode] = useState<JoinErrorCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nameCheck, setNameCheck] = useState<NameCheckState>('idle');

  const checkPlayerName = async () => {
    const form = formRef.current;
    if (!form) {
      return;
    }

    const roomCode = String(new FormData(form).get('code') ?? '').trim();
    const displayName = String(new FormData(form).get('name') ?? '').trim();

    if (!roomCode || !displayName) {
      setNameCheck('idle');
      return;
    }

    setNameCheck('checking');

    try {
      const response = await fetch('/api/sessions/check-player-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, displayName }),
      });

      const data = (await response.json()) as { status: PlayerNameCheckStatus };
      setNameCheck(data.status);
    } catch {
      setNameCheck('idle');
    }
  };

  const isJoinBlocked =
    nameCheck === 'blocked' ||
    nameCheck === 'session_not_found' ||
    nameCheck === 'session_ended' ||
    nameCheck === 'invalid_name';

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isJoinBlocked) {
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    const formData = new FormData(event.currentTarget);
    const roomCode = String(formData.get('code') ?? '').trim();
    const displayName = String(formData.get('name') ?? '').trim();

    try {
      const response = await fetch('/api/sessions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, displayName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorCode((data.code as JoinErrorCode) ?? 'UNKNOWN');
        return;
      }

      const result = data as JoinSuccess;

      storePlayerSession({
        sessionId: result.sessionId,
        roomCode: result.roomCode,
        playerId: result.playerId,
        displayName: result.displayName,
      });

      router.push(`/${locale}/play/room/${result.sessionId}`);
    } catch {
      setErrorCode('UNKNOWN');
    } finally {
      setIsLoading(false);
    }
  };

  const errorMessage = errorCode ? t(`errors.${errorCode}`) : null;

  const nameCheckMessage =
    nameCheck !== 'idle' && nameCheck !== 'checking'
      ? t(`nameCheck.${nameCheck}`)
      : null;

  const nameCheckTone =
    nameCheck === 'available'
      ? 'success'
      : nameCheck === 'reconnect'
        ? 'warning'
        : nameCheck === 'blocked' ||
            nameCheck === 'session_not_found' ||
            nameCheck === 'session_ended' ||
            nameCheck === 'invalid_name'
          ? 'error'
          : 'muted';

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t('enterCode')}</span>
        <input
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          required
          maxLength={8}
          placeholder="ABC123"
          onBlur={() => {
            if (formRef.current?.elements.namedItem('name')) {
              void checkPlayerName();
            }
          }}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-center text-lg tracking-widest uppercase outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t('yourName')}</span>
        <input
          name="name"
          type="text"
          required
          maxLength={32}
          autoComplete="nickname"
          onBlur={checkPlayerName}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
        <p className="text-xs text-muted">{t('nameHint')}</p>
        {nameCheck === 'checking' ? (
          <FieldStatus tone="muted">{t('nameChecking')}</FieldStatus>
        ) : null}
        {nameCheckMessage ? (
          <FieldStatus tone={nameCheckTone}>{nameCheckMessage}</FieldStatus>
        ) : null}
      </label>
      {errorMessage ? (
        <p className="rounded-xl border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-300" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isLoading || isJoinBlocked}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-60"
      >
        {isLoading ? '...' : t('join')}
      </button>
    </form>
  );
}
