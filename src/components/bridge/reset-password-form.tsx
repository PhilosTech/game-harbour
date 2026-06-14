"use client";

import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ResetPasswordForm() {
  const t = useTranslations("bridge");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, confirmPassword }),
    });

    const data = await response.json();
    setIsLoading(false);

    if (!response.ok) {
      if (data.code === "NOT_FOUND") {
        setError(t("resetUsernameNotFound"));
      } else if (data.code === "PASSWORD_MISMATCH") {
        setError(t("resetPasswordMismatch"));
      } else {
        setError(t("resetFailed"));
      }
      return;
    }

    router.push(`/${locale}/bridge/login?reset=1`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <p className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
        {t("resetPasswordHint")}
      </p>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("username")}</span>
        <input
          name="username"
          type="text"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_-]+"
          autoComplete="username"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("newPassword")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("confirmPassword")}</span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {isLoading ? "..." : t("resetPassword")}
      </button>
      <p className="text-center text-sm text-muted">
        <Link
          href={`/${locale}/bridge/login`}
          className="underline hover:text-foreground"
        >
          {t("hasAccount")}
        </Link>
      </p>
    </form>
  );
}
