import { getTranslations } from 'next-intl/server';
import { HarbourHostCard } from '@/components/harbour/harbour-host-card';
import { PlayJoinForm } from '@/components/player/play-join-form';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HarbourPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations('harbour');
  const tc = await getTranslations('common');

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-8 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="space-y-2 pr-28">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          {tc('appName')}
        </p>
        <h1 className="text-3xl font-bold leading-tight">{t('heroTitle')}</h1>
        <p className="text-sm leading-relaxed text-muted">{t('tagline')}</p>
      </header>

      <section className="space-y-4 rounded-2xl border border-accent/30 bg-card p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t('playerTitle')}</h2>
          <p className="text-sm text-muted">{t('playerHint')}</p>
        </div>
        <PlayJoinForm />
      </section>

      <HarbourHostCard locale={locale} />
    </main>
  );
}
