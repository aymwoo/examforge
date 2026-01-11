-- CreateTable
CREATE TABLE "import_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_path" TEXT,
    "user_id" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'vision',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "question_ids" TEXT NOT NULL DEFAULT '[]',
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    CONSTRAINT "import_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "import_records_job_id_key" ON "import_records"("job_id");
