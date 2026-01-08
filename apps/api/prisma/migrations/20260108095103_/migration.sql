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
    "account_modes" TEXT NOT NULL DEFAULT 'TEMPORARY_IMPORT',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_exams" ("account_modes", "created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at") SELECT "account_modes", "created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at" FROM "exams";
DROP TABLE "exams";
ALTER TABLE "new_exams" RENAME TO "exams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
