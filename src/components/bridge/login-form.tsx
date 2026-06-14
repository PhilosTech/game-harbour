"use client";

import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const t = useTranslations("bridge");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resetSuccess = searchParams.get("reset") === "1";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setError(t("loginFailed"));
      return;
    }

    router.push(`/${locale}/bridge`);
    router.refresh();
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <p className="text-sm text-muted">{t("loginRememberHint")}</p>
      {resetSuccess ? (
        <p
          className="rounded-xl border border-emerald-900/50 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200"
          role="status"
        >
          {t("resetSuccess")}
        </p>
      ) : null}
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("username")}</span>
        <input
          name="username"
          type="text"
          required
          autoComplete="username"
          defaultValue="demo"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("password")}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-60"
      >
        {isLoading ? "..." : t("signIn")}
      </button>
      <div className="space-y-2 text-center text-sm text-muted">
        <p>
          <Link
            href={`/${locale}/bridge/reset-password`}
            className="underline hover:text-foreground"
          >
            {t("forgotPassword")}
          </Link>
        </p>
        <p>
          <Link
            href={`/${locale}/bridge/register`}
            className="underline hover:text-foreground"
          >
            {t("createAccount")}
          </Link>
        </p>
      </div>
    </form>
  );
}
