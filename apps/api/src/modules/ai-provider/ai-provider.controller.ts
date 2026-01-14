import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AIProviderService } from './ai-provider.service';
import { CreateAIProviderDto } from './dto/create-ai-provider.dto';
import { UpdateAIProviderDto } from './dto/update-ai-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ai-providers')
@Controller('ai-providers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIProviderController {
  constructor(private readonly aiProviderService: AIProviderService) {}

  @Post()
  @ApiOperation({ summary: 'Create AI Provider' })
  create(@Body() createDto: CreateAIProviderDto, @Request() req: any) {
    return this.aiProviderService.create(createDto, req.user.id, req.user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Get all AI Providers' })
  findAll(@Request() req: any) {
    return this.aiProviderService.findAll(req.user.id, req.user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get AI Provider by ID' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update AI Provider' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAIProviderDto, @Request() req: any) {
    return this.aiProviderService.update(id, updateDto, req.user.id, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete AI Provider' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.remove(id, req.user.id, req.user.role);
  }

  @Post(':id/set-default')
  @ApiOperation({ summary: 'Set AI Provider as system default' })
  @ApiResponse({ status: 200, description: 'Provider set as default successfully' })
  @ApiResponse({ status: 403, description: 'Only ADMIN can set default provider' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  setDefault(@Param('id') id: string, @Request() req: any) {
    return this.aiProviderService.setDefault(id, req.user.id, req.user.role);
  }
}
