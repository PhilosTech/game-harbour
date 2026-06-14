"use client";

import {
  HERO_PRESETS,
  HERO_SIGNATURE_SUGGESTIONS,
  TRAIT_PRESETS,
  WEAKNESS_PRESETS,
} from "@/lib/game-presets";
import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import {
  collectReservedTraitKeys,
  collectUsedStrengthKeys,
  collectUsedWeaknessKeys,
  createEmptyHeroSlot,
  traitIdentityKey,
  type HeroSlotSetup,
} from "@/types/hero-slot-setup";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export type SetupLabel = {
  labelRu: string;
  labelEn: string;
};

type GameSetupEditorProps = {
  gameId: string;
  initialHeroSlots: HeroSlotSetup[];
  initialTraits: SetupLabel[];
  initialTraitPointsPerStat: number;
  initialDefaultStrengthValue?: number;
  initialDefaultWeaknessValue?: number;
};

function newId() {
  return `tmp-${Math.random().toString(36).slice(2, 9)}`;
}

type SlotRow = HeroSlotSetup & { clientId: string };
type TraitRow = SetupLabel & { clientId: string };

function validateHeroSlots(
  slots: HeroSlotSetup[],
  t: (key: string) => string,
): string | null {
  const strengthKeys = new Set<string>();
  const weaknessKeys = new Set<string>();

  for (const slot of slots) {
    if (!slot.strengthTraitRu && !slot.strengthTraitEn) {
      return t("strengthRequired");
    }
    if (!slot.weaknessTraitRu && !slot.weaknessTraitEn) {
      return t("weaknessRequired");
    }

    const strengthKey = traitIdentityKey(
      slot.strengthTraitRu,
      slot.strengthTraitEn,
    );
    const weaknessKey = traitIdentityKey(
      slot.weaknessTraitRu,
      slot.weaknessTraitEn,
    );

    if (strengthKey === weaknessKey) {
      return t("strengthWeaknessSame");
    }
    if (strengthKeys.has(strengthKey)) {
      return t("duplicateStrength");
    }
    if (weaknessKeys.has(weaknessKey)) {
      return t("duplicateWeakness");
    }
    strengthKeys.add(strengthKey);
    weaknessKeys.add(weaknessKey);
  }

  return null;
}

