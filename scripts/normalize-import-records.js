const fs = require("fs/promises");
const path = require("path");

let PrismaClient;

try {
  ({ PrismaClient } = require("@prisma/client"));
} catch (error) {
  const fallbackPath = path.join(
    __dirname,
    "..",
    "apps",
    "api",
    "node_modules",
    "@prisma",
    "client",
  );
  ({ PrismaClient } = require(fallbackPath));
}

const prisma = new PrismaClient();

const parseQuestionIds = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw !== "string") return [];

  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean);
    }
    if (typeof parsed === "string") {
      return parsed ? [parsed] : [];
    }
    return [];
  } catch {
    return trimmed
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  }
};

const ensureDatabaseUrl = async () => {
  if (process.env.DATABASE_URL) return;

  try {
    const envPath = path.join(process.cwd(), "apps", "api", ".env");
    const content = await fs.readFile(envPath, "utf8");
    const line = content
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("DATABASE_URL="));

    if (line) {
      const value = line.slice("DATABASE_URL=".length).trim();
      if (value) {
        process.env.DATABASE_URL = value.replace(/^"|"$/g, "");
      }
    }
  } catch {
    // ignore missing env file
  }
};

const normalizeImportRecords = async () => {
  await ensureDatabaseUrl();

  const records = await prisma.importRecord.findMany({
    select: {
      id: true,
      jobId: true,
      questionIds: true,
    },
  });

  let updatedCount = 0;

  for (const record of records) {
    const normalizedIds = parseQuestionIds(record.questionIds);
    const normalizedValue = JSON.stringify(normalizedIds);

    if (record.questionIds !== normalizedValue) {
      await prisma.importRecord.update({
        where: { id: record.id },
        data: { questionIds: normalizedValue },
      });
      updatedCount += 1;
      console.log(`Updated import record ${record.jobId}`);
    }
  }

  console.log(
    `Done. Updated ${updatedCount} of ${records.length} import records.`,
  );
};

normalizeImportRecords()
  .catch((error) => {
    console.error("Failed to normalize import records:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
