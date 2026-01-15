-- AlterTable
ALTER TABLE "exams" ADD COLUMN "ai_analysis_model" TEXT;
ALTER TABLE "exams" ADD COLUMN "ai_analysis_prompt_used" TEXT;
ALTER TABLE "exams" ADD COLUMN "ai_analysis_provider_id" TEXT;
ALTER TABLE "exams" ADD COLUMN "ai_analysis_report" TEXT;
ALTER TABLE "exams" ADD COLUMN "ai_analysis_status" TEXT;
ALTER TABLE "exams" ADD COLUMN "ai_analysis_updated_at" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_student_ai_analysis_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submission_id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "exam_student_id" TEXT,
    "student_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "provider_id" TEXT,
    "model" TEXT,
    "prompt_used" TEXT,
    "report" TEXT,
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "student_ai_analysis_reports_exam_student_id_fkey" FOREIGN KEY ("exam_student_id") REFERENCES "exam_students" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_student_ai_analysis_reports" ("created_at", "error_message", "exam_id", "exam_student_id", "id", "model", "progress", "prompt_used", "provider_id", "report", "status", "student_id", "submission_id", "updated_at") SELECT "created_at", "error_message", "exam_id", "exam_student_id", "id", "model", "progress", "prompt_used", "provider_id", "report", "status", "student_id", "submission_id", "updated_at" FROM "student_ai_analysis_reports";
DROP TABLE "student_ai_analysis_reports";
ALTER TABLE "new_student_ai_analysis_reports" RENAME TO "student_ai_analysis_reports";
CREATE UNIQUE INDEX "student_ai_analysis_reports_submission_id_key" ON "student_ai_analysis_reports"("submission_id");
CREATE INDEX "student_ai_analysis_reports_exam_id_exam_student_id_idx" ON "student_ai_analysis_reports"("exam_id", "exam_student_id");
CREATE INDEX "student_ai_analysis_reports_student_id_idx" ON "student_ai_analysis_reports"("student_id");
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "isActive", "name", "password", "role", "updated_at", "username") SELECT "created_at", "email", "id", "isActive", "name", "password", "role", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
