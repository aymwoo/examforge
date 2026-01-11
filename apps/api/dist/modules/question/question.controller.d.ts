import { QuestionService } from './question.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { ClearQuestionsDto } from './dto/clear-questions.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
export declare class QuestionController {
    private readonly questionService;
    constructor(questionService: QuestionService);
    create(dto: CreateQuestionDto, req: any): Promise<{
        id: string;
        content: string;
        type: string;
        options: string | null;
        answer: string | null;
        explanation: string | null;
        illustration: string | null;
        images: string | null;
        tags: string;
        difficulty: number;
        status: string;
        knowledgePoint: string | null;
        isPublic: boolean;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string | null;
    }>;
    findAll(paginationDto: PaginationDto, req: any): Promise<{
        data: any[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findById(id: string, req: any): Promise<any>;
    update(id: string, dto: UpdateQuestionDto, req: any): Promise<any>;
    delete(id: string, req: any): Promise<void>;
    deleteMany(body: {
        ids: string[];
    }): Promise<{
        deleted: number;
    }>;
    clearAll(dto: ClearQuestionsDto): Promise<{
        deleted: number;
    }>;
    uploadImage(id: string, file: Express.Multer.File, req: any): Promise<{
        imagePath: string;
    }>;
    deleteImage(id: string, imageIndex: string, req: any): Promise<{
        success: boolean;
    }>;
    addClipboardImage(id: string, body: {
        imageData: string;
    }, req: any): Promise<{
        imagePath: string;
    }>;
}
