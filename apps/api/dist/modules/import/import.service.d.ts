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
    questionIds?: string[];
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
    private importFromImageFile;
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
        status: string;
        id: string;
        createdAt: Date;
        questionIds: string;
        jobId: string;
        fileName: string;
        fileSize: number;
        mode: string;
        errorMessage: string;
        completedAt: Date;
    }[]>;
    getImportRecord(jobId: string, userId?: string): Promise<{
        questionIds: any;
        questions: {
            type: string;
            content: string;
            status: string;
            id: string;
            createdAt: Date;
        }[];
        user: {
            id: string;
            name: string;
            username: string;
        };
        status: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        jobId: string;
        fileName: string;
        fileSize: number;
        filePath: string | null;
        mode: string;
        errorMessage: string | null;
        completedAt: Date | null;
    }>;
    getPdfImages(jobId: string, userId?: string): Promise<{
        images: {
            index: number;
            data: string;
        }[];
    }>;
    getQuestionImportRecord(questionId: string, userId?: string): Promise<{
        questionIds: any;
        user: {
            id: string;
            name: string;
            username: string;
        };
        status: string;
        id: string;
        createdAt: Date;
        userId: string | null;
        jobId: string;
        fileName: string;
        fileSize: number;
        filePath: string | null;
        mode: string;
        errorMessage: string | null;
        completedAt: Date | null;
    }[]>;
}
