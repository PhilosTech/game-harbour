import { z } from 'zod';

const textField = z.string().trim();

export const bilingualGameContentSchema = z
  .object({
    titleRu: textField.max(120),
    titleEn: textField.max(120),
    descriptionRu: textField.max(2000),
    descriptionEn: textField.max(2000),
  })
  .superRefine((data, ctx) => {
    const hasRu = Boolean(data.titleRu || data.descriptionRu);
    const hasEn = Boolean(data.titleEn || data.descriptionEn);

    if (!hasRu && !hasEn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'LANGUAGE_REQUIRED',
        path: ['titleEn'],
      });
      return;
    }

    if (hasRu) {
      if (!data.titleRu) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RU_TITLE_REQUIRED',
          path: ['titleRu'],
        });
      }
      if (!data.descriptionRu) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'RU_DESCRIPTION_REQUIRED',
          path: ['descriptionRu'],
        });
      }
    }

    if (hasEn) {
      if (!data.titleEn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EN_TITLE_REQUIRED',
          path: ['titleEn'],
        });
      }
      if (!data.descriptionEn) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'EN_DESCRIPTION_REQUIRED',
          path: ['descriptionEn'],
        });
      }
    }
  });

function refineBilingualBody(
  data: { contentRu: string; contentEn: string },
  ctx: z.RefinementCtx,
) {
  const hasRu = Boolean(data.contentRu);
  const hasEn = Boolean(data.contentEn);

  if (!hasRu && !hasEn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'SCENE_LANGUAGE_REQUIRED',
      path: ['contentEn'],
    });
    return;
  }

  if (hasRu && !data.contentRu) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'RU_CONTENT_REQUIRED',
      path: ['contentRu'],
    });
  }

  if (hasEn && !data.contentEn) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'EN_CONTENT_REQUIRED',
      path: ['contentEn'],
    });
  }
}

export const bilingualSceneBodySchema = z
  .object({
    contentRu: textField.max(5000),
    contentEn: textField.max(5000),
  })
  .superRefine(refineBilingualBody);

export const updateGameSchema = bilingualGameContentSchema;

export function pickLocalizedGameText(
  locale: string,
  ru: string,
  en: string,
): string {
  const ruText = ru.trim();
  const enText = en.trim();

  if (locale === 'en') {
    return enText || ruText;
  }

  return ruText || enText;
}
