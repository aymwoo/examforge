import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { ImportProgressStore } from './import-progress.store';
export interface ImportResult {
    success: number;
    failed: number;
    errors: {
        row: number;
        message: string;
    }[];
}
export interface PdfImportResponse {
    jobId: string;
}
export declare class ImportService {
    private readonly prisma;
    private readonly aiService;
    private readonly progressStore;
    private readonly settingsService;
    constructor(prisma: PrismaService, aiService: AIService, progressStore: ImportProgressStore, settingsService: SettingsService);
    private get question();
    importFromExcel(buffer: Buffer): Promise<ImportResult>;
    importFromPdf(jobId: string, buffer: Buffer, mode?: string): Promise<void>;
    private importFromPdfVision;
    private importFromPdfFile;
    private importFromPdfText;
    private splitTextIntoChunks;
    private splitByQuestionNumber;
    private splitBySeparators;
    private looksLikeIncompleteChunk;
    private mergeAndDedupeQuestions;
    private mapQuestionType;
    private mapRowToDto;
    private parseOptions;
    getProgress(jobId: string): import("./import-progress.store").PdfImportProgressEvent[];
    createExamFromImport(jobId: string, questionIds: string[], examTitle: string, duration?: number): Promise<string>;
}
