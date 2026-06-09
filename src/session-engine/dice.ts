export const STANDARD_DIE_SIDES = [4, 6, 8, 10, 12, 20] as const;

export type StandardDieSides = (typeof STANDARD_DIE_SIDES)[number];

export function rollD20(): number {
  return rollDie(20);
}

export function rollDie(sides: number): number {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error('Die must have at least 2 sides');
  }
  return Math.floor(Math.random() * sides) + 1;
}

export function rollDice(count: number, sides: number): number[] {
  const safeCount = Math.max(1, Math.min(count, 10));
  return Array.from({ length: safeCount }, () => rollDie(sides));
}

export function formatDieLabel(count: number, sides: number): string {
  return count === 1 ? `d${sides}` : `${count}d${sides}`;
}

export function performDiceRoll(count: number, sides: number) {
  const values = rollDice(count, sides);
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    sides,
    count: values.length,
    label: formatDieLabel(values.length, sides),
    values,
    total,
  };
}

export function resolveRoll(
  natural: number,
  modifier: number,
  dc: number,
): { natural: number; modifier: number; total: number; dc: number; success: boolean } {
  const total = natural + modifier;
  return {
    natural,
    modifier,
    total,
    dc,
    success: total >= dc,
  };
}

export function isStandardDieSides(sides: number): sides is StandardDieSides {
  return (STANDARD_DIE_SIDES as readonly number[]).includes(sides);
}
