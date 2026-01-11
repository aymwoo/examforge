"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportService = void 0;
const common_1 = require("@nestjs/common");
const XLSX = __importStar(require("xlsx"));
const prisma_service_1 = require("../../prisma/prisma.service");
const question_enum_1 = require("../../common/enums/question.enum");
const ai_service_1 = require("../ai/ai.service");
const settings_service_1 = require("../settings/settings.service");
const pdf_text_1 = require("../../common/utils/pdf-text");
const question_answer_1 = require("../../common/utils/question-answer");
const pdf_to_images_1 = require("../../common/utils/pdf-to-images");
const import_progress_store_1 = require("./import-progress.store");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
let ImportService = class ImportService {
    prisma;
    aiService;
    progressStore;
    settingsService;
    constructor(prisma, aiService, progressStore, settingsService) {
        this.prisma = prisma;
        this.aiService = aiService;
        this.progressStore = progressStore;
        this.settingsService = settingsService;
    }
    get question() {
        return this.prisma.question;
    }
    async importFromExcel(buffer) {
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        if (data.length === 0) {
            throw new common_1.BadRequestException('No data found in Excel file');
        }
        const result = {
            success: 0,
            failed: 0,
            errors: [],
            questionIds: [],
        };
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const rowNum = i + 2;
            try {
                const dto = this.mapRowToDto(row);
                const question = await this.prisma.question.create({
                    data: {
                        content: dto.content,
                        type: dto.type,
                        options: dto.options ? JSON.stringify(dto.options) : null,
                        answer: (0, question_answer_1.serializeQuestionAnswer)(dto.answer),
                        explanation: dto.explanation,
                        tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
                        difficulty: dto.difficulty || 1,
                        status: question_enum_1.QuestionStatus.DRAFT,
                        knowledgePoint: dto.knowledgePoint,
                    },
                });
                result.success++;
                result.questionIds.push(question.id);
            }
            catch (error) {
                result.failed++;
                result.errors.push({
                    row: rowNum,
                    message: error.message || 'Unknown error',
                });
            }
        }
        return result;
    }
    async importFromPdf(jobId, buffer, mode, userId, customPrompt, fileName) {
        const resolvedMode = (mode || '').toLowerCase().trim();
        const settings = userId
            ? await this.settingsService.getUserSettings(userId)
            : await this.settingsService.getSettings();
        const effectiveMode = resolvedMode || (settings.aiProvider === 'qwen' ? 'vision' : 'text');
        const filePath = await this.savePdfFile(buffer, fileName || `${jobId}.pdf`);
        await this.prisma.importRecord.create({
            data: {
                jobId,
                fileName: fileName || `${jobId}.pdf`,
                fileSize: buffer.length,
                filePath,
                userId,
                mode: effectiveMode,
                status: 'processing',
            },
        });
        this.progressStore.append(jobId, {
            stage: 'received',
            message: '已收到 PDF，开始解析',
            meta: {
                mode: effectiveMode,
            },
        });
        if (effectiveMode === 'vision') {
            return this.importFromPdfVision(jobId, buffer, userId, customPrompt);
        }
        if (effectiveMode === 'file') {
            return this.importFromPdfFile(jobId, buffer, userId, customPrompt);
        }
        return this.importFromPdfText(jobId, buffer, userId, customPrompt);
    }
    async importFromPdfVision(jobId, buffer, userId, customPrompt) {
        const questionIds = [];
        try {
            this.progressStore.append(jobId, {
                stage: 'converting_pdf_to_images',
                message: '正在将 PDF 转为图片',
            });
            const images = await (0, pdf_to_images_1.convertPdfToPngBuffers)(buffer, { resolutionDpi: 300 });
            this.progressStore.append(jobId, {
                stage: 'converting_pdf_to_images',
                message: `PDF 转图完成，共 ${images.length} 页`,
                meta: {
                    totalPages: images.length,
                },
            });
            const result = { success: 0, failed: 0, errors: [] };
            const collectedQuestions = [];
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
                let lastError = null;
                for (let attempt = 1; attempt <= 2; attempt++) {
                    try {
                        const { questions } = await this.aiService.generateExamQuestionsFromImage(b64, userId, customPrompt);
                        this.progressStore.append(jobId, {
                            stage: 'ai_response_received',
                            message: `AI 返回 ${questions.length} 道题（第 ${pageIndex + 1}/${images.length} 页）`,
                            current: pageIndex + 1,
                            total: images.length,
                        });
                        collectedQuestions.push(...questions);
                        lastError = null;
                        break;
                    }
                    catch (error) {
                        lastError = error;
                        console.error(`[Vision] Page ${pageIndex + 1} attempt ${attempt} failed:`, error?.message);
                        if (attempt < 2) {
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
                const q = mergedQuestions[i];
                try {
                    const mappedType = this.mapQuestionType(q.type);
                    const createdQuestion = await this.prisma.question.create({
                        data: {
                            content: q.content,
                            type: mappedType,
                            options: q.options ? JSON.stringify(q.options) : null,
                            answer: (0, question_answer_1.serializeQuestionAnswer)(q.answer),
                            explanation: q.explanation,
                            tags: q.tags ? JSON.stringify(q.tags) : '[]',
                            difficulty: q.difficulty || 1,
                            status: question_enum_1.QuestionStatus.DRAFT,
                            knowledgePoint: q.knowledgePoint,
                        },
                    });
                    questionIds.push(createdQuestion.id);
                    result.success++;
                }
                catch (error) {
                    result.failed++;
                    result.errors.push({
                        row: i + 1,
                        message: error.message || 'Unknown error',
                    });
                }
                this.progressStore.append(jobId, {
                    stage: 'saving_questions',
                    message: '正在保存题目到题库',
                    current: i + 1,
                    total: mergedQuestions.length,
                });
            }
            result.failed += pagesWithErrors;
            this.progressStore.append(jobId, {
                stage: 'done',
                message: '导入完成',
                result,
                meta: {
                    questionIds,
                },
            });
            await this.updateImportRecord(jobId, {
                status: 'completed',
                questionIds,
            });
        }
        catch (error) {
            const errorMessage = error?.message || '导入失败';
            this.progressStore.append(jobId, {
                stage: 'error',
                message: errorMessage,
            });
            await this.updateImportRecord(jobId, {
                status: 'failed',
                errorMessage,
            });
            throw error;
        }
    }
    async importFromPdfFile(jobId, _buffer, userId, customPrompt) {
        const error = new common_1.BadRequestException('当前 AI 提供方/模型暂不支持直接发送 PDF 文件。请改用“图片识别（推荐）”或“文本解析”。');
        this.progressStore.append(jobId, {
            stage: 'error',
            message: error?.message || '导入失败',
        });
        throw error;
    }
    async importFromPdfText(jobId, buffer, userId, customPrompt) {
        const questionIds = [];
        try {
            this.progressStore.append(jobId, {
                stage: 'extracting_text',
                message: '正在提取 PDF 文本',
            });
            const text = await (0, pdf_text_1.extractTextFromPdf)(buffer);
            const normalizedText = text
                .replace(/\r/g, '')
                .replace(/\n+/g, '\n')
                .replace(/[ \t]+/g, ' ')
                .trim();
            if (!normalizedText) {
                throw new common_1.BadRequestException('PDF 文本为空，无法导入');
            }
            const overlapChars = 300;
            const maxChunkChars = 6000;
            const minChunkChars = 1800;
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
            const result = { success: 0, failed: 0, errors: [] };
            const collectedQuestions = [];
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
                }
                catch (error) {
                    result.failed++;
                    result.errors.push({
                        row: i + 1,
                        message: error.message || 'AI 处理失败',
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
                const q = mergedQuestions[i];
                const rowNum = i + 1;
                try {
                    const mappedType = this.mapQuestionType(q.type);
                    const createdQuestion = await this.prisma.question.create({
                        data: {
                            content: q.content,
                            type: mappedType,
                            options: q.options ? JSON.stringify(q.options) : null,
                            answer: (0, question_answer_1.serializeQuestionAnswer)(q.answer),
                            explanation: q.explanation,
                            tags: q.tags ? JSON.stringify(q.tags) : '[]',
                            difficulty: q.difficulty || 1,
                            status: question_enum_1.QuestionStatus.DRAFT,
                            knowledgePoint: q.knowledgePoint,
                        },
                    });
                    questionIds.push(createdQuestion.id);
                    result.success++;
                }
                catch (error) {
                    result.failed++;
                    result.errors.push({
                        row: rowNum,
                        message: error.message || 'Unknown error',
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
            await this.updateImportRecord(jobId, {
                status: 'completed',
                questionIds,
            });
        }
        catch (error) {
            const errorMessage = error?.message || '导入失败';
            this.progressStore.append(jobId, {
                stage: 'error',
                message: errorMessage,
            });
            await this.updateImportRecord(jobId, {
                status: 'failed',
                errorMessage,
            });
            throw error;
        }
    }
    splitTextIntoChunks(text, maxChunkChars, opts) {
        if (text.length <= maxChunkChars)
            return [text];
        const overlapChars = Math.max(0, Math.floor(opts?.overlapChars ?? 300));
        const minChunkChars = Math.max(1000, Math.floor(opts?.minChunkChars ?? 1800));
        const numbered = this.splitByQuestionNumber(text);
        const baseChunks = numbered.length > 1 ? numbered : this.splitBySeparators(text, maxChunkChars);
        const merged = [];
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
        if (overlapChars <= 0 || merged.length <= 1)
            return merged;
        const withOverlap = [];
        for (let i = 0; i < merged.length; i++) {
            const prev = i > 0 ? merged[i - 1] : '';
            const head = prev ? prev.slice(Math.max(0, prev.length - overlapChars)) : '';
            const combined = head ? `${head}\n${merged[i]}` : merged[i];
            if (combined.length < minChunkChars && merged[i].length >= minChunkChars) {
                withOverlap.push(merged[i]);
                continue;
            }
            withOverlap.push(combined);
        }
        return withOverlap;
    }
    splitByQuestionNumber(text) {
        const normalized = text.replace(/\r/g, '');
        const markers = [
            /(^|\n)\s*\d{1,3}[\.．、\)]\s*/g,
            /(^|\n)\s*[（(]\d{1,3}[）)]\s*/g,
            /(^|\n)\s*[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*/g,
            /(^|\n)\s*第\s*\d{1,3}\s*题\s*/g,
        ];
        const candidates = [];
        for (const re of markers) {
            re.lastIndex = 0;
            let match = null;
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
        if (starts.length < 2) {
            return [text];
        }
        const blocks = [];
        for (let i = 0; i < starts.length; i++) {
            const start = starts[i];
            const end = i + 1 < starts.length ? starts[i + 1] : normalized.length;
            const block = normalized.slice(start, end).trim();
            if (block)
                blocks.push(block);
        }
        return blocks.length > 0 ? blocks : [text];
    }
    splitBySeparators(text, maxChunkChars) {
        const separators = ['\n\n', '\n', '。', '.', ';'];
        const chunks = [];
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
            if (chunk)
                chunks.push(chunk);
            remaining = remaining.slice(cutIndex).trim();
        }
        if (remaining)
            chunks.push(remaining);
        return chunks;
    }
    looksLikeIncompleteChunk(text) {
        const t = (text || '').trim();
        if (!t)
            return false;
        const tail = t.slice(Math.max(0, t.length - 200));
        if (/\b[A-D][\.|、:：]?\s*$/i.test(tail))
            return true;
        if (/[（(]$/.test(tail))
            return true;
        if (/[，,、:：]$/.test(tail))
            return true;
        const optionMatches = tail.match(/\b[A-D][\.|、:：]/gi) || [];
        if (optionMatches.length === 1)
            return true;
        return false;
    }
    mergeAndDedupeQuestions(questions, result) {
        const map = new Map();
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
    mapQuestionType(typeStr) {
        const normalized = String(typeStr || '')
            .trim()
            .toLowerCase();
        const typeMap = {
            单选题: question_enum_1.QuestionType.SINGLE_CHOICE,
            单选: question_enum_1.QuestionType.SINGLE_CHOICE,
            single: question_enum_1.QuestionType.SINGLE_CHOICE,
            single_choice: question_enum_1.QuestionType.SINGLE_CHOICE,
            singlechoice: question_enum_1.QuestionType.SINGLE_CHOICE,
            多选题: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            多选: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple_choice: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiplechoice: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            判断题: question_enum_1.QuestionType.TRUE_FALSE,
            判断: question_enum_1.QuestionType.TRUE_FALSE,
            true_false: question_enum_1.QuestionType.TRUE_FALSE,
            truefalse: question_enum_1.QuestionType.TRUE_FALSE,
            填空题: question_enum_1.QuestionType.FILL_BLANK,
            填空: question_enum_1.QuestionType.FILL_BLANK,
            fill_blank: question_enum_1.QuestionType.FILL_BLANK,
            fillblank: question_enum_1.QuestionType.FILL_BLANK,
            简答题: question_enum_1.QuestionType.ESSAY,
            简答: question_enum_1.QuestionType.ESSAY,
            问答题: question_enum_1.QuestionType.ESSAY,
            essay: question_enum_1.QuestionType.ESSAY,
            实践应用题: question_enum_1.QuestionType.ESSAY,
            应用题: question_enum_1.QuestionType.ESSAY,
        };
        return typeMap[normalized] || question_enum_1.QuestionType.SINGLE_CHOICE;
    }
    mapRowToDto(row) {
        const content = row['题干'] || row['content'] || row['Content'] || '';
        const typeStr = row['题型'] || row['type'] || row['Type'] || 'SINGLE_CHOICE';
        const answer = row['答案'] || row['answer'] || row['Answer'] || '';
        const serializedAnswer = (0, question_answer_1.serializeQuestionAnswer)(answer);
        if (!content) {
            throw new common_1.BadRequestException('题干不能为空，请确保 Excel 包含"题干"列');
        }
        const typeMap = {
            单选题: question_enum_1.QuestionType.SINGLE_CHOICE,
            single: question_enum_1.QuestionType.SINGLE_CHOICE,
            single_choice: question_enum_1.QuestionType.SINGLE_CHOICE,
            SINGLE_CHOICE: question_enum_1.QuestionType.SINGLE_CHOICE,
            多选题: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            multiple_choice: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            MULTIPLE_CHOICE: question_enum_1.QuestionType.MULTIPLE_CHOICE,
            判断题: question_enum_1.QuestionType.TRUE_FALSE,
            true_false: question_enum_1.QuestionType.TRUE_FALSE,
            TRUE_FALSE: question_enum_1.QuestionType.TRUE_FALSE,
            填空题: question_enum_1.QuestionType.FILL_BLANK,
            fill_blank: question_enum_1.QuestionType.FILL_BLANK,
            FILL_BLANK: question_enum_1.QuestionType.FILL_BLANK,
            简答题: question_enum_1.QuestionType.ESSAY,
            essay: question_enum_1.QuestionType.ESSAY,
            ESSAY: question_enum_1.QuestionType.ESSAY,
        };
        const type = typeMap[typeStr.toLowerCase()] || question_enum_1.QuestionType.SINGLE_CHOICE;
        const dto = {
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
                    .map((t) => t.trim());
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
    parseOptions(optionsStr) {
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
    getProgress(jobId) {
        return this.progressStore.getEventsSince(jobId);
    }
    async createExamFromImport(jobId, questionIds, examTitle, duration = 60) {
        const exam = await this.prisma.exam.create({
            data: {
                title: examTitle,
                description: `从PDF导入生成的考试 (导入任务: ${jobId})`,
                duration,
                totalScore: questionIds.length * 5,
                status: 'DRAFT',
            },
        });
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
    async savePdfFile(buffer, fileName) {
        const uploadsDir = path.join(process.cwd(), 'uploads', 'pdfs');
        await fs.mkdir(uploadsDir, { recursive: true });
        const filePath = path.join(uploadsDir, fileName);
        await fs.writeFile(filePath, buffer);
        return filePath;
    }
    async updateImportRecord(jobId, updates) {
        const data = {};
        if (updates.status)
            data.status = updates.status;
        if (updates.questionIds)
            data.questionIds = JSON.stringify(updates.questionIds);
        if (updates.errorMessage)
            data.errorMessage = updates.errorMessage;
        if (updates.status === 'completed')
            data.completedAt = new Date();
        await this.prisma.importRecord.update({
            where: { jobId },
            data,
        });
    }
    async getImportHistory(userId) {
        const where = userId ? { userId } : {};
        return this.prisma.importRecord.findMany({
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
    }
    async getImportRecord(jobId, userId) {
        const where = { jobId };
        if (userId)
            where.userId = userId;
        const record = await this.prisma.importRecord.findFirst({
            where,
            include: {
                user: {
                    select: { id: true, name: true, username: true },
                },
            },
        });
        if (!record) {
            throw new common_1.BadRequestException('Import record not found');
        }
        const questionIds = JSON.parse(record.questionIds || '[]');
        const questions = questionIds.length > 0 ? await this.prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: {
                id: true,
                content: true,
                type: true,
                status: true,
                createdAt: true,
            },
        }) : [];
        return {
            ...record,
            questionIds,
            questions,
        };
    }
    async getPdfImages(jobId, userId) {
        const record = await this.getImportRecord(jobId, userId);
        if (!record.filePath) {
            throw new common_1.BadRequestException('PDF file not found');
        }
        try {
            const images = await (0, pdf_to_images_1.convertPdfToPngBuffers)(await fs.readFile(record.filePath), { resolutionDpi: 150 });
            return {
                images: images.map((buffer, index) => ({
                    index,
                    data: `data:image/png;base64,${buffer.toString('base64')}`,
                })),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to convert PDF to images');
        }
    }
};
exports.ImportService = ImportService;
exports.ImportService = ImportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        ai_service_1.AIService,
        import_progress_store_1.ImportProgressStore,
        settings_service_1.SettingsService])
], ImportService);
//# sourceMappingURL=import.service.js.map