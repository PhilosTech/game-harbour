import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

type HarbourHostCardProps = {
  locale: string;
};

export async function HarbourHostCard({ locale }: HarbourHostCardProps) {
  const t = await getTranslations('harbour');

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t('hostTitle')}</h2>
        <p className="text-sm text-muted">{t('hostHint')}</p>
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href={`/${locale}/bridge`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-background hover:bg-accent-hover"
        >
          {t('hostLogin')}
        </Link>
        <Link
          href={`/${locale}/bridge/register`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm text-muted hover:border-accent hover:text-foreground"
        >
          {t('hostRegister')}
        </Link>
      </div>
    </section>
  );
}
