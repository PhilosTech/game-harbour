import { NextResponse } from "next/server";
import { z } from "zod";
import { mapSessionErrorCode } from "@/lib/session-errors";
import { joinSession, SessionError } from "@/server/sessions";

const joinSchema = z.object({
  roomCode: z.string().min(4).max(8),
  displayName: z.string().min(1).max(32),
});

export async function POST(request: Request) {
  try {
    const body = joinSchema.parse(await request.json());
    const result = await joinSession(body.roomCode, body.displayName);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SessionError) {
      const status =
        error.code === "NOT_FOUND"
          ? 404
          : error.code === "NAME_NOT_IN_SESSION"
            ? 403
            : 400;

      return NextResponse.json(
        {
          code: mapSessionErrorCode(error.code),
          error: error.message,
        },
        { status },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "INVALID_INPUT", error: "Invalid payload" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { code: "UNKNOWN", error: "Internal error" },
      { status: 500 },
    );
  }
}
