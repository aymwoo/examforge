import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubmissionDto, AnswerDto } from './dto/create-submission.dto';
import { SubmissionPaginationDto } from './dto/submission-pagination.dto';
import { QuestionType } from '@/common/enums/question.enum';

@Injectable()
export class SubmissionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(examId: string, dto: CreateSubmissionDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam #${examId} not found`);
    }

    const answersMap = new Map<string, string>();
    dto.answers.forEach((a) => answersMap.set(a.questionId, a.answer));

    const submittedQuestionIds = new Set(dto.answers.map((a) => a.questionId));
    const examQuestionIds = new Set(exam.examQuestions.map((eq) => eq.questionId));

    const missingQuestions = [...examQuestionIds].filter((id) => !submittedQuestionIds.has(id));
    if (missingQuestions.length > 0) {
      throw new BadRequestException(
        `Missing answers for questions: ${missingQuestions.join(', ')}`
      );
    }

    const extraQuestions = [...submittedQuestionIds].filter((id) => !examQuestionIds.has(id));
    if (extraQuestions.length > 0) {
      throw new BadRequestException(`Invalid question IDs: ${extraQuestions.join(', ')}`);
    }

    const { score, isAutoGraded, details } = await this.calculateScore(exam, answersMap);

    const answersJson = JSON.stringify(
      dto.answers.map((a) => ({
        questionId: a.questionId,
        answer: a.answer,
      }))
    );

    const submission = await this.prisma.submission.create({
      data: {
        examId,
        answers: answersJson,
        score,
        isAutoGraded,
      },
    });

    return {
      ...submission,
      details,
    };
  }

  async findByExam(examId: string, paginationDto: SubmissionPaginationDto) {
    await this.prisma.exam.findUnique({ where: { id: examId } });

    const { page = 1, limit = 20 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.submission.findMany({
        where: { examId },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.submission.count({ where: { examId } }),
    ]);

    return {
      data: data.map((s) => this.transformSubmission(s)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: true,
              },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission #${id} not found`);
    }

    return this.transformSubmissionWithDetails(submission);
  }

  private async calculateScore(
    exam: any,
    answersMap: Map<string, string>
  ): Promise<{ score: number; isAutoGraded: boolean; details: any }> {
    let totalScore = 0;
    let autoGradableScore = 0;
    let earnedScore = 0;
    const details = [];

    for (const eq of exam.examQuestions) {
      const question = eq.question;
      const userAnswer = answersMap.get(question.id) || '';
      const isCorrect = this.checkAnswer(question, userAnswer);

      if (this.isAutoGradable(question.type)) {
        autoGradableScore += eq.score;
        if (isCorrect) {
          earnedScore += eq.score;
        }
      }

      details.push({
        questionId: question.id,
        questionType: question.type,
        score: eq.score,
        userAnswer,
        correctAnswer: question.answer,
        isCorrect: this.isAutoGradable(question.type) ? isCorrect : null,
        isAutoGradable: this.isAutoGradable(question.type),
      });
    }

    return {
      score: autoGradableScore > 0 ? (earnedScore / autoGradableScore) * 100 : null,
      isAutoGraded: autoGradableScore === exam.totalScore,
      details,
    };
  }

  private checkAnswer(question: any, userAnswer: string): boolean {
    const normalizedUser = userAnswer.trim().toUpperCase();
    const normalizedCorrect = question.answer.trim().toUpperCase();

    switch (question.type) {
      case QuestionType.SINGLE_CHOICE:
      case QuestionType.TRUE_FALSE:
        return normalizedUser === normalizedCorrect;

      case QuestionType.MULTIPLE_CHOICE:
        const userOptions = normalizedUser
          .split(',')
          .map((s) => s.trim())
          .sort();
        const correctOptions = normalizedCorrect
          .split(',')
          .map((s) => s.trim())
          .sort();
        return (
          userOptions.length === correctOptions.length &&
          userOptions.every((opt, idx) => opt === correctOptions[idx])
        );

      case QuestionType.FILL_BLANK:
        return normalizedUser === normalizedCorrect;

      case QuestionType.ESSAY:
        return false;

      default:
        return false;
    }
  }

  private isAutoGradable(type: string): boolean {
    return [
      QuestionType.SINGLE_CHOICE,
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.TRUE_FALSE,
      QuestionType.FILL_BLANK,
    ].includes(type as QuestionType);
  }

  private transformSubmission(submission: any) {
    return {
      ...submission,
      answers: JSON.parse(submission.answers),
    };
  }

  private transformSubmissionWithDetails(submission: any) {
    return {
      ...submission,
      answers: JSON.parse(submission.answers),
    };
  }
}
