export type HeroSlotSetup = {
  labelRu: string;
  labelEn: string;
  strengthTraitRu: string;
  strengthTraitEn: string;
  strengthValue: number;
  weaknessTraitRu: string;
  weaknessTraitEn: string;
  weaknessValue: number;
};

export function traitIdentityKey(labelRu: string, labelEn: string): string {
  return (labelEn || labelRu).trim().toLowerCase();
}

export function collectReservedTraitKeys(
  slots: Array<{
    strengthTraitRu: string;
    strengthTraitEn: string;
    weaknessTraitRu: string;
    weaknessTraitEn: string;
  }>,
): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    if (slot.strengthTraitRu || slot.strengthTraitEn) {
      keys.add(traitIdentityKey(slot.strengthTraitRu, slot.strengthTraitEn));
    }
    if (slot.weaknessTraitRu || slot.weaknessTraitEn) {
      keys.add(traitIdentityKey(slot.weaknessTraitRu, slot.weaknessTraitEn));
    }
  }
  return keys;
}

export function collectUsedStrengthKeys(
  slots: Array<{
    clientId?: string;
    strengthTraitRu: string;
    strengthTraitEn: string;
  }>,
  excludeClientId?: string,
): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    if (excludeClientId && slot.clientId === excludeClientId) {
      continue;
    }
    if (slot.strengthTraitRu || slot.strengthTraitEn) {
      keys.add(traitIdentityKey(slot.strengthTraitRu, slot.strengthTraitEn));
    }
  }
  return keys;
}

export function collectUsedWeaknessKeys(
  slots: Array<{
    clientId?: string;
    weaknessTraitRu: string;
    weaknessTraitEn: string;
  }>,
  excludeClientId?: string,
): Set<string> {
  const keys = new Set<string>();
  for (const slot of slots) {
    if (excludeClientId && slot.clientId === excludeClientId) {
      continue;
    }
    if (slot.weaknessTraitRu || slot.weaknessTraitEn) {
      keys.add(traitIdentityKey(slot.weaknessTraitRu, slot.weaknessTraitEn));
    }
  }
  return keys;
}

export function createEmptyHeroSlot(
  labelRu: string,
  labelEn: string,
  strengthValue = 35,
  weaknessValue = 8,
): HeroSlotSetup {
  return {
    labelRu,
    labelEn,
    strengthTraitRu: "",
    strengthTraitEn: "",
    strengthValue,
    weaknessTraitRu: "",
    weaknessTraitEn: "",
    weaknessValue,
  };
}
