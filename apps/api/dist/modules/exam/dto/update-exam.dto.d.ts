import { CreateExamDto } from './create-exam.dto';
declare const UpdateExamDto_base: import("@nestjs/common").Type<Partial<CreateExamDto>>;
export declare class UpdateExamDto extends UpdateExamDto_base {
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}
export {};
