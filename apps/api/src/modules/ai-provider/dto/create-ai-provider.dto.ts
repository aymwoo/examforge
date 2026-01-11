import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAIProviderDto {
  @ApiProperty({ description: 'Provider name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'API Key' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Base URL', required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ description: 'Model name' })
  @IsString()
  model: string;

  @ApiProperty({ description: 'Is global provider', default: false })
  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @ApiProperty({ description: 'Is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
