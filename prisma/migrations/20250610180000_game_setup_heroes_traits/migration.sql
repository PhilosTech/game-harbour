-- AlterTable
ALTER TABLE "GameTemplate" ADD COLUMN "traitPointsPerStat" INTEGER NOT NULL DEFAULT 30;

-- CreateTable
CREATE TABLE "GameHeroSlot" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "labelRu" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameHeroSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTrait" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "labelRu" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameTrait_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GameScene" ADD COLUMN "playerTaskRu" TEXT,
ADD COLUMN "playerTaskEn" TEXT;

-- CreateIndex
CREATE INDEX "GameHeroSlot_gameId_order_idx" ON "GameHeroSlot"("gameId", "order");

-- CreateIndex
CREATE INDEX "GameTrait_gameId_order_idx" ON "GameTrait"("gameId", "order");

-- AddForeignKey
ALTER TABLE "GameHeroSlot" ADD CONSTRAINT "GameHeroSlot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameTrait" ADD CONSTRAINT "GameTrait_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "GameTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
