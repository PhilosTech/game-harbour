'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type ImageUploadKind = 'background' | 'illustration';

type ImageUploadFieldProps = {
  gameId: string;
  sceneId: string;
  kind: ImageUploadKind;
  assetId?: string;
  title: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  compact?: boolean;
};

export function ImageUploadField({
  gameId,
  sceneId,
  kind,
  assetId,
  title,
  hint,
  value,
  onChange,
  compact = false,
}: ImageUploadFieldProps) {
  const t = useTranslations('bridge');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const pickFile = () => {
    inputRef.current?.click();
  };

  const onFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setError(null);

    if (!ALLOWED_TYPES.has(file.type)) {
      setError(t('imageUploadInvalidType'));
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError(t('imageUploadTooLarge'));
      return;
    }

    if (kind === 'illustration' && !assetId) {
      setError(t('imageUploadFailed'));
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('kind', kind);
      if (assetId) {
        formData.append('assetId', assetId);
      }

      const uploadResponse = await fetch(
        `/api/games/${gameId}/scenes/${sceneId}/image-upload`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (!uploadResponse.ok) {
        const data = (await uploadResponse.json()) as { code?: string; error?: string };
        if (data.code === 'STORAGE_UNAVAILABLE') {
          setError(t('imageUploadUnavailable'));
        } else {
          setError(data.error ?? t('imageUploadFailed'));
        }
        return;
      }

      const { publicUrl } = (await uploadResponse.json()) as { publicUrl: string };
      onChange(publicUrl);
    } catch {
      setError(t('imageUploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const previewClass = compact
    ? 'max-h-24 w-full rounded-lg border border-border object-cover'
    : 'max-h-40 w-full rounded-xl border border-border object-cover';

  return (
    <div className="space-y-2">
      {!compact ? (
        <div className="space-y-1">
          <p className="text-sm text-muted">{title}</p>
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </div>
      ) : (
        <p className="text-xs font-medium text-muted">{title}</p>
      )}

      {value ? (
        <div className="space-y-2">
          <img src={value} alt="" className={previewClass} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={pickFile}
              disabled={isUploading}
              className="min-h-8 rounded-lg border border-border px-2.5 text-xs hover:border-accent disabled:opacity-50"
            >
              {isUploading ? '...' : t('imageUploadReplace')}
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              disabled={isUploading}
              className="min-h-8 rounded-lg border border-border px-2.5 text-xs text-red-300 hover:border-red-500 disabled:opacity-50"
            >
              {t('imageUploadRemove')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickFile}
          disabled={isUploading}
          className="min-h-10 w-full rounded-xl border border-dashed border-border px-3 text-xs hover:border-accent disabled:opacity-50"
        >
          {isUploading ? '...' : t('imageUpload')}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={onFileSelected}
      />

      {error ? (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
