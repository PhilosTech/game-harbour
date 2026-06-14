"use client";

import { STANDARD_DIE_SIDES } from "@/session-engine/dice";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type DiceRollButtonProps = {
  disabled?: boolean;
  onRoll: (sides: number, count: number) => void;
  compact?: boolean;
  variant?: "inline" | "dock" | "panel";
};

const PRIMARY_DIE = 20;
const QUICK_DICE = [20, 6] as const;

function DiceGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3z" />
      <path d="M12 3v18M4 7.5l16 4.5M20 7.5 4 16.5" />
    </svg>
  );
}

function ExpandChevrons({ className }: { className?: string }) {
  return (
    <span
      className={`flex flex-col items-center leading-none ${className ?? ""}`}
      aria-hidden
    >
      <svg viewBox="0 0 12 8" className="h-2 w-3 text-current">
        <path
          d="M1 6 L6 2 L11 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <svg viewBox="0 0 12 8" className="-mt-1 h-2 w-3 text-current opacity-80">
        <path
          d="M1 6 L6 2 L11 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function DiceRollButton({
  disabled,
  onRoll,
  compact = false,
  variant = "inline",
}: DiceRollButtonProps) {
  const t = useTranslations("dice");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDockExpanded, setIsDockExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = variant === "dock" ? isDockExpanded : isMenuOpen;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsDockExpanded(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        setIsDockExpanded(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const handleRoll = (sides: number) => {
    setIsMenuOpen(false);
    setIsDockExpanded(false);
    onRoll(sides, 1);
  };

  if (variant === "panel") {
    const diceOptions = [...STANDARD_DIE_SIDES].sort((a, b) => b - a);

    return (
      <div className="flex flex-row flex-wrap gap-2">
        {diceOptions.map((sides) => (
          <button
            key={sides}
            type="button"
            disabled={disabled}
            onClick={() => handleRoll(sides)}
            className={`flex h-10 w-[2.8125rem] shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition ${
              sides === PRIMARY_DIE
                ? "border-accent/50 bg-accent/10 text-accent hover:bg-accent/15"
                : "border-border bg-background/50 hover:border-accent hover:bg-accent/5"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            aria-label={`d${sides}`}
          >
            d{sides}
          </button>
        ))}
      </div>
    );
  }

  if (variant === "dock") {
    const diceOptions = [...STANDARD_DIE_SIDES].sort((a, b) => {
      if (a === PRIMARY_DIE) return -1;
      if (b === PRIMARY_DIE) return 1;
      return a - b;
    });

    return (
      <div className="relative shrink-0" ref={menuRef}>
        {isDockExpanded ? (
          <ul
            role="listbox"
            aria-label={t("chooseDie")}
            className="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 flex-col items-stretch gap-1.5"
          >
            {diceOptions.map((sides) => (
              <li key={sides}>
                <button
                  type="button"
                  role="option"
                  disabled={disabled}
                  onClick={() => handleRoll(sides)}
                  className="flex min-h-10 min-w-[3.25rem] items-center justify-center rounded-xl border border-white/25 bg-black/80 px-3 text-sm font-semibold text-white shadow-lg backdrop-blur-sm disabled:opacity-50"
                >
                  d{sides}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pointer-events-none absolute bottom-full left-1/2 mb-1.5 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/70">
            {t("tapForMoreDice")}
          </p>
        )}

        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsDockExpanded((open) => !open)}
          aria-expanded={isDockExpanded}
          aria-haspopup="listbox"
          aria-label={isDockExpanded ? t("closeDiceMenu") : t("openDiceMenu")}
          className={`relative flex h-11 w-[3.75rem] flex-col items-center justify-center rounded-xl border text-white shadow-lg backdrop-blur-sm transition-all disabled:opacity-50 ${
            isDockExpanded
              ? "border-accent/60 bg-black/80 ring-2 ring-accent/40"
              : "border-white/35 bg-black/55 hover:bg-black/70"
          }`}
        >
          {isDockExpanded ? (
            <span className="text-lg leading-none" aria-hidden>
              ×
            </span>
          ) : (
            <>
              <ExpandChevrons className="absolute -top-3 animate-bounce text-white/75" />
              <DiceGlyph className="mb-0.5 h-5 w-5 text-white/95" />
              <span className="text-[10px] font-bold leading-none tracking-tight">
                d{PRIMARY_DIE}
              </span>
            </>
          )}
        </button>
      </div>
    );
  }

  const moreDice = STANDARD_DIE_SIDES.filter(
    (sides) => !(QUICK_DICE as readonly number[]).includes(sides),
  );

  const buttonClass = compact
    ? "min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:opacity-50"
    : "min-h-11 rounded-xl border border-border px-4 text-sm hover:border-accent disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {QUICK_DICE.map((sides) => (
        <button
          key={sides}
          type="button"
          disabled={disabled}
          onClick={() => handleRoll(sides)}
          className={buttonClass}
        >
          d{sides}
        </button>
      ))}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsMenuOpen((open) => !open)}
          className={buttonClass}
          aria-expanded={isMenuOpen}
          aria-haspopup="listbox"
        >
          {t("moreDice")}
        </button>
        {isMenuOpen ? (
          <ul
            role="listbox"
            className="absolute bottom-full left-0 z-50 mb-1 min-w-28 rounded-xl border border-border bg-card py-1 shadow-xl"
          >
            {moreDice.map((sides) => (
              <li key={sides}>
                <button
                  type="button"
                  role="option"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-accent/10"
                  onClick={() => handleRoll(sides)}
                >
                  d{sides}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
