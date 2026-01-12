import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

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
              select: { students: true }
            }
          }
        }
      }
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
      class: student.class ? {
        id: student.class.id,
        name: student.class.name,
        description: student.class.description,
        studentCount: student.class._count.students
      } : null
    };
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
            student: { id: userId } // 固定学生
          }
        ]
      },
      include: {
        exam: true,
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1
        }
      }
    });

    return examStudents.map(examStudent => ({
      id: examStudent.exam.id,
      title: examStudent.exam.title,
      description: examStudent.exam.description,
      startTime: examStudent.exam.startTime,
      endTime: examStudent.exam.endTime,
      duration: examStudent.exam.duration,
      totalScore: examStudent.exam.totalScore,
      status: examStudent.exam.status,
      submission: examStudent.submissions.length > 0 ? {
        id: examStudent.submissions[0].id,
        score: examStudent.submissions[0].score,
        submittedAt: examStudent.submissions[0].submittedAt
      } : null
    }));
  }
}
