import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import sharp from 'sharp';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from '../question/dto/create-question.dto';
import { QuestionStatus, QuestionType } from '@/common/enums/question.enum';
import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { extractTextFromPdf } from '@/common/utils/pdf-text';
import { serializeQuestionAnswer } from '@/common/utils/question-answer';
import { convertPdfToPngBuffers } from '@/common/utils/pdf-to-images';
import { ImportProgressStore } from './import-progress.store';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
  questionIds?: string[]; // 导入成功的题目ID列表
  jobId?: string;
}

export interface PdfImportResponse {
  jobId: string;
}

export interface ImageProcessingOptions {
  cropTop?: number;
  cropBottom?: number;
  stitchPages?: boolean;
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

  async importFromExcel(buffer: Buffer, userId?: string): Promise<ImportResult> {
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new BadRequestException('No data found in Excel file');
    }

    // 生成唯一的作业ID
    const jobId = `excel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建导入记录
    await this.prisma.importRecord.create({
      data: {
        jobId,
        fileName: 'Excel导入',
        fileSize: buffer.length,
        userId,
        mode: 'excel',
        status: 'processing',
      },
    });

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      questionIds: [],
      jobId,
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNum = i + 2;

      try {
        const dto = this.mapRowToDto(row);
        const question = await this.prisma.question.create({
          data: {
            content: dto.content,
            type: dto.type as any,
            options: dto.options ? JSON.stringify(dto.options) : null,
            answer: serializeQuestionAnswer(dto.answer),
            explanation: dto.explanation,
            tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
            difficulty: dto.difficulty || 1,
            status: QuestionStatus.PUBLISHED, // 导入的题目默认为发布状态
            knowledgePoint: dto.knowledgePoint,
            importOrder: i + 1, // 添加导入顺序
            isPublic: true, // 设置为公开，以便管理员可以查看
            createdBy: userId, // 关联到当前用户
          },
        });
        result.success++;
        result.questionIds!.push(question.id);
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: (error as any).message || 'Unknown error',
        });
      }
    }

    // 更新导入记录状态
    await this.prisma.importRecord.update({
      where: { jobId },
      data: {
        status: 'completed',
        questionIds: JSON.stringify(result.questionIds),
        completedAt: new Date(),
      },
    });

    return result;
  }

  async importFromPdf(
    jobId: string,
    buffer: Buffer,
    mode?: string,
    userId?: string,
    customPrompt?: string,
    fileName?: string,
    imageProcessingOptions?: ImageProcessingOptions
  ): Promise<void> {
    const resolvedMode = (mode || '').toLowerCase().trim();
    const settings = userId
      ? await this.settingsService.getUserSettings(userId)
      : await this.settingsService.getSettings();

    // 处理文件名编码问题
    const decodedFileName = fileName
      ? Buffer.from(fileName, 'latin1').toString('utf8')
      : `${jobId}.pdf`;

    // 检测文件类型
    const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(decodedFileName);
    const effectiveMode = isImageFile
      ? 'vision'
      : resolvedMode || (settings.aiProvider === 'qwen' ? 'vision' : 'text');

    // 保存文件
    const filePath = await this.savePdfFile(buffer, decodedFileName);

    // 创建导入记录
    await this.prisma.importRecord.create({
      data: {
        jobId,
        fileName: decodedFileName,
        fileSize: buffer.length,
        filePath,
        userId,
        mode: effectiveMode,
        status: 'processing',
      },
    });

    this.progressStore.append(jobId, {
      stage: 'received',
      message: isImageFile ? '已收到图片，开始识别' : '已收到 PDF，开始解析',
      meta: {
        mode: effectiveMode,
        fileType: isImageFile ? 'image' : 'pdf',
      },
    });

    if (isImageFile) {
      // 对于图片文件，直接使用图片识别模式
      return this.importFromImageFile(jobId, buffer, userId, customPrompt);
    }

    if (effectiveMode === 'vision') {
      return this.importFromPdfVision(jobId, buffer, userId, customPrompt, imageProcessingOptions);
    }

    if (effectiveMode === 'file') {
      return this.importFromPdfFile(jobId, buffer, userId, customPrompt);
    }

    return this.importFromPdfText(jobId, buffer, userId, customPrompt);
  }

  private async importFromImageFile(
    jobId: string,
    buffer: Buffer,
    userId?: string,
    customPrompt?: string
  ): Promise<void> {
    const questionIds: string[] = [];

    try {
      this.progressStore.append(jobId, {
        stage: 'processing_image',
        message: '正在分析图片尺寸...',
      });

      const imageBuffers = await this.splitImageIntoChunks(buffer);

      if (imageBuffers.length > 1) {
        this.progressStore.append(jobId, {
          stage: 'processing_image',
          message: `图片过长，已自动切分为 ${imageBuffers.length} 个片段进行识别`,
          meta: {
            totalChunks: imageBuffers.length,
          },
        });
      }

      this.progressStore.append(jobId, {
        stage: 'calling_ai',
        message: `准备开始识别，共 ${imageBuffers.length} 个片段`,
        current: 0,
        total: imageBuffers.length,
      });

      const result: ImportResult = { success: 0, failed: 0, errors: [], questionIds: [] };
      const collectedQuestions: any[] = [];
      let chunksWithErrors = 0;

      for (let i = 0; i < imageBuffers.length; i++) {
        const chunkBuffer = imageBuffers[i];

        this.progressStore.append(jobId, {
          stage: 'calling_ai',
          message: `正在识别片段 ${i + 1}/${imageBuffers.length}`,
          current: i + 1,
          total: imageBuffers.length,
        });

        // 将图片转换为base64
        const base64Image = `data:image/jpeg;base64,${chunkBuffer.toString('base64')}`;

        // Retry up to 2 times on failure
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            // 调用AI识别
            const aiResponse = await this.aiService.generateExamQuestionsFromImage(
              base64Image,
              userId,
              customPrompt
            );

            this.progressStore.append(jobId, {
              stage: 'ai_response_received',
              message: `片段 ${i + 1} 识别成功，发现 ${aiResponse.questions.length} 道题`,
              current: i + 1,
              total: imageBuffers.length,
            });

            collectedQuestions.push(...aiResponse.questions);
            lastError = null;
            break;
          } catch (error) {
            lastError = error as Error;
            console.error(
              `[Image] Chunk ${i + 1} attempt ${attempt} failed:`,
              (error as any)?.message
            );
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
        }

        if (lastError) {
          chunksWithErrors++;
          result.errors.push({
            row: i + 1,
            message: `片段 ${i + 1} 识别失败: ${lastError.message || 'Unknown'}`,
          });
        }
      }

      this.progressStore.append(jobId, {
        stage: 'merging_questions',
        message: '正在合并与去重题目',
      });

      // 合并去重
      const mergedQuestions = this.mergeAndDedupeQuestions(collectedQuestions, result);

      this.progressStore.append(jobId, {
        stage: 'saving_questions',
        message: '正在保存题目到题库',
        current: 0,
        total: mergedQuestions.length,
      });

      // 保存题目
      for (let i = 0; i < mergedQuestions.length; i++) {
        const q = mergedQuestions[i] as any;

        try {
          if (!q.content || !q.content.trim()) {
            throw new Error('题目内容不能为空');
          }

          const mappedType = this.mapQuestionType(q.type);
          const createdQuestion = await this.prisma.question.create({
            data: {
              content: q.content,
              type: mappedType as any,
              options: q.options ? JSON.stringify(q.options) : null,
              answer: serializeQuestionAnswer(q.answer ?? q.matching),
              explanation: q.explanation,
              tags: q.tags ? JSON.stringify(q.tags) : '[]',
              difficulty: q.difficulty || 1,
              status: QuestionStatus.PUBLISHED, // 导入的题目默认为发布状态
              knowledgePoint: q.knowledgePoint,
              importOrder: i + 1, // 添加导入顺序
              createdBy: userId,
              isPublic: true, // 设置为公开，以便管理员可以查看
            },
          });

          questionIds.push(createdQuestion.id);
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

      // Add chunk-level errors
      result.failed += chunksWithErrors;

      this.progressStore.append(jobId, {
        stage: 'done',
        message: '导入完成',
        result: { ...result, questionIds },
        meta: {
          questionIds,
        },
      });

      // 更新导入记录
      await this.updateImportRecord(jobId, {
        status: 'completed',
        questionIds,
      });
    } catch (error: unknown) {
      const errorMessage = (error as any)?.message || '导入失败';

      this.progressStore.append(jobId, {
        stage: 'error',
        message: errorMessage,
      });

      await this.updateImportRecord(jobId, {
        status: 'failed',
        errorMessage,
      });
    }
  }

  private async splitImageIntoChunks(buffer: Buffer): Promise<Buffer[]> {
    try {
      const metadata = await sharp(buffer).metadata();
      const height = metadata.height;
      const width = metadata.width;

      // 如果高度小于 3000，不切分
      if (!height || !width || height <= 3000) {
        return [buffer];
      }

      const CHUNK_HEIGHT = 2000;
      const OVERLAP = 400; // 重叠部分，防止题目被切断
      const chunks: Buffer[] = [];

      let top = 0;
      while (top < height) {
        let extractHeight = CHUNK_HEIGHT;
        // 确保不超出边界
        if (top + extractHeight > height) {
          extractHeight = height - top;
        }

        // 如果最后一块太小（且不是唯一一块），可以考虑合并到上一块（这里简单处理，照样切）
        // sharp extract
        const chunk = await sharp(buffer)
          .extract({
            left: 0,
            top: Math.floor(top),
            width: width,
            height: Math.floor(extractHeight),
          })
          .toBuffer();

        chunks.push(chunk);

        if (top + extractHeight >= height) {
          break;
        }

        // 移动 top
        top += CHUNK_HEIGHT - OVERLAP;
      }

      return chunks;
    } catch (error) {
      console.error('Image splitting failed:', error);
      // Fallback to original buffer
      return [buffer];
    }
  }

  private async importFromPdfVision(
    jobId: string,
    buffer: Buffer,
    userId?: string,
    customPrompt?: string,
    imageProcessingOptions?: ImageProcessingOptions
  ): Promise<void> {
    const questionIds: string[] = [];

    try {
      this.progressStore.append(jobId, {
        stage: 'converting_pdf_to_images',
        message: '正在将 PDF 转为图片',
      });

      // 构建PDF转图片选项
      const pdfOptions = {
        resolutionDpi: 300,
        enableProcessing: !!(
          imageProcessingOptions?.cropTop ||
          imageProcessingOptions?.cropBottom ||
          imageProcessingOptions?.stitchPages
        ),
        cropOptions: {
          topPercent: imageProcessingOptions?.cropTop,
          bottomPercent: imageProcessingOptions?.cropBottom,
        },
        stitchOptions: {
          spacing: 0,
        },
      };

      const images = await convertPdfToPngBuffers(buffer, pdfOptions);

      const processingMessage = pdfOptions.enableProcessing
        ? `PDF 转图并处理完成，共 ${images.length} 页${imageProcessingOptions?.stitchPages ? '（已拼接）' : ''}`
        : `PDF 转图完成，共 ${images.length} 页`;

      this.progressStore.append(jobId, {
        stage: 'converting_pdf_to_images',
        message: processingMessage,
        meta: {
          totalPages: images.length,
          processed: pdfOptions.enableProcessing,
          stitched: imageProcessingOptions?.stitchPages,
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
            const { questions } = await this.aiService.generateExamQuestionsFromImage(
              b64,
              userId,
              customPrompt
            );
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
          const createdQuestion = await this.prisma.question.create({
            data: {
              content: q.content,
              type: mappedType as any,
              options: q.options ? JSON.stringify(q.options) : null,
              answer: serializeQuestionAnswer(q.answer ?? q.matching),
              explanation: q.explanation,
              tags: q.tags ? JSON.stringify(q.tags) : '[]',
              difficulty: q.difficulty || 1,
              status: QuestionStatus.PUBLISHED, // 导入的题目默认为发布状态
              knowledgePoint: q.knowledgePoint,
              importOrder: i + 1, // 添加导入顺序 (视觉模式)
              isPublic: true, // 设置为公开，以便管理员可以查看
            },
          });
          questionIds.push(createdQuestion.id);
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
        meta: {
          questionIds,
        },
      });

      // 更新导入记录
      await this.updateImportRecord(jobId, {
        status: 'completed',
        questionIds,
      });
    } catch (error: unknown) {
      const errorMessage = (error as any)?.message || '导入失败';

      this.progressStore.append(jobId, {
        stage: 'error',
        message: errorMessage,
      });

      // 更新导入记录
      await this.updateImportRecord(jobId, {
        status: 'failed',
        errorMessage,
      });
      throw error;
    }
  }

  private async importFromPdfFile(
    jobId: string,
    _buffer: Buffer,
    userId?: string,
    customPrompt?: string
  ): Promise<void> {
    const error = new BadRequestException(
      '当前 AI 提供方/模型暂不支持直接发送 PDF 文件。请改用“图片识别（推荐）”或“文本解析”。'
    );
    this.progressStore.append(jobId, {
      stage: 'error',
      message: (error as any)?.message || '导入失败',
    });
    throw error;
  }

  private async importFromPdfText(
    jobId: string,
    buffer: Buffer,
    userId?: string,
    customPrompt?: string
  ): Promise<void> {
    const questionIds: string[] = [];
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

      const overlapChars = 300;
      const maxChunkChars = 6000;
      const minChunkChars = 1800;

      // Keep chunks smaller to reduce truncation in AI output and increase recall.
      const chunks = this.splitTextIntoChunks(normalizedText, maxChunkChars, {
        overlapChars,
        minChunkChars,
      });

      this.progressStore.append(jobId, {
        stage: 'chunked_text',
        message: `文本已分块，共 ${chunks.length} 块`,
        meta: {
          totalChunks: chunks.length,
          maxChunkChars,
          overlapChars,
          minChunkChars,
          totalTextLength: normalizedText.length,
        },
      });

      const result: ImportResult = { success: 0, failed: 0, errors: [] };

      const collectedQuestions: any[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunkPreview = chunks[i].slice(0, 80).replace(/\s+/g, ' ').trim();

        const incomplete = this.looksLikeIncompleteChunk(chunks[i]);
        const mergedNextHeadChars = incomplete && i + 1 < chunks.length ? 600 : 0;

        this.progressStore.append(jobId, {
          stage: 'calling_ai',
          message: `正在调用 AI 生成题目（${i + 1}/${chunks.length}）`,
          current: i + 1,
          total: chunks.length,
          meta: {
            chunkIndex: i + 1,
            chunkLength: chunks[i].length,
            chunkPreview,
            looksIncomplete: incomplete,
            mergedNextHeadChars,
          },
        });

        try {
          let inputChunk = chunks[i];
          // If the current chunk looks cut mid-question, prepend part of the next chunk.
          if (mergedNextHeadChars > 0) {
            inputChunk = `${inputChunk}\n${chunks[i + 1].slice(0, mergedNextHeadChars)}`;
          }

          const { questions } = await this.aiService.generateQuestionsFromText(inputChunk, {
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            userId,
            customPrompt,
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
          const createdQuestion = await this.prisma.question.create({
            data: {
              content: q.content,
              type: mappedType as any,
              options: q.options ? JSON.stringify(q.options) : null,
              answer: serializeQuestionAnswer(q.answer ?? q.matching),
              explanation: q.explanation,
              tags: q.tags ? JSON.stringify(q.tags) : '[]',
              difficulty: q.difficulty || 1,
              status: QuestionStatus.PUBLISHED, // 导入的题目默认为发布状态
              knowledgePoint: q.knowledgePoint,
              importOrder: i + 1, // 添加导入顺序 (文本模式)
              isPublic: true, // 设置为公开，以便管理员可以查看
            },
          });
          questionIds.push(createdQuestion.id);
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
        meta: {
          questionIds,
        },
      });

      // 更新导入记录
      await this.updateImportRecord(jobId, {
        status: 'completed',
        questionIds,
      });
    } catch (error: unknown) {
      const errorMessage = (error as any)?.message || '导入失败';

      this.progressStore.append(jobId, {
        stage: 'error',
        message: errorMessage,
      });

      // 更新导入记录
      await this.updateImportRecord(jobId, {
        status: 'failed',
        errorMessage,
      });
      throw error;
    }
  }

  private splitTextIntoChunks(
    text: string,
    maxChunkChars: number,
    opts?: {
      overlapChars?: number;
      minChunkChars?: number;
    }
  ): string[] {
    if (text.length <= maxChunkChars) return [text];

    const overlapChars = Math.max(0, Math.floor(opts?.overlapChars ?? 300));
    const minChunkChars = Math.max(1000, Math.floor(opts?.minChunkChars ?? 1800));

    const numbered = this.splitByQuestionNumber(text);
    const baseChunks = numbered.length > 1 ? numbered : this.splitBySeparators(text, maxChunkChars);

    // Merge blocks into chunks looking for ~maxChunkChars.
    const merged: string[] = [];
    let current = '';

    for (const block of baseChunks) {
      const next = current ? `${current}\n${block}` : block;
      if (current && next.length > maxChunkChars) {
        merged.push(current.trim());
        current = block;
        continue;
      }
      current = next;
    }

    if (current.trim()) {
      merged.push(current.trim());
    }

    if (overlapChars <= 0 || merged.length <= 1) return merged;

    // Apply overlap to reduce boundary cut risk.
    const withOverlap: string[] = [];
    for (let i = 0; i < merged.length; i++) {
      const prev = i > 0 ? merged[i - 1] : '';
      const head = prev ? prev.slice(Math.max(0, prev.length - overlapChars)) : '';
      const combined = head ? `${head}\n${merged[i]}` : merged[i];

      // Avoid very small chunks: if overlap makes it too small, keep original.
      if (combined.length < minChunkChars && merged[i].length >= minChunkChars) {
        withOverlap.push(merged[i]);
        continue;
      }

      withOverlap.push(combined);
    }

    return withOverlap;
  }

  private splitByQuestionNumber(text: string): string[] {
    const normalized = text.replace(/\r/g, '');

    // Common patterns:
    // - 1. / 1、 / 1) / 1．
    // - （1） / (1)
    // - ① ② ...
    // - 第1题 / 第 1 题
    // - 1、后面不一定有空格
    const markers = [
      /(^|\n)\s*\d{1,3}[\.．、\)]\s*/g,
      /(^|\n)\s*[（(]\d{1,3}[）)]\s*/g,
      /(^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/g,
      /(^|\n)\s*第\s*\d{1,3}\s*题\s*/g,
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
    if (starts.length < 2) {
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

  private looksLikeIncompleteChunk(text: string): boolean {
    const t = (text || '').trim();
    if (!t) return false;

    // Often indicates we cut mid-question/options.
    const tail = t.slice(Math.max(0, t.length - 200));

    // Ends with an option label or incomplete punctuation.
    if (/\b[A-D][\.|、:：]?\s*$/i.test(tail)) return true;
    if (/[（(]$/.test(tail)) return true;
    if (/[，,、:：]$/.test(tail)) return true;

    // Contains an option label near the end but no later labels.
    const optionMatches = tail.match(/\b[A-D][\.|、:：]/gi) || [];
    if (optionMatches.length === 1) return true;

    return false;
  }

  private mergeAndDedupeQuestions(questions: any[], result: ImportResult): any[] {
    const uniqueQuestions: any[] = [];

    for (const q of questions) {
      const content = String(q?.content || '').trim();
      const type = String(q?.type || '').trim();

      if (!content || !type) {
        // 记录无效题目错误
        // 注意：由于是合并阶段，row number 可能无法精确对应到 excel 行，这里用 0 或其他标识
        // 但其实不应该在这里频繁报错，除非 AI 返回垃圾数据。
        continue;
      }

      // 归一化内容以进行比较（去除所有空白字符）
      const normalizedQ = content.replace(/\s+/g, '');
      let matchIndex = -1;

      for (let i = 0; i < uniqueQuestions.length; i++) {
        const kept = uniqueQuestions[i];

        // 类型不同肯定不是同一题
        if (kept.type !== type) continue;

        const normalizedKept = String(kept.content || '').replace(/\s+/g, '');

        // 1. 完全相同
        if (normalizedQ === normalizedKept) {
          matchIndex = i;
          break;
        }

        // 2. 包含关系检测（解决切片导致的残缺题目问题）
        // 只有当文本足够长时才检测，避免短文本误判
        if (normalizedQ.length > 10 && normalizedKept.length > 10) {
          // 如果新题目包含已有题目，说明新题目更完整（已有题目可能是残缺的）
          if (normalizedQ.includes(normalizedKept)) {
            matchIndex = i;
            break;
          }
          // 如果已有题目包含新题目，说明已有题目更完整（新题目可能是残缺的）
          if (normalizedKept.includes(normalizedQ)) {
            matchIndex = i;
            break;
          }
        }
      }

      if (matchIndex !== -1) {
        // 发现重复
        const kept = uniqueQuestions[matchIndex];
        const normalizedKept = String(kept.content || '').replace(/\s+/g, '');

        // 如果新题目内容更长（信息更多），则替换旧题目
        // 这通常发生在：Chunk 1 识别了残缺的后半段（短），Chunk 2 识别了完整的全段（长）
        // 或者反之。保留最长的那个。
        if (normalizedQ.length > normalizedKept.length) {
          uniqueQuestions[matchIndex] = { ...q, content, type };
        }
      } else {
        // 未发现重复，添加新题目
        uniqueQuestions.push({ ...q, content, type });
      }
    }

    return uniqueQuestions;
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
      连线题: QuestionType.MATCHING,
      连线: QuestionType.MATCHING,
      matching: QuestionType.MATCHING,
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
    const serializedAnswer = serializeQuestionAnswer(answer);

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
      连线题: QuestionType.MATCHING,
      matching: QuestionType.MATCHING,
      MATCHING: QuestionType.MATCHING,
      简答题: QuestionType.ESSAY,
      essay: QuestionType.ESSAY,
      ESSAY: QuestionType.ESSAY,
    };

    const type = typeMap[typeStr.toLowerCase()] || QuestionType.SINGLE_CHOICE;

    const dto: CreateQuestionDto = {
      content,
      type,
      answer: serializedAnswer,
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

  getProgress(jobId: string) {
    return this.progressStore.getEventsSince(jobId);
  }

  async createExamFromImport(
    jobId: string,
    questionIds: string[],
    examTitle: string,
    duration: number = 60
  ): Promise<string> {
    // 创建考试
    const exam = await this.prisma.exam.create({
      data: {
        title: examTitle,
        description: `从PDF导入生成的考试 (导入任务: ${jobId})`,
        duration,
        totalScore: questionIds.length * 5, // 每题5分
        status: 'DRAFT',
      },
    });

    // 添加题目到考试
    for (let i = 0; i < questionIds.length; i++) {
      await this.prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questionIds[i],
          order: i + 1,
          score: 5,
        },
      });
    }

    return exam.id;
  }

  private async savePdfFile(buffer: Buffer, fileName: string): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    await fs.mkdir(uploadsDir, { recursive: true });

    const filePath = path.join(uploadsDir, fileName);
    await fs.writeFile(filePath, buffer);

    return filePath;
  }

  private async updateImportRecord(
    jobId: string,
    updates: { status?: string; questionIds?: string[]; errorMessage?: string }
  ) {
    const data: any = {};

    if (updates.status) data.status = updates.status;
    if (updates.questionIds) data.questionIds = JSON.stringify(updates.questionIds);
    if (updates.errorMessage) data.errorMessage = updates.errorMessage;
    if (updates.status === 'completed') data.completedAt = new Date();

    await this.prisma.importRecord.update({
      where: { jobId },
      data,
    });
  }

  private parseQuestionIds(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean) as string[];
    if (typeof raw !== 'string') return [];

    const trimmed = raw.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean) as string[];
      }
      if (typeof parsed === 'string') {
        return parsed ? [parsed] : [];
      }
      return [];
    } catch {
      // Handle legacy data where a single ID was stored directly.
      return trimmed
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
    }
  }

  async createExamFromImportRecord(
    jobId: string,
    examTitle: string,
    duration: number,
    userId?: string
  ) {
    // 获取导入记录
    const record = await this.getImportRecord(jobId, userId);

    if (record.status !== 'completed') {
      throw new BadRequestException('Import is not completed yet');
    }

    const questionIds = this.parseQuestionIds(record.questionIds);

    if (questionIds.length === 0) {
      throw new BadRequestException('No questions found in this import record');
    }

    // 验证题目是否存在
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      orderBy: [{ importOrder: 'asc' }, { createdAt: 'asc' }],
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('Some questions from the import record are missing');
    }

    // 创建考试
    const exam = await this.prisma.exam.create({
      data: {
        title: examTitle,
        duration,
        status: 'DRAFT',
        createdBy: userId,
      },
    });

    // 添加题目到考试，保持导入顺序
    for (let i = 0; i < questions.length; i++) {
      await this.prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questions[i].id,
          order: i + 1,
          score: 1, // 默认分数
        },
      });
    }

    return {
      examId: exam.id,
      message: `Successfully created exam "${examTitle}" with ${questions.length} questions`,
      questionCount: questions.length,
    };
  }

  async getImportHistory(userId?: string) {
    const where = userId ? { userId } : {};

    const records = await this.prisma.importRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobId: true,
        fileName: true,
        fileSize: true,
        mode: true,
        status: true,
        createdAt: true,
        completedAt: true,
        questionIds: true,
        errorMessage: true,
      },
    });

    // 为每个记录添加题目数量信息
    return records.map((record) => {
      const questionIds = this.parseQuestionIds(record.questionIds);
      return {
        ...record,
        questionCount: questionIds.length,
        canCreateExam: record.status === 'completed' && questionIds.length > 0,
      };
    });
  }

  async getImportRecord(jobId: string, userId?: string) {
    const where: any = { jobId };
    if (userId) where.userId = userId;

    const record = await this.prisma.importRecord.findFirst({
      where,
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    if (!record) {
      throw new BadRequestException('Import record not found');
    }

    // 解析questionIds
    const questionIds = this.parseQuestionIds(record.questionIds);

    // 获取关联的题目信息
    const questions =
      questionIds.length > 0
        ? await this.prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: {
              id: true,
              content: true,
              type: true,
              status: true,
              createdAt: true,
            },
          })
        : [];

    return {
      ...record,
      questionIds,
      questions,
    };
  }

  async getPdfImages(jobId: string, userId?: string) {
    const record = await this.getImportRecord(jobId, userId);

    if (!record.filePath) {
      throw new BadRequestException('File not found');
    }

    try {
      const fileBuffer = await fs.readFile(record.filePath);

      // 检查文件类型
      const isImageFile = /\.(jpg|jpeg|png|gif|webp)$/i.test(record.fileName);

      if (isImageFile) {
        // 对于图片文件，直接返回base64编码
        const mimeType = record.fileName.toLowerCase().endsWith('.png')
          ? 'image/png'
          : record.fileName.toLowerCase().endsWith('.jpg') ||
              record.fileName.toLowerCase().endsWith('.jpeg')
            ? 'image/jpeg'
            : record.fileName.toLowerCase().endsWith('.gif')
              ? 'image/gif'
              : record.fileName.toLowerCase().endsWith('.webp')
                ? 'image/webp'
                : 'image/png';

        return {
          images: [
            {
              index: 0,
              data: `data:${mimeType};base64,${fileBuffer.toString('base64')}`,
            },
          ],
        };
      } else {
        // 对于PDF文件，转换为图片
        const images = await convertPdfToPngBuffers(fileBuffer, { resolutionDpi: 150 });

        return {
          images: images.map((buffer, index) => ({
            index,
            data: `data:image/png;base64,${buffer.toString('base64')}`,
          })),
        };
      }
    } catch (error) {
      throw new BadRequestException('Failed to process file');
    }
  }

  async importFromJson(questions: any[], userId?: string): Promise<ImportResult> {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new BadRequestException('JSON数据必须是一个非空数组');
    }

    // 生成唯一的作业ID
    const jobId = `json_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建导入记录
    await this.prisma.importRecord.create({
      data: {
        jobId,
        fileName: 'JSON导入',
        fileSize: JSON.stringify(questions).length, // JSON字符串的长度作为文件大小
        userId,
        mode: 'json',
        status: 'processing',
      },
    });

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      questionIds: [],
    };

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      const rowNum = i + 1;

      try {
        // 验证必需字段
        if (!question.stem) {
          throw new BadRequestException('题目内容（stem）是必需的');
        }

        // 映射题型
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
          连线题: QuestionType.MATCHING,
          matching: QuestionType.MATCHING,
          MATCHING: QuestionType.MATCHING,
          简答题: QuestionType.ESSAY,
          essay: QuestionType.ESSAY,
          ESSAY: QuestionType.ESSAY,
        };

        const type = typeMap[question.type] || QuestionType.SINGLE_CHOICE;

        // 处理选项
        let options = null;
        if (question.options && Array.isArray(question.options) && question.options.length > 0) {
          options = question.options.map((opt: string, idx: number) => ({
            label: String.fromCharCode(65 + idx),
            content: opt,
          }));
        }

        // 处理答案
        let answer = question.answer;
        if (type === QuestionType.TRUE_FALSE && typeof question.answer === 'boolean') {
          answer = question.answer ? '正确' : '错误';
        }

        // 创建题目
        const createdQuestion = await this.prisma.question.create({
          data: {
            content: question.stem,
            type: type as any,
            options: options ? JSON.stringify(options) : null,
            answer: serializeQuestionAnswer(answer ?? question.matching),
            explanation: question.explanation || '',
            tags: question.tags ? JSON.stringify(question.tags) : '[]',
            difficulty: question.difficulty || 1,
            status: QuestionStatus.PUBLISHED, // 导入的题目默认为发布状态
            knowledgePoint: question.knowledgePoint || '',
            importOrder: i + 1, // 添加导入顺序
            createdBy: userId, // 关联到当前用户
            isPublic: true, // 设置为公开，以便管理员可以查看
          },
        });

        result.success++;
        result.questionIds!.push(createdQuestion.id);
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: (error as any).message || '未知错误',
        });
      }
    }

    // 更新导入记录状态
    await this.prisma.importRecord.update({
      where: { jobId },
      data: {
        status: 'completed',
        questionIds: JSON.stringify(result.questionIds),
        completedAt: new Date(),
      },
    });

    return result;
  }

  async getQuestionImportRecord(questionId: string, userId?: string) {
    // Find import records that contain this question ID
    const records = await this.prisma.importRecord.findMany({
      where: {
        questionIds: {
          contains: questionId,
        },
        ...(userId && { userId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, username: true },
        },
      },
    });

    // Filter records to ensure the question ID is actually in the array
    const filteredRecords = records.filter((record) => {
      try {
        const questionIds = this.parseQuestionIds(record.questionIds);

        return questionIds.includes(questionId);
      } catch {
        return false;
      }
    });

    return filteredRecords.map((record) => ({
      ...record,
      questionIds: JSON.parse(record.questionIds || '[]'),
    }));
  }

  async getImportJobQuestions(
    jobId: string,
    userId: string | undefined,
    page: number = 1,
    limit: number = 10
  ) {
    // We fetch the record directly to avoid the overhead of fetching all questions found in getImportRecord
    const where: any = { jobId };
    if (userId) where.userId = userId;

    const record = await this.prisma.importRecord.findFirst({
      where,
      select: { questionIds: true },
    });

    if (!record) {
      throw new BadRequestException('Import record not found');
    }

    const allQuestionIds = this.parseQuestionIds(record.questionIds);
    const total = allQuestionIds.length;

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const slicedIds = allQuestionIds.slice(startIndex, endIndex);

    if (slicedIds.length === 0) {
      return {
        data: [],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Fetch the specific questions for this page
    const questions = await this.prisma.question.findMany({
      where: { id: { in: slicedIds } },
      orderBy: { importOrder: 'asc' },
    });

    // Sort questions to match the order in slicedIds (which preserves the original import order if IDs are ordered)
    // or rely on importOrder if that's reliable. importOrder is best.
    // However, if we just want to ensure they match the slice, we can re-sort in JS if needed,
    // but DB order by importOrder is usually sufficient and cleaner.

    // Parse tags from JSON string to array
    const parsedQuestions = questions.map((q) => ({
      ...q,
      tags: q.tags ? JSON.parse(q.tags) : [],
    }));

    return {
      data: parsedQuestions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
