-- Unique player names per session (case-insensitive via displayNameKey)

ALTER TABLE "SessionPlayer" ADD COLUMN IF NOT EXISTS "displayNameKey" TEXT;

UPDATE "SessionPlayer"
SET "displayNameKey" = LOWER(TRIM("displayName"))
WHERE "displayNameKey" IS NULL OR "displayNameKey" = '';

ALTER TABLE "SessionPlayer" ALTER COLUMN "displayNameKey" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SessionPlayer_sessionId_displayNameKey_key"
ON "SessionPlayer"("sessionId", "displayNameKey");
