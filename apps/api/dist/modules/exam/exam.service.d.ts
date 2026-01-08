import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
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
        accountModes: string;
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
        accountModes: string;
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
    addStudent(examId: string, dto: CreateExamStudentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        username: string;
        password: string;
        displayName: string | null;
        accountType: string;
        studentId: string | null;
    }>;
    batchAddStudents(examId: string, dto: BatchCreateExamStudentsDto): Promise<{
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    getExamStudents(examId: string): Promise<{
        id: string;
        createdAt: Date;
        _count: {
            submissions: number;
        };
        username: string;
        displayName: string;
    }[]>;
    updateExamStudent(examId: string, studentId: string, dto: Partial<CreateExamStudentDto>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        examId: string;
        username: string;
        password: string;
        displayName: string | null;
        accountType: string;
        studentId: string | null;
    }>;
    deleteExamStudent(examId: string, studentId: string): Promise<void>;
    generateStudentAccounts(examId: string, count: number, prefix?: string): Promise<{
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    importStudentsFromClass(examId: string, classId: string): Promise<{
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    importTemporaryStudents(examId: string, studentsData: Array<{
        name: string;
        username?: string;
    }>): Promise<{
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    private generateRandomPassword;
}
