import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SettingKey {
  AI_PROVIDER = 'AI_PROVIDER',
  AI_API_KEY = 'AI_API_KEY',
  AI_BASE_URL = 'AI_BASE_URL',
  AI_MODEL = 'AI_MODEL',
  PROMPT_TEMPLATE = 'PROMPT_TEMPLATE',
}

export class UpdateSettingDto {
  @ApiProperty({ description: 'Setting key' })
  @IsString()
  @IsEnum(SettingKey)
  key: SettingKey;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value: string;
}
