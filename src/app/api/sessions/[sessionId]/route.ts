import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getLiveSessionForHost, getRoomState, SessionError } from '@/server/sessions';

type Params = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { sessionId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const liveSession = await getLiveSessionForHost(sessionId, session.user.id);
    const state = await getRoomState(sessionId);
    return NextResponse.json({ session: liveSession, state });
  } catch (error) {
    if (error instanceof SessionError) {
      const status = error.code === 'FORBIDDEN' ? 403 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
