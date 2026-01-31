import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  Res,
  HttpStatus,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { AddQuestionDto } from './dto/add-question.dto';
import { CreateExamStudentDto } from './dto/create-exam-student.dto';
import { BatchCreateExamStudentsDto } from './dto/batch-create-exam-students.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AIService } from '../ai/ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamStudentGuard } from '../auth/guards/exam-student.guard';
import { CurrentExamStudent } from '../auth/decorators/current-exam-student.decorator';

@ApiTags('exams')
@Controller('exams')
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly aiService: AIService
  ) {}

  @Post('generate-from-ai')
  @ApiOperation({ summary: 'Generate exam questions from uploaded image using AI' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generateFromAI(@Body('image') body: { image: string }) {
    return this.aiService.generateExamQuestionsFromImage(body.image);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created successfully' })
  create(@Body() dto: CreateExamDto, @Request() req) {
    return this.examService.create(dto, req.user.id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats(@Request() req?: any) {
    const userId = req?.user?.id;
    const userRole = req?.user?.role || 'GUEST';
    return this.examService.getDashboardStats(userId, userRole);
  }

  @Get()
  @ApiOperation({ summary: 'Get all exams with pagination' })
  @ApiResponse({ status: 200, description: 'Exams retrieved successfully' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.examService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exam by ID with questions' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam found' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  findById(@Param('id') id: string) {
    return this.examService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam updated successfully' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto, @Request() req) {
    return this.examService.update(id, dto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move exam to recycle bin' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 204, description: 'Exam moved to recycle bin' })
  delete(@Param('id') id: string, @Request() req) {
    return this.examService.delete(id, req.user.id, req.user.role);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore exam from recycle bin' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  restore(@Param('id') id: string) {
    return this.examService.restore(id);
  }

  @Delete(':id/hard')
  @ApiOperation({ summary: 'Permanently delete an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Exam title to confirm' },
      },
      required: ['name'],
    },
  })
  hardDelete(@Param('id') id: string, @Body('name') name: string) {
    return this.examService.hardDelete(id, name);
  }

  @Post(':id/copy')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Copy an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID to copy' })
  @ApiResponse({ status: 201, description: 'Exam copied successfully' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  copy(@Param('id') id: string, @Request() req) {
    return this.examService.copy(id, req.user.id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a question to an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 201, description: 'Question added successfully' })
  addQuestion(@Param('id') examId: string, @Body() dto: AddQuestionDto) {
    return this.examService.addQuestion(examId, dto);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a question from an exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 204, description: 'Question removed successfully' })
  removeQuestion(@Param('id') examId: string, @Param('questionId') questionId: string) {
    return this.examService.removeQuestion(examId, questionId);
  }

  @Put(':id/questions/:questionId')
  @ApiOperation({ summary: 'Update question order and score in exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'questionId', description: 'Question ID' })
  @ApiResponse({ status: 200, description: 'Question updated successfully' })
  updateQuestionOrder(
    @Param('id') examId: string,
    @Param('questionId') questionId: string,
    @Body() body: { order: number; score?: number }
  ) {
    return this.examService.updateQuestionOrder(examId, questionId, body.order, body.score);
  }

  @Patch(':id/questions/batch-scores')
  @ApiOperation({ summary: 'Batch update question scores' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Scores updated successfully' })
  batchUpdateQuestionScores(
    @Param('id') examId: string,
    @Body() body: { updates: { questionId: string; score: number }[] }
  ) {
    return this.examService.batchUpdateQuestionScores(examId, body.updates);
  }

  @Patch(':id/questions/batch-orders')
  @ApiOperation({ summary: 'Batch update question orders' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Orders updated successfully' })
  batchUpdateQuestionOrders(
    @Param('id') examId: string,
    @Body() body: { updates: { questionId: string; order: number }[] }
  ) {
    return this.examService.batchUpdateQuestionOrders(examId, body.updates);
  }

  @Post(':id/questions/batch-delete')
  @ApiOperation({ summary: 'Batch remove questions from exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        questionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of question IDs to remove',
        },
      },
      required: ['questionIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Questions removed successfully' })
  batchRemoveQuestions(@Param('id') examId: string, @Body() body: { questionIds: string[] }) {
    return this.examService.batchRemoveQuestions(examId, body.questionIds);
  }

  // 学生管理API
  @Post(':id/students')
  @ApiOperation({ summary: 'Add a student to exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({ type: CreateExamStudentDto })
  @ApiResponse({ status: 201, description: 'Student added successfully' })
  addStudent(@Param('id') examId: string, @Body() dto: CreateExamStudentDto) {
    return this.examService.addStudent(examId, dto);
  }

  @Post(':id/students/batch')
  @ApiOperation({ summary: 'Batch add students to exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({ type: BatchCreateExamStudentsDto })
  @ApiResponse({ status: 201, description: 'Students added successfully' })
  batchAddStudents(@Param('id') examId: string, @Body() dto: BatchCreateExamStudentsDto) {
    return this.examService.batchAddStudents(examId, dto);
  }

  @Post(':id/students/generate')
  @ApiOperation({ summary: 'Generate student accounts for exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: 'Number of accounts to generate' },
        prefix: { type: 'string', description: 'Username prefix', default: 'student' },
      },
      required: ['count'],
    },
  })
  @ApiResponse({ status: 201, description: 'Student accounts generated successfully' })
  generateStudentAccounts(
    @Param('id') examId: string,
    @Body() body: { count: number; prefix?: string }
  ) {
    return this.examService.generateStudentAccounts(examId, body.count, body.prefix);
  }

  @Post(':id/students/import-temporary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import temporary students for exam' })
  importTemporaryStudents(
    @Param('id') id: string,
    @Body() body: { students: { name: string }[]; customPassword?: string }
  ) {
    return this.examService.importTemporaryStudents(id, body.students, body.customPassword);
  }

  @Post(':id/students/import-from-class')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import students from class to exam' })
  importStudentsFromClass(
    @Param('id') id: string,
    @Body() body: { classId: string; studentIds: string[] }
  ) {
    return this.examService.importStudentsFromClass(id, body.classId, body.studentIds);
  }

  @Get(':id/students')
  @ApiOperation({ summary: 'Get exam students' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Students retrieved successfully' })
  getExamStudents(@Param('id') examId: string) {
    return this.examService.getExamStudents(examId);
  }

  @Put(':id/students/:studentId')
  @ApiOperation({ summary: 'Update exam student' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiBody({ type: CreateExamStudentDto })
  @ApiResponse({ status: 200, description: 'Student updated successfully' })
  updateExamStudent(
    @Param('id') examId: string,
    @Param('studentId') studentId: string,
    @Body() dto: Partial<CreateExamStudentDto>
  ) {
    return this.examService.updateExamStudent(examId, studentId, dto);
  }

  @Delete(':id/students/:studentId')
  @ApiOperation({ summary: 'Delete exam student' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'studentId', description: 'Student ID' })
  @ApiResponse({ status: 200, description: 'Student deleted successfully' })
  deleteExamStudent(@Param('id') examId: string, @Param('studentId') studentId: string) {
    return this.examService.deleteExamStudent(examId, studentId);
  }

  // 考试进行相关API
  @Get(':id/take')
  @ApiOperation({ summary: 'Get exam questions for taking exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Exam questions retrieved successfully' })
  getExamForTaking(@Param('id') examId: string) {
    return this.examService.getExamForTaking(examId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit exam answers' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answers: { type: 'object', description: 'Answers object with questionId as key' },
        examStudentId: { type: 'string', description: 'Exam student ID' },
      },
      required: ['answers', 'examStudentId'],
    },
  })
  @ApiResponse({ status: 201, description: 'Exam submitted successfully' })
  @UseGuards(ExamStudentGuard)
  async submitExam(
    @Param('id') examId: string,
    @Body() body: { answers: Record<string, any> },
    @CurrentExamStudent() student: any
  ) {
    // 异步处理提交，立即返回
    this.examService.submitExamAsync(examId, student.id, body.answers);
    return {
      message: '考试提交中，请等待评分完成',
      submissionId: `${examId}-${student.id}`,
    };
  }

  @Get(':id/submit-progress/:examStudentId')
  @ApiOperation({ summary: 'Get submission progress via SSE' })
  @UseGuards(ExamStudentGuard)
  async getSubmitProgress(
    @Param('id') examId: string,
    @Param('examStudentId') examStudentId: string,
    @CurrentExamStudent() student: any,
    @Res() res: Response
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Accel-Buffering', 'no');

    // 立即刷新头部，确保 SSE 连接建立
    res.flushHeaders?.();

    if (student?.id !== examStudentId) {
      res.status(403).end();
      return;
    }

    return this.examService.streamSubmissionProgress(examId, examStudentId, res);
  }

  @Get(':id/submission-status/:examStudentId')
  @ApiOperation({ summary: 'Check if student has submitted' })
  @UseGuards(ExamStudentGuard)
  checkSubmissionStatus(
    @Param('id') examId: string,
    @Param('examStudentId') examStudentId: string,
    @CurrentExamStudent() student: any
  ) {
    if (student?.id !== examStudentId) {
      throw new ForbiddenException();
    }
    return this.examService.checkSubmissionStatus(examId, examStudentId);
  }

  @Post(':id/save-answers')
  @ApiOperation({ summary: 'Save exam answers (auto-save)' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        answers: { type: 'object', description: 'Answers object with questionId as key' },
        examStudentId: { type: 'string', description: 'Exam student ID' },
      },
      required: ['answers', 'examStudentId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Answers saved successfully' })
  @UseGuards(ExamStudentGuard)
  saveAnswers(
    @Param('id') examId: string,
    @Body() body: { answers: Record<string, any> },
    @CurrentExamStudent() student: any
  ) {
    return this.examService.saveAnswers(examId, student.id, body.answers);
  }

  // 评分相关API
  @Get(':id/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get exam submissions for grading' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Submissions retrieved successfully' })
  getExamSubmissions(@Param('id') examId: string) {
    return this.examService.getExamSubmissions(examId);
  }

  @Get(':id/submissions/:submissionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get submission details' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  getSubmissionDetails(
    @Param('id') examId: string,
    @Param('submissionId') submissionId: string,
    @Request() req: any
  ) {
    return this.examService.getSubmissionDetails(examId, submissionId, req.user);
  }

  @Post(':id/submissions/:submissionId/grade')
  @ApiOperation({ summary: 'Grade a submission' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        scores: { type: 'object', description: 'Scores for each question' },
        totalScore: { type: 'number', description: 'Total score' },
        reviewerId: { type: 'string', description: 'Reviewer ID' },
        feedback: { type: 'string', description: 'Overall feedback' },
      },
      required: ['scores', 'totalScore'],
    },
  })
  @ApiResponse({ status: 200, description: 'Submission graded successfully' })
  gradeSubmission(
    @Param('id') examId: string,
    @Param('submissionId') submissionId: string,
    @Body()
    body: {
      scores: Record<string, number>;
      totalScore: number;
      reviewerId?: string;
      feedback?: string;
    }
  ) {
    return this.examService.gradeSubmission(
      submissionId,
      body.scores,
      body.totalScore,
      body.reviewerId,
      body.feedback
    );
  }

  @Post(':id/submissions/:submissionId/ai-grade')
  @ApiOperation({ summary: 'Get AI grading suggestions for subjective questions' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiParam({ name: 'submissionId', description: 'Submission ID' })
  @ApiResponse({ status: 200, description: 'AI grading suggestions retrieved' })
  getAIGradingSuggestions(
    @Param('id') examId: string,
    @Param('submissionId') submissionId: string
  ) {
    return this.examService.getAIGradingSuggestions(examId, submissionId);
  }

  @Post(':id/submissions/batch-approve')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Batch mark submissions as reviewed (confirm final scores)' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        submissionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of submission IDs to approve',
        },
      },
      required: ['submissionIds'],
    },
  })
  batchApproveSubmissions(
    @Param('id') examId: string,
    @Body() body: { submissionIds: string[] },
    @Request() req: any
  ) {
    return this.examService.batchApproveSubmissions(examId, body.submissionIds, req.user);
  }

  @Post(':id/submissions/batch-reset')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Batch reset submissions' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        submissionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of submission IDs to reset',
        },
      },
      required: ['submissionIds'],
    },
  })
  batchResetSubmissions(
    @Param('id') examId: string,
    @Body() body: { submissionIds: string[] },
    @Request() req: any
  ) {
    return this.examService.batchResetSubmissions(examId, body.submissionIds, req.user);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get exam analytics and statistics' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  getExamAnalytics(@Param('id') examId: string) {
    return this.examService.getExamAnalytics(examId);
  }

  @Get(':id/ai-report-stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate AI analysis report stream for exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  async generateAIReportStream(
    @Param('id') examId: string,
    @Query() query: any,
    @Request() req?: any,
    @Res() res?: any
  ) {
    const userId = req?.user?.id;

    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    try {
      // 从查询参数或缓存中获取数据
      await this.examService.generateAIReportStream(examId, null, userId, res);
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  @Get(':id/ai-report')
  @ApiOperation({ summary: 'Get saved AI analysis report for exam' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @ApiResponse({ status: 200, description: 'AI report retrieved successfully' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getSavedAIReport(@Param('id') examId: string, @Request() req: any) {
    return this.examService.getSavedAIReport(examId, req.user);
  }

  @Get(':id/export/progress')
  @ApiOperation({ summary: 'Export exam data progress stream' })
  @ApiParam({ name: 'id', description: 'Exam ID' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async exportExam(@Param('id') examId: string, @Query() query: any, @Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Some browsers/proxies may mis-detect encoding for SSE.
    // Writing UTF-8 BOM helps DevTools display Chinese correctly.
    res.write('\uFEFF');

    return this.examService.exportExam(examId, res, query);
  }

  @Get('download-export/:filename')
  @ApiOperation({ summary: 'Download exported exam file' })
  @ApiParam({ name: 'filename', description: 'Filename to download' })
  async downloadExport(@Param('filename') filename: string, @Res() res: Response) {
    return this.examService.downloadExport(filename, res);
  }
}
