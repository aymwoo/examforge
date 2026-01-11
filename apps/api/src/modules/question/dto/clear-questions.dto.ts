import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ClearQuestionsDto {
  @ApiProperty({
    description: 'Confirmation string to avoid accidental wipe',
    example: 'CLEAR_ALL',
  })
  @IsString()
  confirm: string;
}
