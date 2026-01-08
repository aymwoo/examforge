import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AccountGenerator } from '../../common/utils/account-generator';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ExamService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        totalScore: dto.totalScore || 100,
        accountModes: JSON.stringify(dto.accountModes || ['TEMPORARY_IMPORT']),
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        status: 'DRAFT',
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 20, status } = paginationDto;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          examQuestions: {
            include: {
              question: true,
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { submissions: true },
          },
        },
      }),
      this.prisma.exam.count({ where }),
    ]);

    return {
      data: data.map((exam) => this.transformExam(exam)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        examQuestions: {
          include: {
            question: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { submissions: true },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException(`Exam #${id} not found`);
    }

    return this.transformExam(exam);
  }

  async update(id: string, dto: UpdateExamDto) {
    await this.findById(id);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.totalScore !== undefined) updateData.totalScore = dto.totalScore;
    if (dto.accountModes !== undefined) updateData.accountModes = JSON.stringify(dto.accountModes);
    if (dto.startTime !== undefined) updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
    if (dto.endTime !== undefined) updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
    if (dto.status !== undefined) updateData.status = dto.status;

    const updated = await this.prisma.exam.update({
      where: { id },
      data: updateData,
    });

    return updated;
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.exam.delete({ where: { id } });
  }

  async addQuestion(examId: string, dto: AddQuestionDto) {
    await this.findById(examId);

    const question = await this.prisma.question.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question #${dto.questionId} not found`);
    }

    const existing = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId: dto.questionId,
      },
    });

    if (existing) {
      throw new BadRequestException('Question already added to this exam');
    }

    return this.prisma.examQuestion.create({
      data: {
        examId,
        questionId: dto.questionId,
        order: dto.order,
        score: dto.score || 1,
      },
    });
  }

  async removeQuestion(examId: string, questionId: string) {
    await this.findById(examId);

    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in this exam');
    }

    await this.prisma.examQuestion.delete({
      where: { id: examQuestion.id },
    });
  }

  async updateQuestionOrder(examId: string, questionId: string, order: number, score?: number) {
    await this.findById(examId);

    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: {
        examId,
        questionId,
      },
    });

    if (!examQuestion) {
      throw new NotFoundException('Question not found in this exam');
    }

    return this.prisma.examQuestion.update({
      where: { id: examQuestion.id },
      data: {
        order,
        ...(score !== undefined && { score }),
      },
    });
  }

  private transformExam(exam: any) {
    return {
      ...exam,
      accountModes: exam.accountModes ? JSON.parse(exam.accountModes) : ['TEMPORARY_IMPORT'],
      questions: exam.examQuestions.map((eq: any) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        order: eq.order,
        score: eq.score,
        question: eq.question,
      })),
      submissionCount: exam._count.submissions,
      examQuestions: undefined,
      _count: undefined,
    };
  }

  // 学生管理功能
  async addStudent(examId: string, dto: CreateExamStudentDto) {
    await this.findById(examId);

    // 检查用户名是否已存在
    const existing = await this.prisma.examStudent.findFirst({
      where: {
        examId,
        username: dto.username,
      },
    });

    if (existing) {
      throw new ConflictException('Username already exists in this exam');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.examStudent.create({
      data: {
        examId,
        username: dto.username,
        password: hashedPassword,
        displayName: dto.displayName,
      },
    });
  }

  async batchAddStudents(examId: string, dto: BatchCreateExamStudentsDto) {
    await this.findById(examId);

    const results = [];
    const errors = [];

    for (const student of dto.students) {
      try {
        const result = await this.addStudent(examId, student);
        results.push(result);
      } catch (error) {
        errors.push({
          username: student.username,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  async getExamStudents(examId: string) {
    await this.findById(examId);

    return this.prisma.examStudent.findMany({
      where: { examId },
      select: {
        id: true,
        username: true,
        displayName: true,
        createdAt: true,
        _count: {
          select: { submissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateExamStudent(examId: string, studentId: string, dto: Partial<CreateExamStudentDto>) {
    await this.findById(examId);

    const student = await this.prisma.examStudent.findFirst({
      where: { id: studentId, examId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this exam');
    }

    const updateData: any = {};
    if (dto.username) updateData.username = dto.username;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.examStudent.update({
      where: { id: studentId },
      data: updateData,
    });
  }

  async deleteExamStudent(examId: string, studentId: string) {
    await this.findById(examId);

    const student = await this.prisma.examStudent.findFirst({
      where: { id: studentId, examId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this exam');
    }

    await this.prisma.examStudent.delete({
      where: { id: studentId },
    });
  }

  async generateStudentAccounts(examId: string, count: number, prefix: string = 'student') {
    const exam = await this.findById(examId);

    const students = [];
    for (let i = 1; i <= count; i++) {
      // 使用易记忆的格式生成用户名
      const username = AccountGenerator.generateTemporaryUsername(exam.title, '', i);
      const password = AccountGenerator.generateMemorablePassword();
      
      students.push({
        username,
        password,
        displayName: `学生${i}`,
      });
    }

    return this.batchAddStudents(examId, { students });
  }

  // 从班级导入固定学生
  async importStudentsFromClass(examId: string, classId: string) {
    await this.findById(examId);

    const students = await this.prisma.student.findMany({
      where: { classId },
    });

    const results = [];
    const errors = [];

    for (const student of students) {
      try {
        const username = AccountGenerator.generatePermanentUsername(student.studentId);
        
        // 检查是否已存在
        const existing = await this.prisma.examStudent.findFirst({
          where: { examId, username },
        });

        if (existing) {
          errors.push({
            studentId: student.studentId,
            error: '学生已存在于考试中',
          });
          continue;
        }

        const examStudent = await this.prisma.examStudent.create({
          data: {
            examId,
            username,
            password: student.password, // 使用固定学生的密码
            displayName: student.name,
            accountType: 'PERMANENT',
            studentId: student.studentId,
          },
        });

        results.push(examStudent);
      } catch (error) {
        errors.push({
          studentId: student.studentId,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  // 从Excel/CSV导入临时学生
  async importTemporaryStudents(examId: string, studentsData: Array<{name: string, username?: string}>) {
    const exam = await this.findById(examId);
    
    const results = [];
    const errors = [];

    for (let i = 0; i < studentsData.length; i++) {
      const studentData = studentsData[i];
      try {
        // 生成易记忆的临时账号用户名
        const username = AccountGenerator.generateTemporaryUsername(
          exam.title, 
          studentData.name, 
          i + 1
        );
        
        // 检查是否已存在
        const existing = await this.prisma.examStudent.findFirst({
          where: { examId, username },
        });

        if (existing) {
          // 如果重复，添加序号后缀
          const fallbackUsername = `${username}_${i + 1}`;
          const existingFallback = await this.prisma.examStudent.findFirst({
            where: { examId, username: fallbackUsername },
          });
          
          if (existingFallback) {
            errors.push({
              name: studentData.name,
              error: '用户名已存在',
            });
            continue;
          }
          
          // 使用后缀用户名
          const password = AccountGenerator.generateMemorablePassword();
          const examStudent = await this.prisma.examStudent.create({
            data: {
              examId,
              username: fallbackUsername,
              password: await bcrypt.hash(password, 10),
              displayName: studentData.name,
              accountType: 'TEMPORARY',
            },
          });

          results.push({
            ...examStudent,
            plainPassword: password,
          });
          continue;
        }

        const password = AccountGenerator.generateMemorablePassword();
        const examStudent = await this.prisma.examStudent.create({
          data: {
            examId,
            username,
            password: await bcrypt.hash(password, 10),
            displayName: studentData.name,
            accountType: 'TEMPORARY',
          },
        });

        results.push({
          ...examStudent,
          plainPassword: password,
        });
      } catch (error) {
        errors.push({
          name: studentData.name,
          error: error.message,
        });
      }
    }

    return {
      success: results.length,
      failed: errors.length,
      results,
      errors,
    };
  }

  private generateRandomPassword(length: number = 8): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
