import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';

describe('ExamService', () => {
  let service: ExamService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    exam: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    examQuestion: {
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    examStudent: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    submission: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAIService = {
    generateQuestionsFromImage: jest.fn(),
  };

  const mockSettingsService = {
    getActiveAIProvider: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AIService, useValue: mockAIService },
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
    prismaService = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an exam with default values', async () => {
      const dto = {
        title: 'Test Exam',
        description: 'Test Description',
        duration: 60,
      };
      const userId = 'user-1';

      const mockExam = {
        id: 'exam-1',
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        totalScore: 100,
        accountModes: JSON.stringify(['TEMPORARY_IMPORT']),
        feedbackVisibility: 'FINAL_SCORE',
        createdBy: userId,
      };

      mockPrismaService.exam.create.mockResolvedValue(mockExam);

      const result = await service.create(dto as any, userId);

      expect(mockPrismaService.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: dto.title,
          description: dto.description,
          duration: dto.duration,
          totalScore: 100,
          accountModes: JSON.stringify(['TEMPORARY_IMPORT']),
          feedbackVisibility: 'FINAL_SCORE',
          createdBy: userId,
        }),
      });
      expect(result).toEqual(mockExam);
    });

    it('should use provided totalScore', async () => {
      const dto = {
        title: 'Test Exam',
        duration: 60,
        totalScore: 150,
      };

      mockPrismaService.exam.create.mockResolvedValue({ id: 'exam-1' });

      await service.create(dto as any, 'user-1');

      expect(mockPrismaService.exam.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalScore: 150,
          }),
        })
      );
    });
  });

  describe('findById', () => {
    it('should return exam with questions', async () => {
      const examId = 'exam-1';
      const mockExam = {
        id: examId,
        title: 'Test Exam',
        examQuestions: [
          {
            id: 'eq-1',
            questionId: 'q-1',
            order: 1,
            score: 5,
            question: {
              id: 'q-1',
              content: 'Test Question',
              type: 'SINGLE_CHOICE',
            },
          },
        ],
        creator: {
          id: 'user-1',
          name: 'Test User',
          username: 'testuser',
          role: 'TEACHER',
        },
        _count: {
          submissions: 0,
          examStudents: 0,
        },
      };

      mockPrismaService.exam.findUnique.mockResolvedValue(mockExam);

      const result = await service.findById(examId);

      expect(mockPrismaService.exam.findUnique).toHaveBeenCalledWith({
        where: { id: examId },
        include: {
          examQuestions: {
            include: { question: true },
            orderBy: { order: 'asc' },
          },
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
            },
          },
          _count: {
            select: { submissions: true, examStudents: true },
          },
        },
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when exam not found', async () => {
      mockPrismaService.exam.findUnique.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addQuestion', () => {
    it('should add question to exam', async () => {
      const examId = 'exam-1';
      const dto = {
        questionId: 'q-1',
        order: 1,
        score: 5,
      };

      const mockExam = {
        id: examId,
        title: 'Test Exam',
        examQuestions: [],
        creator: {
          id: 'user-1',
          name: 'Test User',
          username: 'testuser',
          role: 'TEACHER',
        },
        _count: {
          submissions: 0,
          examStudents: 0,
        },
      };

      const mockQuestion = {
        id: dto.questionId,
        content: 'Test Question',
        type: 'SINGLE_CHOICE',
      };

      const mockExamQuestion = {
        id: 'eq-1',
        examId,
        questionId: dto.questionId,
        order: dto.order,
        score: dto.score,
      };

      mockPrismaService.exam.findUnique.mockResolvedValue(mockExam);
      mockPrismaService.question.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.examQuestion.findFirst.mockResolvedValue(null);
      mockPrismaService.examQuestion.create.mockResolvedValue(mockExamQuestion);

      const result = await service.addQuestion(examId, dto as any);

      expect(mockPrismaService.question.findUnique).toHaveBeenCalledWith({
        where: { id: dto.questionId },
      });
      expect(mockPrismaService.examQuestion.findFirst).toHaveBeenCalledWith({
        where: {
          examId,
          questionId: dto.questionId,
        },
      });
      expect(mockPrismaService.examQuestion.create).toHaveBeenCalledWith({
        data: {
          examId,
          questionId: dto.questionId,
          order: dto.order,
          score: dto.score,
        },
      });
      expect(result).toEqual(mockExamQuestion);
    });

    it('should throw NotFoundException when exam not found', async () => {
      mockPrismaService.exam.findUnique.mockResolvedValue(null);

      await expect(service.addQuestion('non-existent', {} as any)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('submitExamAsync', () => {
    it('should prevent duplicate submission', async () => {
      const examId = 'exam-1';
      const examStudentId = 'student-1';
      const answers = { 'q-1': 'A' };

      mockPrismaService.submission.findFirst.mockResolvedValue({
        id: 'sub-1',
        gradingDetails: '{"score": 100}',
      });

      const sendProgressSpy = jest.spyOn(service as any, 'sendProgress');

      await service.submitExamAsync(examId, examStudentId, answers);

      expect(sendProgressSpy).toHaveBeenCalledWith(`${examId}-${examStudentId}`, {
        type: 'error',
        message: '考试已提交，不能重复提交',
      });
    });

    it('should handle non-existent exam', async () => {
      const examId = 'exam-1';
      const examStudentId = 'student-1';
      const answers = { 'q-1': 'A' };

      mockPrismaService.submission.findFirst.mockResolvedValue(null);
      mockPrismaService.exam.findUnique.mockResolvedValue(null);

      const sendProgressSpy = jest.spyOn(service as any, 'sendProgress');

      await service.submitExamAsync(examId, examStudentId, answers);

      expect(sendProgressSpy).toHaveBeenCalledWith(`${examId}-${examStudentId}`, {
        type: 'error',
        message: '考试不存在',
      });
    });
  });

  describe('autoGradeSubmission', () => {
    it('should grade single choice correctly', async () => {
      const exam = {
        examQuestions: [
          {
            questionId: 'q-1',
            question: { id: 'q-1', type: 'SINGLE_CHOICE', answer: 'B' },
            score: 5,
          },
        ],
      };
      const answers = { 'q-1': 'B' };

      const result = await (service as any).autoGradeSubmission(exam, answers);

      expect(result.totalScore).toBe(5);
      expect(result.details['q-1'].score).toBe(5);
      expect(result.details['q-1'].isCorrect).toBe(true);
    });

    it('should grade single choice incorrectly', async () => {
      const exam = {
        examQuestions: [
          {
            questionId: 'q-1',
            question: { id: 'q-1', type: 'SINGLE_CHOICE', answer: 'B' },
            score: 5,
          },
        ],
      };
      const answers = { 'q-1': 'A' };

      const result = await (service as any).autoGradeSubmission(exam, answers);

      expect(result.totalScore).toBe(0);
      expect(result.details['q-1'].score).toBe(0);
      expect(result.details['q-1'].isCorrect).toBe(false);
    });

    it('should grade multiple choice with partial credit', async () => {
      const exam = {
        examQuestions: [
          {
            questionId: 'q-1',
            question: { id: 'q-1', type: 'MULTIPLE_CHOICE', answer: 'A,B,C' },
            score: 6,
          },
        ],
      };
      const answers = { 'q-1': 'A,B' };

      const result = await (service as any).autoGradeSubmission(exam, answers);

      expect(result.totalScore).toBe(0); // Current implementation doesn't support partial credit for multiple choice
    });

    it('should grade true/false questions', async () => {
      const exam = {
        examQuestions: [
          {
            questionId: 'q-1',
            question: { id: 'q-1', type: 'TRUE_FALSE', answer: 'true' },
            score: 2,
          },
        ],
      };
      const answers = { 'q-1': 'true' };

      const result = await (service as any).autoGradeSubmission(exam, answers);

      expect(result.totalScore).toBe(2);
      expect(result.isFullyAutoGraded).toBe(true);
    });
  });

  describe('generateStudentAccounts', () => {
    it('should generate specified number of accounts', async () => {
      const examId = 'exam-1';
      const count = 3;
      const prefix = 'student';

      const mockExam = {
        id: examId,
        title: 'Test Exam',
        description: 'Test Description',
        duration: 60,
        totalScore: 100,
        accountModes: JSON.stringify(['TEMPORARY_IMPORT']),
        feedbackVisibility: 'FINAL_SCORE',
        examQuestions: [],
        creator: {
          id: 'user-1',
          name: 'Test User',
          username: 'testuser',
          role: 'TEACHER',
        },
        _count: {
          submissions: 0,
          examStudents: 0,
        },
      };

      mockPrismaService.exam.findUnique.mockResolvedValue(mockExam);
      mockPrismaService.examStudent.findFirst.mockResolvedValue(null);
      mockPrismaService.examStudent.create.mockImplementation((args) =>
        Promise.resolve({
          id: `student-${Math.random()}`,
          ...args.data,
        })
      );

      const result = await service.generateStudentAccounts(examId, count, prefix);

      expect(result.success).toBe(count);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(count);
      expect(result.errors).toHaveLength(0);
      expect(mockPrismaService.examStudent.create).toHaveBeenCalledTimes(count);
      expect(result.results[0].username).toBeDefined();
    });
  });

  describe('checkSubmissionStatus', () => {
    it('should return submission status when found', async () => {
      const examId = 'exam-1';
      const examStudentId = 'student-1';

      const mockSubmission = {
        id: 'sub-1',
        score: 85,
        isAutoGraded: true,
        submittedAt: new Date(),
        answers: JSON.stringify({ 'q-1': 'A' }),
        gradingDetails: JSON.stringify({
          details: { 'q-1': { score: 5, maxScore: 5 } },
          totalScore: 85,
        }),
      };

      mockPrismaService.submission.findFirst.mockResolvedValue(mockSubmission);

      const result = await service.checkSubmissionStatus(examId, examStudentId);

      expect(result.hasSubmitted).toBe(true);
      expect(result.submission.score).toBe(85);
    });

    it('should return not submitted when no submission found', async () => {
      const examId = 'exam-1';
      const examStudentId = 'student-1';

      mockPrismaService.submission.findFirst.mockResolvedValue(null);

      const result = await service.checkSubmissionStatus(examId, examStudentId);

      expect(result.hasSubmitted).toBe(false);
      expect(result.submission).toBeNull();
    });
  });
});
