import { BridgeBackLink } from "@/components/bridge/bridge-back-link";
import { CreateGameForm } from "@/components/bridge/create-game-form";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewGamePage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  const t = await getTranslations("bridge");

  if (!session?.user?.id) {
    redirect(`/${locale}/bridge/login`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-4 py-8">
      <header className="space-y-2">
        <BridgeBackLink
          href={`/${locale}/bridge`}
          label={t("backToDashboard")}
        />
        <h1 className="text-2xl font-bold">{t("createGame")}</h1>
      </header>
      <CreateGameForm />
    </main>
  );
}
