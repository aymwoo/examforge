import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SettingsService, SystemSettings, AIModelConfig } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings(): Promise<SystemSettings> {
    return this.settingsService.getSettings();
  }

  @Get('prompt')
  @ApiOperation({ summary: 'Get AI prompt template' })
  @ApiResponse({ status: 200, description: 'Prompt template retrieved successfully' })
  async getPrompt(): Promise<{ template: string }> {
    const template = await this.settingsService.getPromptTemplate();
    return { template };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get available AI providers and models' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  async getProviders(): Promise<AIModelConfig[]> {
    return this.settingsService.getAvailableProviders();
  }

  @Put()
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiBody({ type: UpdateSettingDto })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  async updateSetting(@Body() dto: UpdateSettingDto) {
    await this.settingsService.updateSetting(dto.key, dto.value);
    return { success: true };
  }
}
