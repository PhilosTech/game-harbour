import { db } from "@/lib/db";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createUniqueGameSlug(baseTitle: string): Promise<string> {
  const base = slugify(baseTitle) || "game";
  let suffix = 0;

  while (suffix < 100) {
    const slug = suffix === 0 ? base : `${base}-${suffix}`;
    const existing = await db.gameTemplate.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) {
      return slug;
    }
    suffix += 1;
  }

  return `${base}-${Date.now()}`;
}
