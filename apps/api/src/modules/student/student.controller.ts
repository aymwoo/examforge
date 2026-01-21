import { Controller, Get, UseGuards, Request, Param, Patch, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/pagination.dto';
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

  @Get('detail/:studentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student by student ID' })
  async getStudentByStudentId(@Param('studentId') studentId: string, @Request() req: any) {
    return this.studentService.getStudentByStudentId(studentId, req.user);
  }

  @Get('detail/:studentId/exams')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get student exam history by student ID' })
  async getExamsByStudentId(@Param('studentId') studentId: string, @Request() req: any) {
    return this.studentService.getExamHistoryByStudentId(studentId, req.user);
  }

  @Get('prompt-management')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List students for AI prompt management' })
  @ApiQuery({ name: 'search', required: false })
  async listStudentsForPromptManagement(
    @Query() query: PaginationDto & { search?: string },
    @Request() req: any
  ) {
    return this.studentService.listStudentsForPromptManagement(query, req.user);
  }

  @Patch(':id/ai-analysis-prompt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update student AI analysis prompt' })
  async updateStudentAiAnalysisPrompt(
    @Param('id') id: string,
    @Body() body: { prompt: string },
    @Request() req: any
  ) {
    return this.studentService.updateStudentAiAnalysisPrompt(id, body.prompt, req.user);
  }
}
