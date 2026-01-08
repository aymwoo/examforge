/*
  Warnings:

  - You are about to drop the column `account_mode` on the `exams` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "account_modes" TEXT NOT NULL DEFAULT '["TEMPORARY_IMPORT"]',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
-- 迁移数据，将单个account_mode转换为数组格式
INSERT INTO "new_exams" ("created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at", "account_modes") 
SELECT "created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at", 
       '["' || "account_mode" || '"]' as "account_modes"
FROM "exams";
DROP TABLE "exams";
ALTER TABLE "new_exams" RENAME TO "exams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
