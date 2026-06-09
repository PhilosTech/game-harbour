-- CreateEnum
CREATE TYPE "GameVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- AlterTable
ALTER TABLE "GameTemplate" ADD COLUMN "visibility" "GameVisibility" NOT NULL DEFAULT 'PRIVATE';
