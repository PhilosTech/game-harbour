export function buildPredeterminedDiceNotation(
  count: number,
  sides: number,
  values: number[],
): string {
  return `${count}d${sides}@${values.join(',')}`;
}
