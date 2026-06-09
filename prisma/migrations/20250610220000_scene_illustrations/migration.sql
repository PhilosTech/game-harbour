-- CreateTable
CREATE TABLE "GameSceneIllustration" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSceneIllustration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSceneIllustration_sceneId_order_idx" ON "GameSceneIllustration"("sceneId", "order");

-- AddForeignKey
ALTER TABLE "GameSceneIllustration" ADD CONSTRAINT "GameSceneIllustration_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "GameScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;
