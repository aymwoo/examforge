import { PrismaService } from '../../prisma/prisma.service';
export interface ImportResult {
    success: number;
    failed: number;
    errors: {
        row: number;
        message: string;
    }[];
}
export declare class ImportService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get question();
    importFromExcel(buffer: Buffer): Promise<ImportResult>;
    private mapRowToDto;
    private parseOptions;
}
