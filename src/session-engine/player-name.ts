export function formatDisplayName(name: string): string {
  return name.trim();
}

export function normalizeDisplayNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function isValidDisplayName(name: string): boolean {
  const formatted = formatDisplayName(name);
  return formatted.length >= 1 && formatted.length <= 32;
}