export function GameSetupEditor({
  gameId,
  initialHeroSlots,
  initialTraits,
  initialTraitPointsPerStat,
  initialDefaultStrengthValue = 35,
  initialDefaultWeaknessValue = 8,
}: GameSetupEditorProps) {
  const t = useTranslations("bridge");
  const locale = useLocale();
  const router = useRouter();
  const [heroSlots, setHeroSlots] = useState<SlotRow[]>(
    initialHeroSlots.map((slot) => ({ ...slot, clientId: newId() })),
  );
  const [traits, setTraits] = useState<TraitRow[]>(
    initialTraits.map((trait) => ({ ...trait, clientId: newId() })),
  );
  const [traitPointsPerStat, setTraitPointsPerStat] = useState(
    initialTraitPointsPerStat,
  );
  const [defaultStrengthValue, setDefaultStrengthValue] = useState(
    initialDefaultStrengthValue,
  );
  const [defaultWeaknessValue, setDefaultWeaknessValue] = useState(
    initialDefaultWeaknessValue,
  );
  const [customHero, setCustomHero] = useState("");
  const [customTrait, setCustomTrait] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const addHeroPreset = (key: string, labelRu: string, labelEn: string) => {
    const slot = createEmptyHeroSlot(
      labelRu,
      labelEn,
      defaultStrengthValue,
      defaultWeaknessValue,
    );
    const suggestion = HERO_SIGNATURE_SUGGESTIONS[key];
    if (suggestion) {
      slot.strengthTraitRu = suggestion.strength.labelRu;
      slot.strengthTraitEn = suggestion.strength.labelEn;
      slot.weaknessTraitRu = suggestion.weakness.labelRu;
      slot.weaknessTraitEn = suggestion.weakness.labelEn;
    }
    setHeroSlots((rows) => [...rows, { ...slot, clientId: newId() }]);
  };

  const addCustomHero = () => {
    const trimmed = customHero.trim();
    if (!trimmed) return;
    addHeroPreset("custom", trimmed, trimmed);
    setCustomHero("");
  };

  const updateHeroSlot = (clientId: string, patch: Partial<HeroSlotSetup>) => {
    setHeroSlots((rows) =>
      rows.map((row) =>
        row.clientId === clientId ? { ...row, ...patch } : row,
      ),
    );
  };

  const applyStrengthPreset = (
    clientId: string,
    labelRu: string,
    labelEn: string,
  ) => {
    updateHeroSlot(clientId, {
      strengthTraitRu: labelRu,
      strengthTraitEn: labelEn,
    });
  };

  const applyWeaknessPreset = (
    clientId: string,
    labelRu: string,
    labelEn: string,
  ) => {
    updateHeroSlot(clientId, {
      weaknessTraitRu: labelRu,
      weaknessTraitEn: labelEn,
    });
  };

  const addTraitPreset = (labelRu: string, labelEn: string) => {
    setTraits((rows) => [...rows, { labelRu, labelEn, clientId: newId() }]);
  };

  const addCustomTrait = () => {
    const trimmed = customTrait.trim();
    if (!trimmed) return;
    addTraitPreset(trimmed, trimmed);
    setCustomTrait("");
  };

  const saveSetup = async () => {
    setError(null);
    setSuccess(false);

    if (traits.length < 3) {
      setError(t("traitsMinThree"));
      return;
    }

    if (heroSlots.length > 0) {
      const heroError = validateHeroSlots(heroSlots, t);
      if (heroError) {
        setError(heroError);
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/games/${gameId}/setup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traitPointsPerStat,
          defaultStrengthValue,
          defaultWeaknessValue,
          heroSlots: heroSlots.map(
            ({
              labelRu,
              labelEn,
              strengthTraitRu,
              strengthTraitEn,
              strengthValue,
              weaknessTraitRu,
              weaknessTraitEn,
              weaknessValue,
            }) => ({
              labelRu,
              labelEn,
              strengthTraitRu,
              strengthTraitEn,
              strengthValue,
              weaknessTraitRu,
              weaknessTraitEn,
              weaknessValue,
            }),
          ),
          traits: traits.map(({ labelRu, labelEn }) => ({ labelRu, labelEn })),
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as {
          error?: string;
          code?: string;
        };
        const code = data.code;
        if (code === "DUPLICATE_STRENGTH") {
          setError(t("duplicateStrength"));
          return;
        }
        if (code === "DUPLICATE_WEAKNESS") {
          setError(t("duplicateWeakness"));
          return;
        }
        if (code === "STRENGTH_WEAKNESS_SAME") {
          setError(t("strengthWeaknessSame"));
          return;
        }
        setError(data.error ?? t("saveFailed"));
        return;
      }

      setSuccess(true);
      router.refresh();
    } catch {
      setError(t("saveFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const reservedTraitKeys = useMemo(
    () => collectReservedTraitKeys(heroSlots),
    [heroSlots],
  );
  const addedTraitKeys = useMemo(
    () =>
      new Set(
        traits.map((trait) => traitIdentityKey(trait.labelRu, trait.labelEn)),
      ),
    [traits],
  );

  const isTraitPresetDisabled = (labelRu: string, labelEn: string) => {
    const key = traitIdentityKey(labelRu, labelEn);
    return reservedTraitKeys.has(key) || addedTraitKeys.has(key);
  };

  return (
    <section className="space-y-6 rounded-2xl border border-border bg-card p-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("gameSetup")}</h2>
        <p className="text-sm text-muted">{t("gameSetupHint")}</p>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("heroSlots")}</h3>
        <p className="text-xs text-muted">{t("heroSlotsHint")}</p>
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <label className="flex items-center gap-2">
            <span>{t("defaultStrengthValue")}</span>
            <input
              type="number"
              min={20}
              max={50}
              value={defaultStrengthValue}
              onChange={(event) =>
                setDefaultStrengthValue(Number(event.target.value))
              }
              className="min-h-9 w-16 rounded-lg border border-border bg-background px-2 outline-none focus:border-accent"
            />
          </label>
          <label className="flex items-center gap-2">
            <span>{t("defaultWeaknessValue")}</span>
            <input
              type="number"
              min={1}
              max={20}
              value={defaultWeaknessValue}
              onChange={(event) =>
                setDefaultWeaknessValue(Number(event.target.value))
              }
              className="min-h-9 w-16 rounded-lg border border-border bg-background px-2 outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          {HERO_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() =>
                addHeroPreset(preset.key, preset.labelRu, preset.labelEn)
              }
              className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent"
            >
              + {pickLocalizedGameText(locale, preset.labelRu, preset.labelEn)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={customHero}
            onChange={(event) => setCustomHero(event.target.value)}
            placeholder={t("customHeroPlaceholder")}
            maxLength={80}
            className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addCustomHero}
            className="min-h-11 shrink-0 rounded-xl border border-border px-4 text-sm hover:border-accent"
          >
            {t("add")}
          </button>
        </div>
        {heroSlots.length === 0 ? (
          <p className="text-xs text-muted">{t("noHeroSlotsYet")}</p>
        ) : (
          <ul className="space-y-3">
            {heroSlots.map((slot, index) => {
              const usedStrengthKeys = collectUsedStrengthKeys(
                heroSlots,
                slot.clientId,
              );
              const usedWeaknessKeys = collectUsedWeaknessKeys(
                heroSlots,
                slot.clientId,
              );
              const selectedStrengthKey = traitIdentityKey(
                slot.strengthTraitRu,
                slot.strengthTraitEn,
              );
              const selectedWeaknessKey = traitIdentityKey(
                slot.weaknessTraitRu,
                slot.weaknessTraitEn,
              );

              return (
                <li
                  key={slot.clientId}
                  className="space-y-3 rounded-xl border border-border p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {index + 1}.{" "}
                      {pickLocalizedGameText(
                        locale,
                        slot.labelRu,
                        slot.labelEn,
                      )}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHeroSlots((rows) => [
                            ...rows,
                            { ...slot, clientId: newId() },
                          ])
                        }
                        className="text-xs text-muted hover:text-foreground"
                      >
                        {t("duplicate")}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroSlots((rows) =>
                            rows.filter(
                              (row) => row.clientId !== slot.clientId,
                            ),
                          )
                        }
                        className="text-xs text-red-300 hover:text-red-200"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-emerald-300">
                      {t("heroStrength")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {TRAIT_PRESETS.map((preset) => {
                        const presetKey = traitIdentityKey(
                          preset.labelRu,
                          preset.labelEn,
                        );
                        const isSelected = presetKey === selectedStrengthKey;
                        const isTaken = usedStrengthKeys.has(presetKey);
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            disabled={isTaken}
                            title={
                              isTaken ? t("traitReservedForHero") : undefined
                            }
                            onClick={() =>
                              applyStrengthPreset(
                                slot.clientId,
                                preset.labelRu,
                                preset.labelEn,
                              )
                            }
                            className={`min-h-8 rounded-lg border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? "border-emerald-400 bg-emerald-950/30"
                                : "border-border hover:border-emerald-400/60"
                            }`}
                          >
                            {pickLocalizedGameText(
                              locale,
                              preset.labelRu,
                              preset.labelEn,
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={slot.strengthTraitRu}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            strengthTraitRu: event.target.value,
                          })
                        }
                        placeholder={t("strengthRuPlaceholder")}
                        maxLength={80}
                        className="min-h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent"
                      />
                      <input
                        value={slot.strengthTraitEn}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            strengthTraitEn: event.target.value,
                          })
                        }
                        placeholder={t("strengthEnPlaceholder")}
                        maxLength={80}
                        className="min-h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent"
                      />
                      <input
                        type="number"
                        min={20}
                        max={50}
                        value={slot.strengthValue}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            strengthValue: Number(event.target.value),
                          })
                        }
                        aria-label={t("strengthValue")}
                        className="min-h-10 w-16 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-amber-300">
                      {t("heroWeakness")}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WEAKNESS_PRESETS.map((preset) => {
                        const presetKey = traitIdentityKey(
                          preset.labelRu,
                          preset.labelEn,
                        );
                        const isSelected = presetKey === selectedWeaknessKey;
                        const isTaken = usedWeaknessKeys.has(presetKey);
                        return (
                          <button
                            key={preset.key}
                            type="button"
                            disabled={isTaken}
                            title={
                              isTaken ? t("traitReservedForHero") : undefined
                            }
                            onClick={() =>
                              applyWeaknessPreset(
                                slot.clientId,
                                preset.labelRu,
                                preset.labelEn,
                              )
                            }
                            className={`min-h-8 rounded-lg border px-2 text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                              isSelected
                                ? "border-amber-400 bg-amber-950/30"
                                : "border-border hover:border-amber-400/60"
                            }`}
                          >
                            {pickLocalizedGameText(
                              locale,
                              preset.labelRu,
                              preset.labelEn,
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        value={slot.weaknessTraitRu}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            weaknessTraitRu: event.target.value,
                          })
                        }
                        placeholder={t("weaknessRuPlaceholder")}
                        maxLength={80}
                        className="min-h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent"
                      />
                      <input
                        value={slot.weaknessTraitEn}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            weaknessTraitEn: event.target.value,
                          })
                        }
                        placeholder={t("weaknessEnPlaceholder")}
                        maxLength={80}
                        className="min-h-10 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-accent"
                      />
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={slot.weaknessValue}
                        onChange={(event) =>
                          updateHeroSlot(slot.clientId, {
                            weaknessValue: Number(event.target.value),
                          })
                        }
                        aria-label={t("weaknessValue")}
                        className="min-h-10 w-16 rounded-lg border border-border bg-background px-2 text-xs outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t("traits")}</h3>
        <p className="text-xs text-muted">
          {t("traitsHint", { min: 3, max: traitPointsPerStat })}
        </p>
        <p className="text-xs text-muted">{t("traitsRandomHint")}</p>
        <div className="flex flex-wrap gap-2">
          {TRAIT_PRESETS.map((preset) => {
            const isDisabled = isTraitPresetDisabled(
              preset.labelRu,
              preset.labelEn,
            );
            const isReserved = reservedTraitKeys.has(
              traitIdentityKey(preset.labelRu, preset.labelEn),
            );
            return (
              <button
                key={preset.key}
                type="button"
                disabled={isDisabled}
                title={
                  isReserved
                    ? t("traitReservedForHero")
                    : isDisabled
                      ? t("traitAlreadyAdded")
                      : undefined
                }
                onClick={() => addTraitPreset(preset.labelRu, preset.labelEn)}
                className="min-h-9 rounded-lg border border-border px-3 text-xs hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
              >
                +{" "}
                {pickLocalizedGameText(locale, preset.labelRu, preset.labelEn)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <input
            value={customTrait}
            onChange={(event) => setCustomTrait(event.target.value)}
            placeholder={t("customTraitPlaceholder")}
            maxLength={80}
            className="min-h-11 flex-1 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={addCustomTrait}
            className="min-h-11 shrink-0 rounded-xl border border-border px-4 text-sm hover:border-accent"
          >
            {t("add")}
          </button>
        </div>
        <label className="block space-y-2">
          <span className="text-xs text-muted">{t("traitPointsPerStat")}</span>
          <input
            type="number"
            min={10}
            max={100}
            value={traitPointsPerStat}
            onChange={(event) =>
              setTraitPointsPerStat(Number(event.target.value))
            }
            className="min-h-11 w-28 rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-accent"
          />
        </label>
        {traits.length === 0 ? (
          <p className="text-xs text-muted">{t("noTraitsYet")}</p>
        ) : (
          <ul className="space-y-2">
            {traits.map((trait, index) => (
              <li
                key={trait.clientId}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
              >
                <span>
                  {index + 1}.{" "}
                  {pickLocalizedGameText(locale, trait.labelRu, trait.labelEn)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setTraits((rows) =>
                      rows.filter((row) => row.clientId !== trait.clientId),
                    )
                  }
                  className="text-xs text-red-300 hover:text-red-200"
                >
                  {t("delete")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-emerald-300" role="status">
          {t("saveSuccess")}
        </p>
      ) : null}

      <button
        type="button"
        onClick={saveSetup}
        disabled={isSaving}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-medium hover:border-accent disabled:opacity-60"
      >
        {isSaving ? "..." : t("saveSetup")}
      </button>
    </section>
  );
}
