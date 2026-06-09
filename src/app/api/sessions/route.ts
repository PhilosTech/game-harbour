import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { GameError } from '@/server/games';
import { createLiveSession, SessionError } from '@/server/sessions';

const createSchema = z.object({
  gameId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = createSchema.parse(await request.json());
    const liveSession = await createLiveSession(session.user.id, body.gameId);
    return NextResponse.json(liveSession);
  } catch (error) {
    if (error instanceof SessionError || error instanceof GameError) {
      const status = error instanceof GameError && error.code === 'FORBIDDEN' ? 403 : 400;
      const code = error instanceof GameError ? error.code : undefined;
      return NextResponse.json({ error: error.message, code }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
