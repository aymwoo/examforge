import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class BatchUpdateTagsDto {
  @ApiProperty({
    type: [String],
    description: 'Question IDs to update',
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  ids: string[];

  @ApiProperty({
    type: [String],
    description: 'New tags to set',
  })
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}
