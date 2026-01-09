import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QuestionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get question();
    create(dto: CreateQuestionDto, userId?: string): Promise<{
        id: string;
        content: string;
        type: string;
        options: string | null;
        answer: string | null;
        explanation: string | null;
        tags: string;
        difficulty: number;
        status: string;
        knowledgePoint: string | null;
        isPublic: boolean;
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
    private transformQuestion;
}
