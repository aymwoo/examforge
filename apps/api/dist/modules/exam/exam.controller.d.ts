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
        description: string | null;
        title: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        duration: number;
        totalScore: number;
        startTime: Date | null;
        endTime: Date | null;
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
        description: string | null;
        title: string;
        status: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        duration: number;
        totalScore: number;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    delete(id: string): Promise<void>;
    addQuestion(examId: string, dto: AddQuestionDto): Promise<{
        id: string;
        order: number;
        score: number;
        examId: string;
        questionId: string;
    }>;
    removeQuestion(examId: string, questionId: string): Promise<void>;
    updateQuestionOrder(examId: string, questionId: string, body: {
        order: number;
        score?: number;
    }): Promise<{
        id: string;
        order: number;
        score: number;
        examId: string;
        questionId: string;
    }>;
}
