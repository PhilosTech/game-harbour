import { NextResponse } from "next/server";
import { z } from "zod";
import { HostError, resetHostPassword } from "@/server/hosts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await resetHostPassword(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HostError) {
      const status = error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }
    if (error instanceof z.ZodError) {
      const mismatch = error.issues.some((issue) =>
        issue.path.includes("confirmPassword"),
      );
      return NextResponse.json(
        {
          error: mismatch ? "Passwords do not match" : "Invalid payload",
          code: mismatch ? "PASSWORD_MISMATCH" : "INVALID",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
