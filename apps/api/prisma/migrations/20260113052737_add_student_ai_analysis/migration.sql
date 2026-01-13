-- AlterTable
ALTER TABLE "students" ADD COLUMN "ai_analysis_prompt" TEXT;

-- AlterTable
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_model" TEXT;
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_prompt_used" TEXT;
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_provider" TEXT;
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_report" TEXT;
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_status" TEXT;
ALTER TABLE "submissions" ADD COLUMN "ai_analysis_updated_at" DATETIME;

-- CreateTable
CREATE TABLE "student_ai_analysis_reports" (
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
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "student_ai_analysis_reports_submission_id_key" ON "student_ai_analysis_reports"("submission_id");

-- CreateIndex
CREATE INDEX "student_ai_analysis_reports_exam_id_exam_student_id_idx" ON "student_ai_analysis_reports"("exam_id", "exam_student_id");

-- CreateIndex
CREATE INDEX "student_ai_analysis_reports_student_id_idx" ON "student_ai_analysis_reports"("student_id");
