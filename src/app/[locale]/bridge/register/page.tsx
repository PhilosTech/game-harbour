import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/bridge/register-form";

export default async function BridgeRegisterPage() {
  const t = await getTranslations("bridge");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          {t("title")}
        </p>
        <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
        <p className="text-sm text-muted">{t("registerSubtitle")}</p>
      </header>
      <RegisterForm />
    </main>
  );
}
