import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { ExamLoginDto } from './dto/exam-login.dto';
import { AccountGenerator } from '../../common/utils/account-generator';
import * as bcrypt from 'bcrypt';

export interface ExamRegisterDto {
  examId: string;
  studentName: string;
  password: string;
}

@Injectable()
export class ExamAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async examLogin(dto: ExamLoginDto) {
    // 验证考试是否存在
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
    });

    if (!exam) {
      throw new BadRequestException('Exam not found');
    }

    const accountModes = JSON.parse(exam.accountModes);

    // 首先检查是否有临时导入的账号
    let student = await this.prisma.examStudent.findFirst({
      where: {
        examId: dto.examId,
        username: dto.username,
      },
    });

    // 如果找到了账号，验证密码
    if (student) {
      const isPasswordValid = await bcrypt.compare(dto.password, student.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid username or password');
      }
    }

    // 如果仍然没有找到学生账号
    if (!student) {
      // 如果考试支持自主注册，提示用户使用注册功能
      if (accountModes.includes('TEMPORARY_REGISTER')) {
        throw new UnauthorizedException('账号不存在，请使用注册入口完成首次登录。');
      }
      throw new UnauthorizedException(
        'Account not found in this exam. Please contact your teacher to import class students.'
      );
    }

    // 生成JWT token
    const payload = {
      sub: student.id,
      examId: dto.examId,
      username: student.username,
      type: 'exam-student',
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      student: {
        id: student.id,
        username: student.username,
        displayName: student.displayName,
        examId: dto.examId,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        totalScore: exam.totalScore,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
    };
  }

  // 学生自主注册（仅限TEMPORARY_REGISTER模式的考试）
  async examRegister(dto: ExamRegisterDto) {
    // 验证考试是否存在且支持自主注册
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
    });

    if (!exam) {
      throw new BadRequestException('Exam not found');
    }

    const accountModes = JSON.parse(exam.accountModes);
    if (!accountModes.includes('TEMPORARY_REGISTER')) {
      throw new BadRequestException('This exam does not support self-registration');
    }

    // 生成用户名
    const username = AccountGenerator.generateRegisterUsername(exam.title, dto.studentName);

    // 检查用户名是否已存在
    const existing = await this.prisma.examStudent.findFirst({
      where: {
        examId: dto.examId,
        username,
      },
    });

    if (existing) {
      // 如果账号已存在，验证密码并登录
      const isPasswordValid = await bcrypt.compare(dto.password, existing.password);
      if (!isPasswordValid) {
        throw new BadRequestException('密码错误');
      }

      // 密码正确，生成token并返回
      const payload = {
        sub: existing.id,
        username: existing.username,
        examId: existing.examId,
        type: 'exam-student',
      };
      const token = this.jwtService.sign(payload);

      return {
        token,
        student: {
          id: existing.id,
          username: existing.username,
          displayName: existing.displayName,
          examId: existing.examId,
        },
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          duration: exam.duration,
          totalScore: exam.totalScore,
          startTime: exam.startTime,
          endTime: exam.endTime,
        },
        isNewAccount: false, // 标识这是已存在账号的登录
      };
    }

    // 创建临时学生账号
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const student = await this.prisma.examStudent.create({
      data: {
        examId: dto.examId,
        username,
        password: hashedPassword,
        displayName: dto.studentName,
        accountType: 'TEMPORARY',
      },
    });

    // 自动登录
    const payload = {
      sub: student.id,
      examId: dto.examId,
      username: student.username,
      type: 'exam-student',
    };

    const token = this.jwtService.sign(payload);

    return {
      token,
      student: {
        id: student.id,
        username: student.username,
        displayName: student.displayName,
        examId: dto.examId,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        duration: exam.duration,
        totalScore: exam.totalScore,
        startTime: exam.startTime,
        endTime: exam.endTime,
      },
      isNewAccount: true,
    };
  }

  async validateExamStudent(studentId: string, examId: string) {
    const student = await this.prisma.examStudent.findFirst({
      where: {
        id: studentId,
        examId,
      },
      include: {
        exam: true,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid exam student');
    }

    return student;
  }
}
