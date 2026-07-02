"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

type AccountButtonProps = {
  username: string;
};

export function AccountButton({ username }: AccountButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations("bridge");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("account")}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-border hover:border-accent"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-modal-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="account-modal-title" className="text-lg font-semibold">
              {t("accountModalTitle")}
            </h2>
            <div className="space-y-1">
              <p className="text-sm text-muted">{t("username")}</p>
              <p className="rounded-xl border border-border bg-background px-3 py-2 font-mono text-lg">
                {username}
              </p>
            </div>
            <p className="text-sm text-muted">{t("accountModalHint")}</p>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-11 w-full rounded-xl border border-border px-4 text-sm hover:border-accent"
            >
              {t("close")}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
