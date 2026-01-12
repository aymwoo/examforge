import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('classes')
@Controller('classes')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '创建班级' })
  @ApiResponse({ status: 201, description: '班级创建成功' })
  @ApiResponse({ status: 409, description: '班级代码已存在' })
  create(@Body() createClassDto: CreateClassDto, @Request() req) {
    return this.classService.create(createClassDto, req.user.id);
  }

  @Get()
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '获取班级列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  findAll(@Request() req) {
    return this.classService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '获取班级详情' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '班级不存在' })
  findOne(@Param('id') id: string, @Request() req) {
    return this.classService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '更新班级信息' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '班级不存在' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto, @Request() req) {
    return this.classService.update(id, updateClassDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '删除班级' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '班级不存在' })
  remove(@Param('id') id: string, @Request() req) {
    return this.classService.remove(id, req.user.id, req.user.role);
  }

  @Get(':id/students')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '获取班级学生列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  getStudents(@Param('id') id: string, @Request() req) {
    return this.classService.getStudents(id, req.user.id, req.user.role);
  }

  @Post(':id/students')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '添加学生到班级' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 201, description: '学生添加成功' })
  @ApiResponse({ status: 409, description: '学号已存在' })
  addStudent(@Param('id') id: string, @Body() createStudentDto: CreateStudentDto, @Request() req) {
    return this.classService.addStudent(id, createStudentDto, req.user.id, req.user.role);
  }

  @Delete(':id/students/:studentId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '从班级移除学生' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiParam({ name: 'studentId', description: '学号' })
  @ApiResponse({ status: 200, description: '学生移除成功' })
  @ApiResponse({ status: 404, description: '学生不存在' })
  removeStudent(@Param('id') id: string, @Param('studentId') studentId: string, @Request() req) {
    return this.classService.removeStudent(id, studentId, req.user.id, req.user.role);
  }

  @Post(':id/students/import')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '批量导入学生' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 201, description: '导入完成' })
  @HttpCode(HttpStatus.CREATED)
  importStudents(@Param('id') id: string, @Body() students: CreateStudentDto[], @Request() req) {
    return this.classService.importStudents(id, students, req.user.id, req.user.role);
  }

  @Post(':id/students/reset-password')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '重置学生密码' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiResponse({ status: 200, description: '重置完成' })
  resetStudentPasswords(
    @Param('id') id: string, 
    @Body() body: { studentIds: string[], newPassword: string }, 
    @Request() req
  ) {
    return this.classService.resetStudentPasswords(id, body.studentIds, body.newPassword, req.user.id, req.user.role);
  }

  @Patch(':id/students/:studentId')
  @Roles('TEACHER', 'ADMIN')
  @ApiOperation({ summary: '更新学生信息' })
  @ApiParam({ name: 'id', description: '班级ID' })
  @ApiParam({ name: 'studentId', description: '学号' })
  @ApiResponse({ status: 200, description: '更新成功' })
  updateStudent(
    @Param('id') id: string, 
    @Param('studentId') studentId: string, 
    @Body() updateStudentDto: Partial<CreateStudentDto>, 
    @Request() req
  ) {
    return this.classService.updateStudent(id, studentId, updateStudentDto, req.user.id, req.user.role);
  }
}
