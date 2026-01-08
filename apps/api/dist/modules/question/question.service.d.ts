import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QuestionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private get question();
    create(dto: CreateQuestionDto): Promise<{
        type: string;
        content: string;
        options: string | null;
        answer: string | null;
        explanation: string | null;
        tags: string;
        difficulty: number;
        knowledgePoint: string | null;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(paginationDto: PaginationDto): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string): Promise<any>;
    update(id: string, dto: UpdateQuestionDto): Promise<any>;
    delete(id: string): Promise<void>;
    deleteMany(ids: string[]): Promise<{
        deleted: number;
    }>;
    clearAll(): Promise<{
        deleted: number;
    }>;
    private transformQuestion;
}
