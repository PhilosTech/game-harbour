import { z } from "zod";

export const rolledTraitSchema = z.object({
  traitId: z.string(),
  value: z.number().int().min(0),
});

export const storedCharacterJsonSchema = z.object({
  rolledTraits: z.array(rolledTraitSchema).nullable().default(null),
  isReady: z.boolean().default(false),
});

export type RolledTrait = z.infer<typeof rolledTraitSchema>;
export type StoredCharacterJson = z.infer<typeof storedCharacterJsonSchema>;

export const EMPTY_CHARACTER_JSON: StoredCharacterJson = {
  rolledTraits: null,
  isReady: false,
};

export function parseStoredCharacterJson(value: unknown): StoredCharacterJson {
  const parsed = storedCharacterJsonSchema.safeParse(value);
  if (!parsed.success) {
    return EMPTY_CHARACTER_JSON;
  }
  return parsed.data;
}

export type PlayerCharacterSnapshot = {
  heroSlotId: string | null;
  heroLabelRu: string;
  heroLabelEn: string;
  strengthTraitRu: string;
  strengthTraitEn: string;
  strengthValue: number;
  weaknessTraitRu: string;
  weaknessTraitEn: string;
  weaknessValue: number;
  rolledTraits: Array<{
    traitId: string;
    labelRu: string;
    labelEn: string;
    value: number;
  }> | null;
  isReady: boolean;
};

export type LobbyHeroSlotSnapshot = {
  id: string;
  order: number;
  labelRu: string;
  labelEn: string;
  strengthTraitRu: string;
  strengthTraitEn: string;
  strengthValue: number;
  weaknessTraitRu: string;
  weaknessTraitEn: string;
  weaknessValue: number;
  claimedByPlayerId: string | null;
};

export type LobbyTraitSnapshot = {
  id: string;
  labelRu: string;
  labelEn: string;
};
