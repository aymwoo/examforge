import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({ required: false, description: 'Start time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ required: false, description: 'End time (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
