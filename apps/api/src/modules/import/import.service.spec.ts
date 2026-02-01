import { Test, TestingModule } from '@nestjs/testing';
import { ImportService } from './import.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AIService } from '../ai/ai.service';
import { SettingsService } from '../settings/settings.service';
import { ImportProgressStore } from './import-progress.store';

// Mock dependencies
jest.mock(
  '@/common/enums/question.enum',
  () => ({
    QuestionStatus: { DRAFT: 'DRAFT' },
    QuestionType: { SINGLE_CHOICE: 'SINGLE_CHOICE' },
  }),
  { virtual: true }
);

jest.mock(
  '@/common/utils/pdf-text',
  () => ({
    extractTextFromPdf: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '@/common/utils/question-answer',
  () => ({
    serializeQuestionAnswer: jest.fn(),
  }),
  { virtual: true }
);

jest.mock(
  '@/common/utils/pdf-to-images',
  () => ({
    convertPdfToPngBuffers: jest.fn(),
  }),
  { virtual: true }
);

describe('ImportService', () => {
  let service: ImportService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    importRecord: {
      findFirst: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAIService = {};
  const mockSettingsService = {};

  // Create a proper mock for ImportProgressStore
  const mockProgressStore = {
    createJob: jest.fn(),
    append: jest.fn(),
    getEventsSince: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AIService, useValue: mockAIService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ImportProgressStore, useValue: mockProgressStore },
      ],
    }).compile();

    service = module.get<ImportService>(ImportService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getImportJobQuestions', () => {
    const jobId = 'test-job-id';
    const userId = 'test-user-id';

    it('should throw BadRequestException if record not found', async () => {
      mockPrismaService.importRecord.findFirst.mockResolvedValue(null);

      await expect(service.getImportJobQuestions(jobId, userId)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return empty list if questionIds is empty', async () => {
      mockPrismaService.importRecord.findFirst.mockResolvedValue({
        questionIds: '[]',
      });

      const result = await service.getImportJobQuestions(jobId, userId);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });

    it('should fetch questions with correct IDs and ordering', async () => {
      const questionIds = ['q1', 'q2', 'q3'];
      mockPrismaService.importRecord.findFirst.mockResolvedValue({
        questionIds: JSON.stringify(questionIds),
      });

      const mockQuestions = [
        { id: 'q1', content: 'Question 1', importOrder: 1 },
        { id: 'q2', content: 'Question 2', importOrder: 2 },
      ];
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getImportJobQuestions(jobId, userId, 1, 2);

      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['q1', 'q2'] } },
        orderBy: { importOrder: 'asc' },
      });

      expect(result).toEqual({
        data: [
          { id: 'q1', content: 'Question 1', importOrder: 1, tags: [] },
          { id: 'q2', content: 'Question 2', importOrder: 2, tags: [] },
        ],
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('should handle string formatted questionIds (legacy)', async () => {
      mockPrismaService.importRecord.findFirst.mockResolvedValue({
        questionIds: 'q1,q2,q3',
      });

      const mockQuestions = [
        { id: 'q1', content: 'Question 1' },
        { id: 'q2', content: 'Question 2' },
      ];
      mockPrismaService.question.findMany.mockResolvedValue(mockQuestions);

      const result = await service.getImportJobQuestions(jobId, userId, 1, 2);

      expect(result.total).toBe(3);
      expect(mockPrismaService.question.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['q1', 'q2'] } },
        })
      );
    });
  });
});
