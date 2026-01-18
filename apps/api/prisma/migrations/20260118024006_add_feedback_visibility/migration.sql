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
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "ai_analysis_model" TEXT,
    "ai_analysis_prompt_used" TEXT,
    "ai_analysis_provider_id" TEXT,
    "ai_analysis_report" TEXT,
    "ai_analysis_status" TEXT,
    "ai_analysis_updated_at" DATETIME,
    "feedback_visibility" TEXT NOT NULL DEFAULT 'FINAL_SCORE',
    CONSTRAINT "exams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_exams" ("account_modes", "ai_analysis_model", "ai_analysis_prompt_used", "ai_analysis_provider_id", "ai_analysis_report", "ai_analysis_status", "ai_analysis_updated_at", "created_at", "created_by", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at") SELECT "account_modes", "ai_analysis_model", "ai_analysis_prompt_used", "ai_analysis_provider_id", "ai_analysis_report", "ai_analysis_status", "ai_analysis_updated_at", "created_at", "created_by", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at" FROM "exams";
DROP TABLE "exams";
ALTER TABLE "new_exams" RENAME TO "exams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
