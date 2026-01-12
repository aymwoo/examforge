import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentService } from './student.service';

@ApiTags('students')
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student profile' })
  async getProfile(@Request() req: any) {
    return this.studentService.getProfile(req.user.sub, req.user.isStudent);
  }

  @Get('exams')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student exam history' })
  async getExams(@Request() req: any) {
    return this.studentService.getExamHistory(req.user.sub, req.user.isStudent);
  }

  @Get(':studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student by student ID' })
  async getStudentByStudentId(@Param('studentId') studentId: string, @Request() req: any) {
    return this.studentService.getStudentByStudentId(studentId, req.user);
  }

  @Get(':studentId/exams')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student exam history by student ID' })
  async getExamsByStudentId(@Param('studentId') studentId: string, @Request() req: any) {
    return this.studentService.getExamHistoryByStudentId(studentId, req.user);
  }
}
