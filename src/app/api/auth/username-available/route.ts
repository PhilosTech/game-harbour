import { NextResponse } from 'next/server';
import { isUsernameAvailable, usernameSchema } from '@/server/hosts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username') ?? '';

  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    return NextResponse.json({ available: false, valid: false });
  }

  const available = await isUsernameAvailable(parsed.data);
  return NextResponse.json({ available, valid: true });
}
