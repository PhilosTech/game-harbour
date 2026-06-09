import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GameError, makeGamePublic } from '@/server/games';

type RouteContext = {
  params: Promise<{ gameId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gameId } = await context.params;
    const game = await makeGamePublic(session.user.id, gameId);
    return NextResponse.json(game);
  } catch (error) {
    if (error instanceof GameError) {
      const status =
        error.code === 'NOT_FOUND' ? 404 : error.code === 'NO_SCENES' ? 400 : 403;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
