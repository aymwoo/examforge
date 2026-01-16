import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async listStudentsForPromptManagement(
    paginationDto: PaginationDto & { search?: string },
    currentUser: any
  ) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'TEACHER') {
      throw new ForbiddenException('只有教师或管理员可以管理学生提示词');
    }

    const { page = 1, limit = 20 } = paginationDto;
    const normalizedPage = Number(page) || 1;
    const normalizedLimit = Number(limit) || 20;
    const skip = (normalizedPage - 1) * normalizedLimit;
    const search = (paginationDto.search || '').trim();

    const where: any = {};
    if (search) {
      where.OR = [{ name: { contains: search } }, { studentId: { contains: search } }];
    }

    if (currentUser.role === 'TEACHER') {
      where.class = { createdBy: currentUser.sub };
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: normalizedLimit,
        orderBy: [{ updatedAt: 'desc' }],
        select: {
          id: true,
          studentId: true,
          name: true,
          gender: true,
          classId: true,
          aiAnalysisPrompt: true,
          class: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page: normalizedPage,
        limit: normalizedLimit,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async updateStudentAiAnalysisPrompt(studentId: string, prompt: string, currentUser: any) {
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'TEACHER') {
      throw new ForbiddenException('只有教师或管理员可以管理学生提示词');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });

    if (!student) {
      throw new NotFoundException('学生信息不存在');
    }

    if (currentUser.role === 'TEACHER') {
      if (!student.classId) {
        throw new ForbiddenException('该学生未分配班级，您无权修改');
      }

      if (!student.class || student.class.createdBy !== currentUser.sub) {
        throw new ForbiddenException('您只能修改自己班级的学生');
      }
    }

    const normalized = (prompt || '').trim();
    if (normalized.length > 5000) {
      throw new ForbiddenException('提示词过长（最多5000字符）');
    }

    await this.prisma.student.update({
      where: { id: studentId },
      data: { aiAnalysisPrompt: normalized },
    });

    return { success: true };
  }

  async getProfile(userId: string, isStudent: boolean) {
    if (!isStudent) {
      throw new ForbiddenException('只有学生可以访问此接口');
    }

    const student = await this.prisma.student.findUnique({
      where: { id: userId },
      include: {
        class: {
          include: {
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生信息不存在');
    }

    return {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      gender: student.gender,
      classId: student.classId,
      class: student.class
        ? {
            id: student.class.id,
            name: student.class.name,
            description: student.class.description,
            studentCount: student.class._count.students,
          }
        : null,
    };
  }

  async getStudentByStudentId(studentId: string, currentUser: any) {
    const student = await this.prisma.student.findUnique({
      where: { studentId },
      include: {
        class: {
          include: {
            _count: {
              select: { students: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('学生信息不存在');
    }

    // 权限检查
    await this.checkStudentAccess(student, currentUser);

    return {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      gender: student.gender,
      classId: student.classId,
      class: student.class
        ? {
            id: student.class.id,
            name: student.class.name,
            description: student.class.description,
            studentCount: student.class._count.students,
          }
        : null,
    };
  }

  async getExamHistoryByStudentId(studentId: string, currentUser: any) {
    // 先找到学生
    const student = await this.prisma.student.findUnique({
      where: { studentId },
      include: {
        class: true,
      },
    });

    if (!student) {
      throw new NotFoundException('学生信息不存在');
    }

    // 权限检查
    await this.checkStudentAccess(student, currentUser);

    // 获取学生参与的所有考试
    const examStudents = await this.prisma.examStudent.findMany({
      where: {
        OR: [
          { studentId: student.id }, // 临时学生
          {
            student: { id: student.id }, // 固定学生
          },
        ],
      },
      include: {
        exam: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    return examStudents.map((examStudent) => ({
      id: examStudent.exam.id,
      title: examStudent.exam.title,
      description: examStudent.exam.description,
      startTime: examStudent.exam.startTime,
      endTime: examStudent.exam.endTime,
      duration: examStudent.exam.duration,
      totalScore: examStudent.exam.totalScore,
      status: examStudent.exam.status,
      submission:
        examStudent.submissions.length > 0
          ? {
              id: examStudent.submissions[0].id,
              score: examStudent.submissions[0].score,
              submittedAt: examStudent.submissions[0].submittedAt,
            }
          : null,
    }));
  }

  private async checkStudentAccess(student: any, currentUser: any) {
    // 管理员可以访问所有学生
    if (currentUser.role === 'ADMIN') {
      return;
    }

    // 学生只能访问自己的信息
    if (currentUser.role === 'STUDENT' || currentUser.isStudent) {
      if (student.studentId === currentUser.username) {
        return;
      }
      throw new ForbiddenException('您只能查看自己的信息');
    }

    // 教师只能访问自己班级的学生
    if (currentUser.role === 'TEACHER') {
      if (!student.classId) {
        throw new ForbiddenException('该学生未分配班级，您无权查看');
      }

      // 检查教师是否是该班级的创建者
      const classInfo = await this.prisma.class.findUnique({
        where: { id: student.classId },
      });

      if (!classInfo || classInfo.createdBy !== currentUser.sub) {
        throw new ForbiddenException('您只能查看自己班级的学生信息');
      }
      return;
    }

    throw new ForbiddenException('您没有权限查看该学生信息');
  }

  async getExamHistory(userId: string, isStudent: boolean) {
    if (!isStudent) {
      throw new ForbiddenException('只有学生可以访问此接口');
    }

    // 获取学生参与的所有考试
    const examStudents = await this.prisma.examStudent.findMany({
      where: {
        OR: [
          { studentId: userId }, // 临时学生
          {
            student: { id: userId }, // 固定学生
          },
        ],
      },
      include: {
        exam: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
        },
      },
    });

    return examStudents.map((examStudent) => ({
      id: examStudent.exam.id,
      title: examStudent.exam.title,
      description: examStudent.exam.description,
      startTime: examStudent.exam.startTime,
      endTime: examStudent.exam.endTime,
      duration: examStudent.exam.duration,
      totalScore: examStudent.exam.totalScore,
      status: examStudent.exam.status,
      submission:
        examStudent.submissions.length > 0
          ? {
              id: examStudent.submissions[0].id,
              score: examStudent.submissions[0].score,
              submittedAt: examStudent.submissions[0].submittedAt,
            }
          : null,
    }));
  }
}
