"use client";

import { FieldStatus } from "@/components/shared/field-status";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type UsernameCheckState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export function RegisterForm() {
  const t = useTranslations("bridge");
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [usernameCheck, setUsernameCheck] =
    useState<UsernameCheckState>("idle");

  const checkUsername = async (username: string) => {
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameCheck("idle");
      return;
    }

    setUsernameCheck("checking");

    const response = await fetch(
      `/api/auth/username-available?username=${encodeURIComponent(trimmed)}`,
    );
    const data = (await response.json()) as {
      available: boolean;
      valid: boolean;
    };

    if (!data.valid) {
      setUsernameCheck("invalid");
      return;
    }

    setUsernameCheck(data.available ? "available" : "taken");
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (usernameCheck === "taken" || usernameCheck === "invalid") {
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = String(formData.get("username") ?? "");
    const password = String(formData.get("password") ?? "");
    const displayName = String(formData.get("displayName") ?? "");

    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        displayName: displayName || undefined,
      }),
    });

    if (!registerResponse.ok) {
      const data = await registerResponse.json();
      setError(data.error ?? t("registerFailed"));
      setIsLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setIsLoading(false);

    if (signInResult?.error) {
      router.push(`/${locale}/bridge/login`);
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
      <p className="rounded-xl border border-amber-900/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
        {t("usernameRememberWarning")}
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
          onBlur={(event) => checkUsername(event.target.value)}
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
        {usernameCheck === "checking" ? (
          <FieldStatus tone="muted">{t("usernameChecking")}</FieldStatus>
        ) : null}
        {usernameCheck === "available" ? (
          <FieldStatus tone="success">{t("usernameAvailable")}</FieldStatus>
        ) : null}
        {usernameCheck === "taken" ? (
          <FieldStatus tone="error">{t("usernameTaken")}</FieldStatus>
        ) : null}
        {usernameCheck === "invalid" ? (
          <FieldStatus tone="error">{t("usernameInvalid")}</FieldStatus>
        ) : null}
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("displayName")}</span>
        <input
          name="displayName"
          type="text"
          maxLength={64}
          autoComplete="nickname"
          className="min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
        />
      </label>
      <label className="block space-y-2">
        <span className="text-sm text-muted">{t("password")}</span>
        <input
          name="password"
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
        disabled={
          isLoading || usernameCheck === "taken" || usernameCheck === "invalid"
        }
        className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-background hover:bg-accent-hover disabled:opacity-60"
      >
        {isLoading ? "..." : t("register")}
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
