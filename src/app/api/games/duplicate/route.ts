import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { duplicateGameForHost, GameError } from "@/server/games";

const duplicateSchema = z.object({
  gameId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = duplicateSchema.parse(await request.json());
    const game = await duplicateGameForHost(session.user.id, body.gameId);
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof GameError) {
      const status = error.code === "NOT_FOUND" ? 404 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
