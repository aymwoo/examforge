import { Controller, Get, Query, Res, UseGuards, Request, Param } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StudentAiAnalysisService } from './student-ai-analysis.service';
import { StudentAiAnalysisQueryDto } from './dto/student-ai-analysis-query.dto';

@ApiTags('student-ai-analysis')
@Controller('student-ai-analysis')
export class StudentAiAnalysisController {
  constructor(private readonly studentAiAnalysisService: StudentAiAnalysisService) {}

  @Get('stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate student AI analysis report (SSE stream)' })
  @ApiQuery({ name: 'examId' })
  @ApiQuery({ name: 'submissionId' })
  @ApiQuery({ name: 'force', required: false })
  async stream(
    @Query() query: StudentAiAnalysisQueryDto,
    @Request() req: any,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    return this.studentAiAnalysisService.generateStream({
      examId: query.examId,
      submissionId: query.submissionId,
      force: query.force === 'true' || query.force === '1',
      user: req.user,
      res,
    });
  }

  @Get('by-submission/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analysis report by submissionId' })
  @ApiParam({ name: 'submissionId' })
  async getBySubmission(@Param('submissionId') submissionId: string, @Request() req: any) {
    return this.studentAiAnalysisService.getBySubmission(submissionId, req.user);
  }

  @Get('by-exam-student')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analysis report by examId+examStudentId' })
  @ApiQuery({ name: 'examId' })
  @ApiQuery({ name: 'examStudentId' })
  async getByExamStudent(
    @Query('examId') examId: string,
    @Query('examStudentId') examStudentId: string,
    @Request() req: any
  ) {
    return this.studentAiAnalysisService.getByExamStudent(examId, examStudentId, req.user);
  }
}
