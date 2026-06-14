import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPlayerNameInSession } from "@/server/sessions";

const checkSchema = z.object({
  roomCode: z.string().min(4).max(8),
  displayName: z.string().min(1).max(32),
});

export async function POST(request: Request) {
  try {
    const body = checkSchema.parse(await request.json());
    const result = await checkPlayerNameInSession(
      body.roomCode,
      body.displayName,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ status: "invalid_name" }, { status: 400 });
    }
    return NextResponse.json({ status: "invalid_name" }, { status: 500 });
  }
}
