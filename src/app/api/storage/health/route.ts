import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getStorageDiagnostics, probeStorageAccess } from '@/lib/storage';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const diagnostics = getStorageDiagnostics();
  const probe = await probeStorageAccess();

  return NextResponse.json({
    diagnostics,
    probe,
  });
}
