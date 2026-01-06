import { ImportService } from './import.service';
export declare class ImportController {
    private readonly importService;
    constructor(importService: ImportService);
    importExcel(file: Express.Multer.File): Promise<import("./import.service").ImportResult>;
}
