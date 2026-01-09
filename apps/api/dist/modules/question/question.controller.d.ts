import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ClearQuestionsDto } from './dto/clear-questions.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QuestionController {
    private readonly questionService;
    constructor(questionService: QuestionService);
    create(dto: CreateQuestionDto): Promise<{
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
        createdAt: Date;
        updatedAt: Date;
        createdBy: string | null;
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
    deleteMany(body: {
        ids: string[];
    }): Promise<{
        deleted: number;
    }>;
    clearAll(dto: ClearQuestionsDto): Promise<{
        deleted: number;
    }>;
}
