-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "examId" TEXT NOT NULL,
    "exam_student_id" TEXT,
    "answers" TEXT NOT NULL,
    "score" REAL,
    "isAutoGraded" BOOLEAN NOT NULL DEFAULT false,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewed_by" TEXT,
    "reviewed_at" DATETIME,
    "grading_details" TEXT,
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submissions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "submissions_exam_student_id_fkey" FOREIGN KEY ("exam_student_id") REFERENCES "exam_students" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_submissions" ("answers", "examId", "exam_student_id", "grading_details", "id", "isAutoGraded", "score", "submitted_at") SELECT "answers", "examId", "exam_student_id", "grading_details", "id", "isAutoGraded", "score", "submitted_at" FROM "submissions";
DROP TABLE "submissions";
ALTER TABLE "new_submissions" RENAME TO "submissions";
CREATE INDEX "submissions_examId_idx" ON "submissions"("examId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
