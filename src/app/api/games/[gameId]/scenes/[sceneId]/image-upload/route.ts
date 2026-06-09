import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createUploadUrl, getPublicAssetUrl } from '@/lib/storage';
import { assertGameIsEditable, GameError } from '@/server/games';
import { db } from '@/lib/db';

const bodySchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  kind: z.enum(['background', 'illustration']),
  assetId: z.string().min(1).max(80).optional(),
});

const extensionByContentType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

type RouteContext = {
  params: Promise<{ gameId: string; sceneId: string }>;
};

function buildStorageKey(
  gameId: string,
  sceneId: string,
  kind: 'background' | 'illustration',
  extension: string,
  assetId?: string,
): string {
  if (kind === 'background') {
    return `games/${gameId}/scenes/${sceneId}/background.${extension}`;
  }

  if (!assetId) {
    throw new Error('assetId is required for illustration uploads');
  }

  return `games/${gameId}/scenes/${sceneId}/illustrations/${assetId}.${extension}`;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { gameId, sceneId } = await context.params;
    const body = bodySchema.parse(await request.json());

    await assertGameIsEditable(session.user.id, gameId);

    const scene = await db.gameScene.findFirst({
      where: { id: sceneId, gameId },
      select: { id: true },
    });

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const extension = extensionByContentType[body.contentType];
    const storageKey = buildStorageKey(
      gameId,
      sceneId,
      body.kind,
      extension,
      body.assetId,
    );
    const uploadUrl = await createUploadUrl(storageKey, body.contentType);
    const publicUrl = getPublicAssetUrl(storageKey);

    return NextResponse.json({ uploadUrl, publicUrl, storageKey });
  } catch (error) {
    if (error instanceof GameError) {
      const status = error.code === 'NOT_EDITABLE' ? 403 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', code: 'INVALID_PAYLOAD' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('S3')) {
      return NextResponse.json({ error: 'Storage is not configured', code: 'STORAGE_UNAVAILABLE' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
