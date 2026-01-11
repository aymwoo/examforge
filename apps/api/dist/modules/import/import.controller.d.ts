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
    getImportRecord(jobId: string, req: any): Promise<{
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
    getPdfImages(jobId: string, req: any): Promise<{
        images: {
            index: number;
            data: string;
        }[];
    }>;
}
