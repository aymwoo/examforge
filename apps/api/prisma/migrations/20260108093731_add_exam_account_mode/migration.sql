-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class_id" TEXT,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_exam_students" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exam_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "display_name" TEXT,
    "account_type" TEXT NOT NULL DEFAULT 'TEMPORARY',
    "student_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "exam_students_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "exam_students_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students" ("student_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_exam_students" ("created_at", "display_name", "exam_id", "id", "password", "updated_at", "username") SELECT "created_at", "display_name", "exam_id", "id", "password", "updated_at", "username" FROM "exam_students";
DROP TABLE "exam_students";
ALTER TABLE "new_exam_students" RENAME TO "exam_students";
CREATE UNIQUE INDEX "exam_students_exam_id_username_key" ON "exam_students"("exam_id", "username");
CREATE TABLE "new_exams" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "account_mode" TEXT NOT NULL DEFAULT 'TEMPORARY_IMPORT',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_exams" ("created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at") SELECT "created_at", "description", "duration", "endTime", "id", "startTime", "status", "title", "totalScore", "updated_at" FROM "exams";
DROP TABLE "exams";
ALTER TABLE "new_exams" RENAME TO "exams";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "students_student_id_key" ON "students"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_code_key" ON "classes"("code");
