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
    private readonly jwtService: JwtService,
  ) {}

  async examLogin(dto: ExamLoginDto) {
    // 验证考试是否存在
    const exam = await this.prisma.exam.findUnique({
      where: { id: dto.examId },
    });

    if (!exam) {
      throw new BadRequestException('Exam not found');
    }

    // 验证学生账号
    const student = await this.prisma.examStudent.findFirst({
      where: {
        examId: dto.examId,
        username: dto.username,
      },
    });

    if (!student) {
      throw new UnauthorizedException('Invalid username or password');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(dto.password, student.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
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

    if (exam.accountMode !== 'TEMPORARY_REGISTER') {
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
      throw new BadRequestException('Student name already registered for this exam');
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
