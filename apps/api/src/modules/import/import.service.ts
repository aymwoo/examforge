import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from '../question/dto/create-question.dto';
import { QuestionStatus, QuestionType } from '@/common/enums/question.enum';
import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { extractTextFromPdf } from '@/common/utils/pdf-text';
import { convertPdfToPngBuffers } from '@/common/utils/pdf-to-images';
import { ImportProgressStore } from './import-progress.store';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

export interface PdfImportResponse {
  jobId: string;
}

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly progressStore: ImportProgressStore,
    private readonly settingsService: SettingsService
  ) {}

  private get question() {
    return this.prisma.question;
  }

  async importFromExcel(buffer: Buffer): Promise<ImportResult> {
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new BadRequestException('No data found in Excel file');
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNum = i + 2;

      try {
        const dto = this.mapRowToDto(row);
        await this.prisma.question.create({
          data: {
            content: dto.content,
            type: dto.type as any,
            options: dto.options ? JSON.stringify(dto.options) : null,
            answer: dto.answer,
            explanation: dto.explanation,
            tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
            difficulty: dto.difficulty || 1,
            status: QuestionStatus.DRAFT,
            knowledgePoint: dto.knowledgePoint,
          },
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: (error as any).message || 'Unknown error',
        });
      }
    }

    return result;
  }

  async importFromPdf(jobId: string, buffer: Buffer, mode?: string): Promise<void> {
    const resolvedMode = (mode || '').toLowerCase().trim();
    const settings = await this.settingsService.getSettings();
    const effectiveMode = resolvedMode || (settings.aiProvider === 'qwen' ? 'vision' : 'text');

    this.progressStore.append(jobId, {
      stage: 'received',
      message: '已收到 PDF，开始解析',
      meta: {
        mode: effectiveMode,
      },
    });

    if (effectiveMode === 'vision') {
      return this.importFromPdfVision(jobId, buffer);
    }

    if (effectiveMode === 'file') {
      return this.importFromPdfFile(jobId, buffer);
    }

    return this.importFromPdfText(jobId, buffer);
  }

  private async importFromPdfVision(jobId: string, buffer: Buffer): Promise<void> {
    try {
      this.progressStore.append(jobId, {
        stage: 'converting_pdf_to_images',
        message: '正在将 PDF 转为图片',
      });

      // Higher resolution for better OCR/recognition
      const images = await convertPdfToPngBuffers(buffer, { resolutionDpi: 300 });

      this.progressStore.append(jobId, {
        stage: 'converting_pdf_to_images',
        message: `PDF 转图完成，共 ${images.length} 页`,
        meta: {
          totalPages: images.length,
        },
      });

      const result: ImportResult = { success: 0, failed: 0, errors: [] };
      const collectedQuestions: any[] = [];
      let pagesWithErrors = 0;

      for (let pageIndex = 0; pageIndex < images.length; pageIndex++) {
        const b64 = images[pageIndex].toString('base64');

        this.progressStore.append(jobId, {
          stage: 'calling_ai',
          message: `正在调用 AI 识别图片（${pageIndex + 1}/${images.length}）`,
          current: pageIndex + 1,
          total: images.length,
          meta: {
            pageIndex: pageIndex + 1,
            totalPages: images.length,
            imageBytes: images[pageIndex].length,
          },
        });

        // Retry up to 2 times on failure
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const { questions } = await this.aiService.generateExamQuestionsFromImage(b64);
            this.progressStore.append(jobId, {
              stage: 'ai_response_received',
              message: `AI 返回 ${questions.length} 道题（第 ${pageIndex + 1}/${images.length} 页）`,
              current: pageIndex + 1,
              total: images.length,
            });
            collectedQuestions.push(...questions);
            lastError = null;
            break;
          } catch (error) {
            lastError = error as Error;
            console.error(
              `[Vision] Page ${pageIndex + 1} attempt ${attempt} failed:`,
              (error as any)?.message
            );
            if (attempt < 2) {
              // wait a bit before retry
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        if (lastError) {
          pagesWithErrors++;
          result.errors.push({
            row: pageIndex + 1,
            message: `页面 ${pageIndex + 1} AI 识别失败: ${lastError.message || 'Unknown'}`,
          });
        }
      }

      this.progressStore.append(jobId, {
        stage: 'merging_questions',
        message: '正在合并与去重题目',
      });

      const mergedQuestions = this.mergeAndDedupeQuestions(collectedQuestions, result);

      this.progressStore.append(jobId, {
        stage: 'saving_questions',
        message: '正在保存题目到题库',
        current: 0,
        total: mergedQuestions.length,
      });

      for (let i = 0; i < mergedQuestions.length; i++) {
        const q = mergedQuestions[i] as any;

        try {
          const mappedType = this.mapQuestionType(q.type);
          await this.prisma.question.create({
            data: {
              content: q.content,
              type: mappedType as any,
              options: q.options ? JSON.stringify(q.options) : null,
              answer: q.answer,
              explanation: q.explanation,
              tags: q.tags ? JSON.stringify(q.tags) : '[]',
              difficulty: q.difficulty || 1,
              status: QuestionStatus.DRAFT,
              knowledgePoint: q.knowledgePoint,
            },
          });
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            message: (error as any).message || 'Unknown error',
          });
        }

        this.progressStore.append(jobId, {
          stage: 'saving_questions',
          message: '正在保存题目到题库',
          current: i + 1,
          total: mergedQuestions.length,
        });
      }

      // Add page-level errors to failed count (but not double-counted)
      result.failed += pagesWithErrors;

      this.progressStore.append(jobId, {
        stage: 'done',
        message: '导入完成',
        result,
      });
    } catch (error: unknown) {
      this.progressStore.append(jobId, {
        stage: 'error',
        message: (error as any)?.message || '导入失败',
      });
      throw error;
    }
  }

  private async importFromPdfFile(jobId: string, _buffer: Buffer): Promise<void> {
    const error = new BadRequestException(
      '当前 AI 提供方/模型暂不支持直接发送 PDF 文件。请改用“图片识别（推荐）”或“文本解析”。'
    );
    this.progressStore.append(jobId, {
      stage: 'error',
      message: (error as any)?.message || '导入失败',
    });
    throw error;
  }

  private async importFromPdfText(jobId: string, buffer: Buffer): Promise<void> {
    try {
      this.progressStore.append(jobId, {
        stage: 'extracting_text',
        message: '正在提取 PDF 文本',
      });
      const text = await extractTextFromPdf(buffer);

      const normalizedText = text
        .replace(/\r/g, '')
        .replace(/\n+/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      if (!normalizedText) {
        throw new BadRequestException('PDF 文本为空，无法导入');
      }

      // Keep chunks smaller to reduce truncation in AI output and increase recall.
      const chunks = this.splitTextIntoChunks(normalizedText, 6000);

      const result: ImportResult = { success: 0, failed: 0, errors: [] };

      const collectedQuestions: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkPreview = chunks[i].slice(0, 80).replace(/\s+/g, ' ').trim();

        this.progressStore.append(jobId, {
          stage: 'calling_ai',
          message: `正在调用 AI 生成题目（${i + 1}/${chunks.length}）`,
          current: i + 1,
          total: chunks.length,
          meta: {
            chunkLength: chunks[i].length,
            chunkPreview,
          },
        });

        try {
          const { questions } = await this.aiService.generateQuestionsFromText(chunks[i], {
            chunkIndex: i + 1,
            totalChunks: chunks.length,
          });

          this.progressStore.append(jobId, {
            stage: 'ai_response_received',
            message: `AI 返回 ${questions.length} 道题（分块 ${i + 1}/${chunks.length}）`,
            current: i + 1,
            total: chunks.length,
          });

          collectedQuestions.push(...questions);
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: i + 1,
            message: (error as any).message || 'AI 处理失败',
          });
        }
      }

      this.progressStore.append(jobId, {
        stage: 'merging_questions',
        message: '正在合并与去重题目',
      });

      const mergedQuestions = this.mergeAndDedupeQuestions(collectedQuestions, result);

      this.progressStore.append(jobId, {
        stage: 'saving_questions',
        message: '正在保存题目到题库',
        current: 0,
        total: mergedQuestions.length,
      });

      for (let i = 0; i < mergedQuestions.length; i++) {
        const q = mergedQuestions[i] as any;
        const rowNum = i + 1;

        try {
          const mappedType = this.mapQuestionType(q.type);
          await this.prisma.question.create({
            data: {
              content: q.content,
              type: mappedType as any,
              options: q.options ? JSON.stringify(q.options) : null,
              answer: q.answer,
              explanation: q.explanation,
              tags: q.tags ? JSON.stringify(q.tags) : '[]',
              difficulty: q.difficulty || 1,
              status: QuestionStatus.DRAFT,
              knowledgePoint: q.knowledgePoint,
            },
          });
          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push({
            row: rowNum,
            message: (error as any).message || 'Unknown error',
          });
        }

        this.progressStore.append(jobId, {
          stage: 'saving_questions',
          message: '正在保存题目到题库',
          current: i + 1,
          total: mergedQuestions.length,
        });
      }

      this.progressStore.append(jobId, {
        stage: 'done',
        message: '导入完成',
        result,
      });
    } catch (error: unknown) {
      this.progressStore.append(jobId, {
        stage: 'error',
        message: (error as any)?.message || '导入失败',
      });
      throw error;
    }
  }

  private splitTextIntoChunks(text: string, maxChunkChars: number): string[] {
    if (text.length <= maxChunkChars) return [text];

    const numbered = this.splitByQuestionNumber(text);
    if (numbered.length <= 1) {
      return this.splitBySeparators(text, maxChunkChars);
    }

    // Merge question-blocks into chunks looking for ~maxChunkChars.
    const chunks: string[] = [];
    let current = '';

    for (const block of numbered) {
      const next = current ? `${current}\n${block}` : block;
      if (current && next.length > maxChunkChars) {
        chunks.push(current.trim());
        current = block;
        continue;
      }
      current = next;
    }

    if (current.trim()) {
      chunks.push(current.trim());
    }

    return chunks;
  }

  private splitByQuestionNumber(text: string): string[] {
    const normalized = text.replace(/\r/g, '');

    // Common patterns:
    // - 1. / 1、 / 1)
    // - （1）
    // - ① ② ...
    const markers = [
      /(^|\n)\s*\d{1,3}[\.、\)]\s+/g,
      /(^|\n)\s*[（(]\d{1,3}[）)]\s*/g,
      /(^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/g,
    ];

    const candidates: Array<{ index: number }> = [];

    for (const re of markers) {
      re.lastIndex = 0;
      let match: RegExpExecArray | null = null;
      while ((match = re.exec(normalized))) {
        const idx = match.index + (match[1] ? match[1].length : 0);
        if (idx >= 0) {
          candidates.push({ index: idx });
        }
      }
    }

    const starts = Array.from(new Set(candidates.map((c) => c.index)))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);

    // Heuristic: if we found too few markers, fallback.
    if (starts.length < 3) {
      return [text];
    }

    const blocks: string[] = [];
    for (let i = 0; i < starts.length; i++) {
      const start = starts[i];
      const end = i + 1 < starts.length ? starts[i + 1] : normalized.length;
      const block = normalized.slice(start, end).trim();
      if (block) blocks.push(block);
    }

    return blocks.length > 0 ? blocks : [text];
  }

  private splitBySeparators(text: string, maxChunkChars: number): string[] {
    const separators = ['\n\n', '\n', '。', '.', ';'];

    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxChunkChars) {
      let cutIndex = -1;

      for (const sep of separators) {
        const idx = remaining.lastIndexOf(sep, maxChunkChars);
        if (idx > Math.floor(maxChunkChars * 0.6)) {
          cutIndex = idx + sep.length;
          break;
        }
      }

      if (cutIndex === -1) {
        cutIndex = maxChunkChars;
      }

      const chunk = remaining.slice(0, cutIndex).trim();
      if (chunk) chunks.push(chunk);
      remaining = remaining.slice(cutIndex).trim();
    }

    if (remaining) chunks.push(remaining);
    return chunks;
  }

  private mergeAndDedupeQuestions(questions: any[], result: ImportResult): any[] {
    const map = new Map<string, any>();

    for (const q of questions) {
      const content = String(q?.content || '').trim();
      const type = String(q?.type || '').trim();

      if (!content || !type) {
        result.failed++;
        result.errors.push({ row: 0, message: 'AI 返回题目缺少 content/type，已跳过' });
        continue;
      }

      const key = `${type}::${content}`;
      if (!map.has(key)) {
        map.set(key, { ...q, content, type });
      }
    }

    return Array.from(map.values());
  }

  /**
   * Map AI-returned type string (may be Chinese or various formats) to QuestionType enum.
   */
  private mapQuestionType(typeStr: string): QuestionType {
    const normalized = String(typeStr || '')
      .trim()
      .toLowerCase();

    const typeMap: Record<string, QuestionType> = {
      单选题: QuestionType.SINGLE_CHOICE,
      单选: QuestionType.SINGLE_CHOICE,
      single: QuestionType.SINGLE_CHOICE,
      single_choice: QuestionType.SINGLE_CHOICE,
      singlechoice: QuestionType.SINGLE_CHOICE,
      多选题: QuestionType.MULTIPLE_CHOICE,
      多选: QuestionType.MULTIPLE_CHOICE,
      multiple: QuestionType.MULTIPLE_CHOICE,
      multiple_choice: QuestionType.MULTIPLE_CHOICE,
      multiplechoice: QuestionType.MULTIPLE_CHOICE,
      判断题: QuestionType.TRUE_FALSE,
      判断: QuestionType.TRUE_FALSE,
      true_false: QuestionType.TRUE_FALSE,
      truefalse: QuestionType.TRUE_FALSE,
      填空题: QuestionType.FILL_BLANK,
      填空: QuestionType.FILL_BLANK,
      fill_blank: QuestionType.FILL_BLANK,
      fillblank: QuestionType.FILL_BLANK,
      简答题: QuestionType.ESSAY,
      简答: QuestionType.ESSAY,
      问答题: QuestionType.ESSAY,
      essay: QuestionType.ESSAY,
      实践应用题: QuestionType.ESSAY,
      应用题: QuestionType.ESSAY,
    };

    return typeMap[normalized] || QuestionType.SINGLE_CHOICE;
  }

  private mapRowToDto(row: any): CreateQuestionDto {
    const content = row['题干'] || row['content'] || row['Content'] || '';
    const typeStr = row['题型'] || row['type'] || row['Type'] || 'SINGLE_CHOICE';
    const answer = row['答案'] || row['answer'] || row['Answer'] || '';

    if (!content) {
      throw new BadRequestException('题干不能为空，请确保 Excel 包含"题干"列');
    }

    const typeMap: Record<string, QuestionType> = {
      单选题: QuestionType.SINGLE_CHOICE,
      single: QuestionType.SINGLE_CHOICE,
      single_choice: QuestionType.SINGLE_CHOICE,
      SINGLE_CHOICE: QuestionType.SINGLE_CHOICE,
      多选题: QuestionType.MULTIPLE_CHOICE,
      multiple: QuestionType.MULTIPLE_CHOICE,
      multiple_choice: QuestionType.MULTIPLE_CHOICE,
      MULTIPLE_CHOICE: QuestionType.MULTIPLE_CHOICE,
      判断题: QuestionType.TRUE_FALSE,
      true_false: QuestionType.TRUE_FALSE,
      TRUE_FALSE: QuestionType.TRUE_FALSE,
      填空题: QuestionType.FILL_BLANK,
      fill_blank: QuestionType.FILL_BLANK,
      FILL_BLANK: QuestionType.FILL_BLANK,
      简答题: QuestionType.ESSAY,
      essay: QuestionType.ESSAY,
      ESSAY: QuestionType.ESSAY,
    };

    const type = typeMap[typeStr.toLowerCase()] || QuestionType.SINGLE_CHOICE;

    const dto: CreateQuestionDto = {
      content,
      type,
      answer: answer || undefined,
    };

    if (row['选项'] || row['options'] || row['Options']) {
      const optionsStr = row['选项'] || row['options'] || row['Options'];
      const options = this.parseOptions(optionsStr);
      if (options.length > 0) {
        dto.options = options;
      }
    }

    if (row['解析'] || row['explanation'] || row['Explanation']) {
      dto.explanation = row['解析'] || row['explanation'] || row['Explanation'];
    }

    if (row['标签'] || row['tags'] || row['Tags']) {
      const tagsStr = row['标签'] || row['tags'] || row['Tags'];
      dto.tags = Array.isArray(tagsStr)
        ? tagsStr
        : tagsStr
            .toString()
            .split(',')
            .map((t: string) => t.trim());
    }

    if (row['难度'] || row['difficulty'] || row['Difficulty']) {
      const difficulty = parseInt(row['难度'] || row['difficulty'] || row['Difficulty']);
      if (!isNaN(difficulty) && difficulty >= 1 && difficulty <= 5) {
        dto.difficulty = difficulty;
      }
    }

    if (row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint']) {
      dto.knowledgePoint = row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint'];
    }

    return dto;
  }

  private parseOptions(optionsStr: string | any): any[] {
    if (Array.isArray(optionsStr)) {
      return optionsStr.map((opt, idx) => ({
        label: String.fromCharCode(65 + idx),
        content: opt,
      }));
    }

    if (typeof optionsStr === 'string') {
      const parts = optionsStr.split(/[,;|]/).map((s) => s.trim());
      return parts.map((opt, idx) => ({
        label: String.fromCharCode(65 + idx),
        content: opt,
      }));
    }

    return [];
  }
}
