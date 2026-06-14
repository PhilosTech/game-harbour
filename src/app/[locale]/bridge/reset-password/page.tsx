import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/bridge/reset-password-form";

export default async function ResetPasswordPage() {
  const t = await getTranslations("bridge");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-8">
      <header className="space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          {t("title")}
        </p>
        <h1 className="text-2xl font-bold">{t("resetPasswordTitle")}</h1>
      </header>
      <ResetPasswordForm />
    </main>
  );
}
