import { PartialType } from '@nestjs/swagger';
import { CreateQuestionDto } from './create-question.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { QuestionStatus } from '@/common/enums/question.enum';

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiPropertyOptional({ enum: QuestionStatus, description: 'Question status' })
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}
