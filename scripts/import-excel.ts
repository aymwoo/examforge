/**
 * Import questions from Excel file
 *
 * Usage: pnpm run import-excel -- <file-path>
 *
 * Example: pnpm run import-excel -- ./questions.xlsx
 */

import * as XLSX from "xlsx";
import * as fs from "fs";
import axios from "axios";

interface Question {
  content: string;
  type: string;
  options?: any[];
  answer: string;
  explanation?: string;
  tags?: string[];
  difficulty?: number;
}

const API_URL = process.env.API_URL || "http://localhost:3000";

async function importQuestions(filePath: string) {
  console.log(`Importing questions from: ${filePath}`);

  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet);

  console.log(`Found ${rawData.length} rows`);

  const questions: Question[] = rawData
    .map((row: any) => {
      // Handle Chinese or English column names
      const content = row["题干"] || row["content"];
      const type = row["题型"] || row["type"] || "SINGLE_CHOICE";
      const answer = row["答案"] || row["answer"];
      const options = row["选项"] || row["options"];
      const explanation = row["解析"] || row["explanation"];
      const tags = row["标签"] || row["tags"];
      const difficulty = row["难度"] || row["difficulty"] || 1;

      // Parse options if string
      let parsedOptions;
      if (typeof options === "string") {
        try {
          parsedOptions = JSON.parse(options);
        } catch {
          parsedOptions = undefined;
        }
      }

      return {
        content,
        type: normalizeType(type),
        options: parsedOptions,
        answer: String(answer),
        explanation,
        tags:
          typeof tags === "string" ? tags.split(",").map((t) => t.trim()) : [],
        difficulty: Number(difficulty) || 1,
      };
    })
    .filter((q) => q.content && q.answer);

  console.log(`Valid questions: ${questions.length}`);

  // Import to API
  let successCount = 0;
  let failCount = 0;

  for (const question of questions) {
    try {
      await axios.post(`${API_URL}/questions`, question);
      console.log(`✓ Imported: ${question.content.substring(0, 50)}...`);
      successCount++;
    } catch (error: any) {
      console.error(`✗ Failed: ${question.content.substring(0, 50)}...`);
      console.error(
        `  Error: ${error.response?.data?.message || error.message}`,
      );
      failCount++;
    }
  }

  console.log("\nImport complete!");
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
}

function normalizeType(type: string): string {
  const typeMap: Record<string, string> = {
    单选题: "SINGLE_CHOICE",
    多选题: "MULTIPLE_CHOICE",
    判断题: "TRUE_FALSE",
    填空题: "FILL_BLANK",
    简答题: "ESSAY",
    single_choice: "SINGLE_CHOICE",
    multiple_choice: "MULTIPLE_CHOICE",
    true_false: "TRUE_FALSE",
    fill_blank: "FILL_BLANK",
    essay: "ESSAY",
  };

  return typeMap[type] || type;
}

// CLI
const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: pnpm run import-excel -- <file-path>");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

importQuestions(filePath).catch(console.error);
