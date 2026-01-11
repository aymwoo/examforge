import { IsString, IsArray, IsInt, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddQuestionDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  questionId: string;

  @ApiProperty({ description: 'Question order in exam' })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ required: false, description: 'Question score', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  score?: number;
}
