-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_questions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT,
    "answer" TEXT,
    "explanation" TEXT,
    "tags" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "knowledgePoint" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "questions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_questions" ("answer", "content", "created_at", "created_by", "difficulty", "explanation", "id", "knowledgePoint", "options", "status", "tags", "type", "updated_at") SELECT "answer", "content", "created_at", "created_by", "difficulty", "explanation", "id", "knowledgePoint", "options", "status", "tags", "type", "updated_at" FROM "questions";
DROP TABLE "questions";
ALTER TABLE "new_questions" RENAME TO "questions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
