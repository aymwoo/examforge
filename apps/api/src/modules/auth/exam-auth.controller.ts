import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ExamAuthService } from './exam-auth.service';
import { ExamLoginDto } from './dto/exam-login.dto';
import { ExamStudentGuard } from './guards/exam-student.guard';
import { CurrentExamStudent } from './decorators/current-exam-student.decorator';

@ApiTags('exam-auth')
@Controller('auth')
export class ExamAuthController {
  constructor(private readonly examAuthService: ExamAuthService) {}

  @Post('exam-login')
  @ApiOperation({ summary: 'Student login for exam' })
  @ApiBody({ type: ExamLoginDto })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  examLogin(@Body() dto: ExamLoginDto) {
    return this.examAuthService.examLogin(dto);
  }

  @Post('exam-register')
  @ApiOperation({ summary: 'Student self-register for exam (TEMPORARY_REGISTER mode only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        examId: { type: 'string', description: 'Exam ID' },
        studentName: { type: 'string', description: 'Student name' },
        password: { type: 'string', description: 'Password' },
      },
      required: ['examId', 'studentName', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Registration and login successful' })
  @ApiResponse({ status: 400, description: 'Registration failed' })
  examRegister(@Body() dto: { examId: string; studentName: string; password: string }) {
    return this.examAuthService.examRegister(dto);
  }

  @Get('exam-profile')
  @UseGuards(ExamStudentGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current exam student profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  getExamProfile(@CurrentExamStudent() student: any) {
    return {
      id: student.id,
      username: student.username,
      displayName: student.displayName,
      examId: student.examId,
      exam: student.exam,
    };
  }
}
