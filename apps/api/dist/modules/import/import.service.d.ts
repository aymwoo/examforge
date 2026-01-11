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
    importFromPdf(jobId: string, buffer: Buffer, mode?: string, userId?: string, customPrompt?: string, fileName?: string): Promise<void>;
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
    private savePdfFile;
    private updateImportRecord;
    getImportHistory(userId?: string): Promise<{
        id: string;
        jobId: string;
        fileName: string;
        fileSize: number;
        mode: string;
        status: string;
        questionIds: string;
        errorMessage: string;
        createdAt: Date;
        completedAt: Date;
    }[]>;
    getImportRecord(jobId: string, userId?: string): Promise<{
        questionIds: any;
        questions: {
            id: string;
            status: string;
            createdAt: Date;
            content: string;
            type: string;
        }[];
        user: {
            id: string;
            name: string;
            username: string;
        };
        id: string;
        jobId: string;
        fileName: string;
        fileSize: number;
        filePath: string | null;
        userId: string | null;
        mode: string;
        status: string;
        errorMessage: string | null;
        createdAt: Date;
        completedAt: Date | null;
    }>;
}
