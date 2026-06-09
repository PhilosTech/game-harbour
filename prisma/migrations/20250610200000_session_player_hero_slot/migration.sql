-- AlterTable
ALTER TABLE "SessionPlayer" ADD COLUMN "heroSlotId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SessionPlayer_sessionId_heroSlotId_key" ON "SessionPlayer"("sessionId", "heroSlotId");

-- AddForeignKey
ALTER TABLE "SessionPlayer" ADD CONSTRAINT "SessionPlayer_heroSlotId_fkey" FOREIGN KEY ("heroSlotId") REFERENCES "GameHeroSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
