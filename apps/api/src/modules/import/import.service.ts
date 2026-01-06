import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuestionDto } from '../question/dto/create-question.dto';
import { QuestionType, QuestionStatus } from '@/common/enums/question.enum';

export interface ImportResult {
  success: number;
  failed: number;
  errors: { row: number; message: string }[];
}

@Injectable()
export class ImportService {
  constructor(private readonly prisma: PrismaService) {}

  async importFromExcel(buffer: Buffer): Promise<ImportResult> {
    const workbook = XLSX.read(buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      throw new BadRequestException('No data found in Excel file');
    }

    const result: ImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNum = i + 2;

      try {
        const dto = this.mapRowToDto(row);
        await this.prisma.question.create({
          data: {
            content: dto.content,
            type: dto.type as any,
            options: dto.options ? JSON.stringify(dto.options) : null,
            answer: dto.answer,
            explanation: dto.explanation,
            tags: dto.tags ? JSON.stringify(dto.tags) : '[]',
            difficulty: dto.difficulty || 1,
            status: QuestionStatus.DRAFT,
            knowledgePoint: dto.knowledgePoint,
          },
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          row: rowNum,
          message: error.message || 'Unknown error',
        });
      }
    }

    return result;
  }

  private mapRowToDto(row: any): CreateQuestionDto {
    const content = row['题干'] || row['content'] || row['Content'] || '';
    const typeStr = row['题型'] || row['type'] || row['Type'] || 'SINGLE_CHOICE';
    const answer = row['答案'] || row['answer'] || row['Answer'] || '';

    if (!content) {
      throw new BadRequestException('Question content is required');
    }

    const typeMap: Record<string, QuestionType> = {
      '单选题': QuestionType.SINGLE_CHOICE,
      'single': QuestionType.SINGLE_CHOICE,
      'single_choice': QuestionType.SINGLE_CHOICE,
      'SINGLE_CHOICE': QuestionType.SINGLE_CHOICE,
      '多选题': QuestionType.MULTIPLE_CHOICE,
      'multiple': QuestionType.MULTIPLE_CHOICE,
      'multiple_choice': QuestionType.MULTIPLE_CHOICE,
      'MULTIPLE_CHOICE': QuestionType.MULTIPLE_CHOICE,
      '判断题': QuestionType.TRUE_FALSE,
      'true_false': QuestionType.TRUE_FALSE,
      'TRUE_FALSE': QuestionType.TRUE_FALSE,
      '填空题': QuestionType.FILL_BLANK,
      'fill_blank': QuestionType.FILL_BLANK,
      'FILL_BLANK': QuestionType.FILL_BLANK,
      '简答题': QuestionType.ESSAY,
      'essay': QuestionType.ESSAY,
      'ESSAY': QuestionType.ESSAY,
    };

    const type = typeMap[typeStr.toLowerCase()] || QuestionType.SINGLE_CHOICE;

    const dto: CreateQuestionDto = {
      content,
      type,
      answer: answer || undefined,
    };

    if (row['选项'] || row['options'] || row['Options']) {
      const optionsStr = row['选项'] || row['options'] || row['Options'];
      const options = this.parseOptions(optionsStr);
      if (options.length > 0) {
        dto.options = options;
      }
    }

    if (row['解析'] || row['explanation'] || row['Explanation']) {
      dto.explanation = row['解析'] || row['explanation'] || row['Explanation'];
    }

    if (row['标签'] || row['tags'] || row['Tags']) {
      const tagsStr = row['标签'] || row['tags'] || row['Tags'];
      dto.tags = Array.isArray(tagsStr) ? tagsStr : tagsStr.toString().split(',').map((t: string) => t.trim());
    }

    if (row['难度'] || row['difficulty'] || row['Difficulty']) {
      const difficulty = parseInt(row['难度'] || row['difficulty'] || row['Difficulty']);
      if (!isNaN(difficulty) && difficulty >= 1 && difficulty <= 5) {
        dto.difficulty = difficulty;
      }
    }

    if (row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint']) {
      dto.knowledgePoint = row['知识点'] || row['knowledgePoint'] || row['KnowledgePoint'];
    }

    return dto;
  }

  private parseOptions(optionsStr: string | any): any[] {
    if (Array.isArray(optionsStr)) {
      return optionsStr.map((opt, idx) => ({
        label: String.fromCharCode(65 + idx),
        content: opt,
      }));
    }

    if (typeof optionsStr === 'string') {
      const parts = optionsStr.split(/[,;|]/).map(s => s.trim());
      return parts.map((opt, idx) => ({
        label: String.fromCharCode(65 + idx),
        content: opt,
      }));
    }

    return [];
  }
}
