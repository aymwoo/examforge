import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class ExamService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    updateQuestionOrder(examId: string, questionId: string, order: number, score?: number): Promise<{
        id: string;
        order: number;
        score: number;
        examId: string;
        questionId: string;
    }>;
    private transformExam;
}
