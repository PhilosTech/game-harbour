'use client';

import { signOut } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';

export function SignOutButton() {
  const t = useTranslations('bridge');
  const locale = useLocale();

  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: `/${locale}/bridge/login` })}
      className="min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent"
    >
      {t('signOut')}
    </button>
  );
}
