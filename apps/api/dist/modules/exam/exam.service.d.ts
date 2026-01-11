import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { AIService } from '../ai/ai.service';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class ExamService {
    private readonly prisma;
    private readonly aiService;
    constructor(prisma: PrismaService, aiService: AIService);
    create(dto: CreateExamDto): Promise<{
        id: string;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string | null;
        description: string | null;
        title: string;
        duration: number;
        totalScore: number;
        accountModes: string;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    getDashboardStats(userId?: string, userRole?: string): Promise<{
        ongoingExams: number;
        totalStudents: number;
        totalSubmissions: number;
        exams: {
            id: string;
            title: string;
            description: string;
            startTime: Date;
            endTime: Date;
            duration: number;
            totalScore: number;
            status: string;
            submissionCount: number;
            totalStudents: number;
        }[];
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
        status: string;
        createdAt: Date;
        updatedAt: Date;
        createdBy: string | null;
        description: string | null;
        title: string;
        duration: number;
        totalScore: number;
        accountModes: string;
        startTime: Date | null;
        endTime: Date | null;
    }>;
    delete(id: string): Promise<void>;
    addQuestion(examId: string, dto: AddQuestionDto): Promise<{
        id: string;
        score: number;
        order: number;
        examId: string;
        questionId: string;
    }>;
    removeQuestion(examId: string, questionId: string): Promise<void>;
    updateQuestionOrder(examId: string, questionId: string, order: number, score?: number): Promise<{
        id: string;
        score: number;
        order: number;
        examId: string;
        questionId: string;
    }>;
    private transformExam;
    addStudent(examId: string, dto: CreateExamStudentDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        username: string;
        password: string;
        examId: string;
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
        username: string;
        password: string;
        examId: string;
        displayName: string | null;
        accountType: string;
        studentId: string | null;
    }>;
    deleteExamStudent(examId: string, studentId: string): Promise<void>;
    getExamForTaking(examId: string): Promise<{
        id: string;
        title: string;
        description: string;
        duration: number;
        totalScore: number;
        questions: {
            id: string;
            content: string;
            type: string;
            options: any;
            score: number;
            order: number;
        }[];
    }>;
    submitExam(examId: string, examStudentId: string, answers: Record<string, any>): Promise<{
        id: string;
        score: number;
        isAutoGraded: boolean;
        submittedAt: Date;
        gradingResults: {
            details: Record<string, any>;
            totalScore: number;
            maxTotalScore: any;
            isFullyAutoGraded: boolean;
        };
    }>;
    private progressStreams;
    submitExamAsync(examId: string, examStudentId: string, answers: Record<string, any>): Promise<void>;
    private sendProgress;
    streamSubmissionProgress(examId: string, examStudentId: string, res: any): Promise<void>;
    checkSubmissionStatus(examId: string, examStudentId: string): Promise<{
        hasSubmitted: boolean;
        submission: {
            id: string;
            score: number;
            isAutoGraded: boolean;
            submittedAt: Date;
        };
    }>;
    private autoGradeSubmission;
    private getAIGradingForSubjective;
    private buildGradingPrompt;
    private getSystemSetting;
    private isValidAnswer;
    private checkKeywords;
    private generateReasoning;
    private generateSuggestions;
    saveAnswers(examId: string, examStudentId: string, answers: Record<string, any>): Promise<{
        message: string;
        timestamp: Date;
    }>;
    getExamSubmissions(examId: string): Promise<{
        id: string;
        student: {
            id: string;
            username: string;
            displayName: string;
        };
        answers: any;
        score: number;
        isAutoGraded: boolean;
        isReviewed: boolean;
        reviewedBy: string;
        reviewedAt: Date;
        gradingDetails: any;
        submittedAt: Date;
    }[]>;
    gradeSubmission(submissionId: string, scores: Record<string, number>, totalScore: number, reviewerId?: string, feedback?: string): Promise<{
        id: string;
        score: number;
        isReviewed: boolean;
        reviewedBy: string;
        reviewedAt: Date;
        gradedAt: Date;
    }>;
    getAIGradingSuggestions(examId: string, submissionId: string): Promise<{
        submissionId: string;
        suggestions: Record<string, any>;
        totalMaxScore: number;
        preGradingInfo: {
            totalScore: any;
            isFullyAutoGraded: any;
        };
    }>;
    private compareAnswers;
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
