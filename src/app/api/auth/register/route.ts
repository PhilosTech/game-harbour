import { NextResponse } from "next/server";
import { z } from "zod";
import { HostError, registerHost } from "@/server/hosts";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const host = await registerHost(body);
    return NextResponse.json(host, { status: 201 });
  } catch (error) {
    if (error instanceof HostError) {
      const status = error.code === "TAKEN" ? 409 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
