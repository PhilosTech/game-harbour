import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

export const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/, "Username: letters, numbers, _ and - only");

export const registerHostSchema = z.object({
  username: usernameSchema,
  password: z.string().min(8).max(128),
  displayName: z.string().min(1).max(64).optional(),
});

export const resetPasswordSchema = z
  .object({
    username: usernameSchema,
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export class HostError extends Error {
  constructor(
    message: string,
    public code: "TAKEN" | "DISABLED" | "INVALID" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "HostError";
  }
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function registerHost(input: z.infer<typeof registerHostSchema>) {
  if (process.env.ALLOW_HOST_REGISTRATION === "false") {
    throw new HostError("Registration is disabled", "DISABLED");
  }

  const data = registerHostSchema.parse(input);
  const username = normalizeUsername(data.username);

  const existing = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existing) {
    throw new HostError("Username is already taken", "TAKEN");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  return db.user.create({
    data: {
      username,
      displayName: data.displayName?.trim() || username,
      passwordHash,
      role: "HOST",
    },
    select: {
      id: true,
      username: true,
      displayName: true,
    },
  });
}

export async function findHostByUsername(username: string) {
  return db.user.findUnique({
    where: { username: normalizeUsername(username) },
  });
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return false;
  }

  const existing = await db.user.findUnique({
    where: { username: normalizeUsername(parsed.data) },
    select: { id: true },
  });

  return !existing;
}

export async function resetHostPassword(
  input: z.infer<typeof resetPasswordSchema>,
) {
  const data = resetPasswordSchema.parse(input);
  const username = normalizeUsername(data.username);

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true, username: true },
  });

  if (!user) {
    throw new HostError("Username not found", "NOT_FOUND");
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { username: user.username };
}
