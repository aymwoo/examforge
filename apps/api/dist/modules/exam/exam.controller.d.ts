import { Response } from 'express';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
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
    getDashboardStats(req?: any): Promise<{
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
    addStudent(examId: string, dto: CreateExamStudentDto): Promise<{
        id: string;
        createdAt: Date;
        username: string;
        password: string;
        updatedAt: Date;
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
    generateStudentAccounts(examId: string, body: {
        count: number;
        prefix?: string;
    }): Promise<{
        success: number;
        failed: number;
        results: any[];
        errors: any[];
    }>;
    getExamStudents(examId: string): Promise<{
        id: string;
        createdAt: Date;
        username: string;
        _count: {
            submissions: number;
        };
        displayName: string;
    }[]>;
    updateExamStudent(examId: string, studentId: string, dto: Partial<CreateExamStudentDto>): Promise<{
        id: string;
        createdAt: Date;
        username: string;
        password: string;
        updatedAt: Date;
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
    submitExam(examId: string, body: {
        answers: Record<string, any>;
        examStudentId: string;
    }): Promise<{
        message: string;
        submissionId: string;
    }>;
    getSubmitProgress(examId: string, examStudentId: string, res: Response): Promise<void>;
    checkSubmissionStatus(examId: string, examStudentId: string): Promise<{
        hasSubmitted: boolean;
        submission: {
            id: string;
            score: number;
            isAutoGraded: boolean;
            submittedAt: Date;
        };
    }>;
    saveAnswers(examId: string, body: {
        answers: Record<string, any>;
        examStudentId: string;
    }): Promise<{
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
    gradeSubmission(examId: string, submissionId: string, body: {
        scores: Record<string, number>;
        totalScore: number;
        reviewerId?: string;
        feedback?: string;
    }): Promise<{
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
}
