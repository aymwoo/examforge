import { Controller, Get, Put, Delete, Body, Query, Req, UseGuards, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService, SystemSettings, AIModelConfig } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('settings')
@Controller('settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSettings(): Promise<SystemSettings> {
    return this.settingsService.getSettings();
  }

  @Get('user')
  @ApiOperation({ summary: 'Get user-specific settings' })
  @ApiResponse({ status: 200, description: 'User settings retrieved successfully' })
  async getUserSettings(@Req() req: any): Promise<SystemSettings> {
    return this.settingsService.getUserSettings(req.user.id);
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
  async getProviders(@Req() req: any): Promise<AIModelConfig[]> {
    return this.settingsService.getAvailableProviders(req.user.id, req.user.role);
  }

  @Get('json-structure')
  @ApiOperation({ summary: 'Get JSON structure template' })
  @ApiResponse({ status: 200, description: 'JSON structure template retrieved successfully' })
  async getJsonStructure(): Promise<{ template: string }> {
    const template = this.settingsService.getJsonStructureTemplate();
    return { template };
  }

  @Get('default-provider')
  @ApiOperation({ summary: 'Get default AI provider ID' })
  @ApiResponse({ status: 200, description: 'Default provider ID retrieved successfully' })
  async getDefaultProvider(): Promise<{ defaultProviderId: string }> {
    const defaultProviderId = await this.settingsService.getDefaultProviderId();
    return { defaultProviderId };
  }

  @Get('active-ai-provider')
  @ApiOperation({ summary: 'Get the active AI provider that will be used for operations' })
  @ApiResponse({ status: 200, description: 'Active AI provider retrieved successfully' })
  async getActiveAIProvider(@Req() req: any): Promise<{ provider: any }> {
    const provider = await this.settingsService.getActiveAIProvider(req.user.id);
    return { provider };
  }

  @Put()
  @ApiOperation({ summary: 'Update a system setting' })
  @ApiBody({ type: UpdateSettingDto })
  @ApiResponse({ status: 200, description: 'Setting updated successfully' })
  async updateSetting(@Body() dto: UpdateSettingDto) {
    await this.settingsService.updateSetting(dto.key, dto.value);
    return { success: true };
  }

  @Put('user')
  @ApiOperation({ summary: 'Update a user setting' })
  @ApiBody({ type: UpdateSettingDto })
  @ApiResponse({ status: 200, description: 'User setting updated successfully' })
  async updateUserSetting(@Req() req: any, @Body() dto: UpdateSettingDto) {
    await this.settingsService.updateUserSetting(req.user.id, dto.key, dto.value);
    return { success: true };
  }

  @Post('default-prompt-template')
  @ApiOperation({ summary: 'Get default prompt template by type' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateType: {
          type: 'string',
          enum: ['PROMPT_TEMPLATE', 'GRADING_PROMPT_TEMPLATE', 'ANALYSIS_PROMPT_TEMPLATE', 'STUDENT_AI_ANALYSIS_PROMPT_TEMPLATE'],
          description: 'Template type to get default value for'
        }
      },
      required: ['templateType']
    }
  })
  @ApiResponse({ status: 200, description: 'Default prompt template retrieved successfully' })
  async getDefaultPromptTemplate(@Req() req: any, @Body() body: { templateType: string }) {
    const { templateType } = body;
    const template = await this.settingsService.getDefaultPromptTemplateByType(templateType);
    return { template };
  }

  @Delete('user')
  @ApiOperation({ summary: 'Delete a user setting' })
  @ApiResponse({ status: 200, description: 'User setting deleted successfully' })
  async deleteUserSetting(@Req() req: any, @Query('key') key: string) {
    await this.settingsService.deleteUserSetting(req.user.id, key);
    return { success: true };
  }
}
