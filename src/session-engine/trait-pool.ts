import type { RolledTrait } from "@/types/character";

function randomInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

/**
 * Rolls each shared trait independently: 0..maxPerStat (inclusive).
 * maxPerStat is a per-trait cap, not a shared pool.
 */
export function generateTraitRoll(
  traitIds: string[],
  maxPerStat: number,
): RolledTrait[] {
  if (traitIds.length === 0) {
    return [];
  }

  const cap = Math.max(0, maxPerStat);

  return traitIds.map((traitId) => ({
    traitId,
    value: randomInt(cap),
  }));
}
