import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QuestionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get question();
    create(dto: CreateQuestionDto, userId?: string): Promise<{
        type: string;
        content: string;
        options: string | null;
        answer: string | null;
        explanation: string | null;
        illustration: string | null;
        images: string | null;
        tags: string;
        difficulty: number;
        knowledgePoint: string | null;
        isPublic: boolean;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string | null;
    }>;
    findAll(paginationDto: PaginationDto, userId?: string, userRole?: string): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string, userId?: string, userRole?: string): Promise<any>;
    update(id: string, dto: UpdateQuestionDto, userId?: string, userRole?: string): Promise<any>;
    delete(id: string, userId?: string, userRole?: string): Promise<void>;
    deleteMany(ids: string[]): Promise<{
        deleted: number;
    }>;
    clearAll(): Promise<{
        deleted: number;
    }>;
    private safeParseImages;
    addImage(questionId: string, imageBuffer: Buffer, originalName: string, userId: string): Promise<{
        imagePath: string;
    }>;
    removeImage(questionId: string, imageIndex: number, userId: string): Promise<{
        success: boolean;
    }>;
    addClipboardImage(questionId: string, imageData: string, userId: string): Promise<{
        imagePath: string;
    }>;
    private transformQuestion;
}
