import { z } from 'zod';

export const sceneKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_-]+$/, 'INVALID_SCENE_KEY');
