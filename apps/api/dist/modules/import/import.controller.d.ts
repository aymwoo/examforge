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
    importPdf(file: Express.Multer.File, mode?: string): Promise<{
        jobId: string;
    }>;
    pdfImportProgress(res: Response, jobId: string, since?: string): Promise<void>;
}
