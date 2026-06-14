import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createHostGame, GameError } from "@/server/games";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const game = await createHostGame(session.user.id, body);
    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    if (error instanceof GameError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 },
      );
    }
    if (error instanceof z.ZodError) {
      const code = error.issues[0]?.message ?? "INVALID_PAYLOAD";
      return NextResponse.json(
        { error: "Invalid payload", code },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
