import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SettingKey } from '../settings.service';
import { AIProvider } from '../settings.service';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Setting key', enum: SettingKey })
  @IsString()
  @IsEnum(SettingKey)
  key: SettingKey;

  @ApiProperty({ description: 'Setting value' })
  @IsString()
  value: string;
}

export { AIProvider };
