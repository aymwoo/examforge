import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from '../settings/settings.service';

function getDatabaseUrlHint(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    return 'default';
  }
  return databaseUrl.split('/').pop() || 'default';
}

function getBaseUrlHost(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    return url.host;
  } catch {
    return '';
  }
}

@ApiTags('debug')
@Controller('debug')
export class DebugController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('instance')
  @ApiOperation({
    summary: 'Return API instance diagnostics (no secrets)',
    description:
      'Helps verify the frontend and curl hit the same API/DB instance. Does not include secrets like API keys.',
  })
  @ApiResponse({ status: 200, description: 'Instance diagnostics' })
  async getInstanceInfo() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    const settings = await this.settingsService.getSettings();

    const databaseUrl = process.env.DATABASE_URL;
    const databaseUrlHint = getDatabaseUrlHint(databaseUrl);

    return {
      timestamp: new Date().toISOString(),
      processId: process.pid,
      instanceHint: databaseUrlHint,
      databaseUrlHint,
      ai: {
        provider: settings.aiProvider,
        baseUrlHost: getBaseUrlHost(settings.aiBaseUrl),
        model: settings.aiModel,
        hasApiKey: Boolean(settings.aiApiKey),
      },
    };
  }
}
