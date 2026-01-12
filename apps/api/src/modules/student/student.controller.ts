import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentService } from './student.service';

@ApiTags('students')
@Controller('students')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get student profile' })
  async getProfile(@Request() req: any) {
    return this.studentService.getProfile(req.user.sub, req.user.isStudent);
  }

  @Get('exams')
  @ApiOperation({ summary: 'Get student exam history' })
  async getExams(@Request() req: any) {
    return this.studentService.getExamHistory(req.user.sub, req.user.isStudent);
  }
}
