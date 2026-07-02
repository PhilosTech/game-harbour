import { getTranslations } from "next-intl/server";
import { PlayJoinForm } from "@/components/player/play-join-form";

export default async function PlayPage() {
  const t = await getTranslations("play");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted">{t("enterCode")}</p>
      </header>
      <PlayJoinForm />
    </main>
  );
}
