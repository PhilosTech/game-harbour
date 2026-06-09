-- CreateTable
CREATE TABLE "GameSceneTask" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "textRu" TEXT NOT NULL DEFAULT '',
    "textEn" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSceneTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameSceneTask_sceneId_order_idx" ON "GameSceneTask"("sceneId", "order");

-- AddForeignKey
ALTER TABLE "GameSceneTask" ADD CONSTRAINT "GameSceneTask_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "GameScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy single playerTask into first task row
INSERT INTO "GameSceneTask" ("id", "sceneId", "order", "textRu", "textEn", "updatedAt")
SELECT
    concat('migrated_', "id"),
    "id",
    1,
    COALESCE("playerTaskRu", ''),
    COALESCE("playerTaskEn", ''),
    CURRENT_TIMESTAMP
FROM "GameScene"
WHERE COALESCE("playerTaskRu", '') <> '' OR COALESCE("playerTaskEn", '') <> '';
