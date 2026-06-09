'use client';

import { useRouter, usePathname } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';

const locales = ['ru', 'en'] as const;

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('common');

  const switchLocale = (nextLocale: (typeof locales)[number]) => {
    if (nextLocale === locale) {
      return;
    }

    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div
      className="inline-flex rounded-xl border border-border bg-card/95 p-1 shadow-sm backdrop-blur-sm"
      role="group"
      aria-label={t('language')}
    >
      {locales.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => switchLocale(item)}
          aria-pressed={locale === item}
          aria-label={item === 'ru' ? t('ru') : t('en')}
          className={`min-h-9 min-w-11 rounded-lg px-3 text-sm font-medium transition-colors ${
            locale === item
              ? 'bg-accent text-background'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {item.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
