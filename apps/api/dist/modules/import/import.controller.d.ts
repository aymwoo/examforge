import type { Response } from 'express';
import { ImportProgressStore } from './import-progress.store';
import { ImportService } from './import.service';
export declare class ImportController {
    private readonly importService;
    private readonly progressStore;
    constructor(importService: ImportService, progressStore: ImportProgressStore);
    createExamFromPdf(body: {
        jobId: string;
        examTitle: string;
        duration?: number;
    }): Promise<{
        examId: string;
        message: string;
    }>;
    importExcel(file: Express.Multer.File): Promise<import("./import.service").ImportResult>;
    importPdf(file: Express.Multer.File, mode?: string, prompt?: string, req?: any): Promise<{
        jobId: string;
    }>;
    pdfImportProgress(res: Response, jobId: string, since?: string): Promise<void>;
    getImportHistory(req: any): Promise<{
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
    getImportRecord(jobId: string, req: any): Promise<{
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
    getPdfImages(jobId: string, req: any): Promise<{
        images: {
            index: number;
            data: string;
        }[];
    }>;
    getQuestionImportRecord(questionId: string, req: any): Promise<{
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
