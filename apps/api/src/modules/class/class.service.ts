import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class ClassService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateClassDto, userId: string) {
    // 检查班级代码是否已存在
    const existingClass = await this.prisma.class.findUnique({
      where: { code: dto.code },
    });

    if (existingClass) {
      throw new ConflictException('班级代码已存在');
    }

    return this.prisma.class.create({
      data: {
        ...dto,
        createdBy: userId,
      },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        students: true,
        _count: {
          select: { students: true },
        },
      },
    });
  }

  async findAll(userId?: string, userRole?: string) {
    const where = userRole === 'ADMIN' ? {} : { createdBy: userId };

    return this.prisma.class.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        _count: {
          select: { students: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const classData = await this.prisma.class.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        students: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { students: true },
        },
      },
    });

    if (!classData) {
      throw new NotFoundException('班级不存在');
    }

    // 权限检查：教师只能查看自己创建的班级
    if (userRole !== 'ADMIN' && classData.createdBy !== userId) {
      throw new ForbiddenException('无权访问此班级');
    }

    return classData;
  }

  async update(id: string, dto: UpdateClassDto, userId?: string, userRole?: string) {
    const classData = await this.findOne(id, userId, userRole);

    // 如果更新班级代码，检查是否冲突
    if (dto.code && dto.code !== classData.code) {
      const existingClass = await this.prisma.class.findUnique({
        where: { code: dto.code },
      });

      if (existingClass) {
        throw new ConflictException('班级代码已存在');
      }
    }

    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: {
        creator: {
          select: { id: true, name: true, username: true },
        },
        students: true,
        _count: {
          select: { students: true },
        },
      },
    });
  }

  async remove(id: string, userId?: string, userRole?: string) {
    await this.findOne(id, userId, userRole);

    return this.prisma.class.delete({
      where: { id },
    });
  }

  async addStudent(classId: string, dto: CreateStudentDto, userId?: string, userRole?: string) {
    await this.findOne(classId, userId, userRole);

    // 检查学号是否已存在
    const existingStudent = await this.prisma.student.findUnique({
      where: { studentId: dto.studentId },
    });

    if (existingStudent) {
      throw new ConflictException('学号已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.student.create({
      data: {
        ...dto,
        password: hashedPassword,
        classId,
      },
    });
  }

  async removeStudent(classId: string, studentId: string, userId?: string, userRole?: string) {
    await this.findOne(classId, userId, userRole);

    const student = await this.prisma.student.findFirst({
      where: {
        studentId,
        classId,
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    return this.prisma.student.delete({
      where: { id: student.id },
    });
  }

  async importStudents(
    classId: string,
    students: CreateStudentDto[],
    userId?: string,
    userRole?: string
  ) {
    await this.findOne(classId, userId, userRole);

    const results = [];

    for (const studentDto of students) {
      try {
        // 检查学号是否已存在
        const existingStudent = await this.prisma.student.findUnique({
          where: { studentId: studentDto.studentId },
        });

        if (existingStudent) {
          results.push({
            studentId: studentDto.studentId,
            name: studentDto.name,
            success: false,
            error: '学号已存在',
          });
          continue;
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(studentDto.password, 10);

        const student = await this.prisma.student.create({
          data: {
            ...studentDto,
            password: hashedPassword,
            classId,
          },
        });

        results.push({
          studentId: student.studentId,
          name: student.name,
          success: true,
        });
      } catch (error) {
        results.push({
          studentId: studentDto.studentId,
          name: studentDto.name,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: students.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async resetStudentPasswords(
    classId: string,
    studentIds: string[],
    newPassword: string,
    userId?: string,
    userRole?: string
  ) {
    await this.findOne(classId, userId, userRole);

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const results = [];

    for (const studentId of studentIds) {
      try {
        const student = await this.prisma.student.findFirst({
          where: {
            studentId,
            classId,
          },
        });

        if (!student) {
          results.push({
            studentId,
            success: false,
            error: '学生不存在',
          });
          continue;
        }

        await this.prisma.student.update({
          where: { id: student.id },
          data: { password: hashedPassword },
        });

        results.push({
          studentId,
          success: true,
        });
      } catch (error) {
        results.push({
          studentId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total: studentIds.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  async updateStudent(
    classId: string,
    studentId: string,
    dto: Partial<CreateStudentDto>,
    userId?: string,
    userRole?: string
  ) {
    await this.findOne(classId, userId, userRole);

    const student = await this.prisma.student.findFirst({
      where: {
        studentId,
        classId,
      },
    });

    if (!student) {
      throw new NotFoundException('学生不存在');
    }

    // 如果更新学号，检查是否冲突
    if (dto.studentId && dto.studentId !== student.studentId) {
      const existingStudent = await this.prisma.student.findUnique({
        where: { studentId: dto.studentId },
      });

      if (existingStudent) {
        throw new ConflictException('学号已存在');
      }
    }

    const updateData: any = { ...dto };

    // 如果更新密码，需要加密
    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.student.update({
      where: { id: student.id },
      data: updateData,
    });
  }

  async getStudents(classId: string, userId: string, userRole: string) {
    // 检查权限
    if (userRole !== 'ADMIN') {
      const classItem = await this.prisma.class.findFirst({
        where: { id: classId, createdBy: userId },
      });
      if (!classItem) {
        throw new ForbiddenException('无权访问此班级');
      }
    }

    return this.prisma.student.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
