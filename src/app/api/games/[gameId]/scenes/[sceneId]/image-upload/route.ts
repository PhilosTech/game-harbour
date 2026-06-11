import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getPublicAssetUrl, StorageConfigError, uploadObject } from '@/lib/storage';
import { assertGameIsEditable, GameError } from '@/server/games';
import { db } from '@/lib/db';

const MAX_FILE_BYTES = 4 * 1024 * 1024;

const allowedContentTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

const kindSchema = z.enum(['background', 'illustration']);

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
    const formData = await request.formData();
    const file = formData.get('file');
    const kind = kindSchema.parse(String(formData.get('kind') ?? ''));
    const assetIdRaw = formData.get('assetId');
    const assetId =
      typeof assetIdRaw === 'string' && assetIdRaw.trim() ? assetIdRaw.trim() : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required', code: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    if (!allowedContentTypes.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type', code: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large', code: 'FILE_TOO_LARGE' }, { status: 400 });
    }

    if (kind === 'illustration' && !assetId) {
      return NextResponse.json({ error: 'assetId is required', code: 'INVALID_PAYLOAD' }, { status: 400 });
    }

    await assertGameIsEditable(session.user.id, gameId);

    const scene = await db.gameScene.findFirst({
      where: { id: sceneId, gameId },
      select: { id: true },
    });

    if (!scene) {
      return NextResponse.json({ error: 'Scene not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const extension = extensionByContentType[file.type];
    const storageKey = buildStorageKey(gameId, sceneId, kind, extension, assetId);
    const body = new Uint8Array(await file.arrayBuffer());

    await uploadObject(storageKey, file.type, body);

    const publicUrl = getPublicAssetUrl(storageKey);

    return NextResponse.json({ publicUrl, storageKey });
  } catch (error) {
    if (error instanceof GameError) {
      const status = error.code === 'NOT_EDITABLE' ? 403 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', code: 'INVALID_PAYLOAD' }, { status: 400 });
    }
    if (error instanceof StorageConfigError) {
      console.error('[image-upload] storage config:', error.message);
      return NextResponse.json(
        { error: 'Storage is not configured', code: 'STORAGE_UNAVAILABLE' },
        { status: 503 },
      );
    }
    if (error instanceof Error) {
      console.error('[image-upload]', error.message);
    }
    return NextResponse.json({ error: 'Internal error', code: 'STORAGE_ERROR' }, { status: 500 });
  }
}
