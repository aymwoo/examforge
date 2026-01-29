import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ description: '学号' })
  @IsString()
  @IsNotEmpty()
  studentId: string;

  @ApiProperty({ description: '学生姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: '性别' })
  @IsString()
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: '班级ID' })
  @IsString()
  @IsOptional()
  classId?: string;

  @ApiPropertyOptional({ description: '班级名称（用于自动创建或匹配班级）' })
  @IsString()
  @IsOptional()
  className?: string;

  @ApiPropertyOptional({ description: '班级代码（用于匹配已有班级）' })
  @IsString()
  @IsOptional()
  classCode?: string;
}
