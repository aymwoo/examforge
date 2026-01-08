import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ExamAccountMode {
  PERMANENT = 'PERMANENT',
  TEMPORARY_IMPORT = 'TEMPORARY_IMPORT',
  TEMPORARY_REGISTER = 'TEMPORARY_REGISTER'
}

export class CreateExamDto {
  @ApiProperty({ description: 'Exam title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ required: false, description: 'Exam description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Exam duration in minutes' })
  @IsInt()
  @Min(1)
  duration: number;

  @ApiProperty({ required: false, description: 'Total score', default: 100 })
  @IsInt()
  @Min(1)
  @IsOptional()
  totalScore?: number;

  @ApiProperty({ 
    required: false, 
    description: 'Account modes for exam (array)',
    type: [String],
    enum: ExamAccountMode,
    default: [ExamAccountMode.TEMPORARY_IMPORT]
  })
  @IsArray()
  @IsOptional()
  accountModes?: ExamAccountMode[];

  @ApiProperty({ required: false, description: 'Start time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false, description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
