import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateExamStudentDto } from './create-exam-student.dto';

export class BatchCreateExamStudentsDto {
  @ApiProperty({ type: [CreateExamStudentDto], description: 'Array of students to create' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExamStudentDto)
  students: CreateExamStudentDto[];
}
