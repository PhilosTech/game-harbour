import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { GameError, updateHostGame } from "@/server/games";

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { gameId } = await context.params;
    const body = await request.json();
    const game = await updateHostGame(session.user.id, gameId, body);
    return NextResponse.json(game);
  } catch (error) {
    if (error instanceof GameError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "NOT_EDITABLE"
            ? 403
            : 400;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
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
