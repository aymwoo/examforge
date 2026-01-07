import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AIService } from '../ai/ai.service';
export declare class ExamController {
    private readonly examService;
    private readonly aiService;
    constructor(examService: ExamService, aiService: AIService);
    generateFromAI(body: {
        image: string;
    }): Promise<import("../ai/ai.service").GenerateExamQuestionsResponse>;
    create(dto: CreateExamDto): Promise<{
        id: string;
        title: string;
        description: string | null;
        duration: number;
        totalScore: number;
        status: string;
        startTime: Date | null;
        endTime: Date | null;
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
    update(id: string, dto: UpdateExamDto): Promise<{
        id: string;
        title: string;
        description: string | null;
        duration: number;
        totalScore: number;
        status: string;
        startTime: Date | null;
        endTime: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    delete(id: string): Promise<void>;
    addQuestion(examId: string, dto: AddQuestionDto): Promise<{
        id: string;
        order: number;
        examId: string;
        questionId: string;
        score: number;
    }>;
    removeQuestion(examId: string, questionId: string): Promise<void>;
    updateQuestionOrder(examId: string, questionId: string, body: {
        order: number;
        score?: number;
    }): Promise<{
        id: string;
        order: number;
        examId: string;
        questionId: string;
        score: number;
    }>;
}
