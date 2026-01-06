# AGENTS.md - ExamForge Development Guide

> Guidelines for AI coding agents working on this Monorepo codebase.

## Project Overview

ExamForge is an AI-driven multi-source question bank and online examination system using **Monorepo** architecture.
- **Backend**: Node.js + TypeScript + NestJS
- **Frontend**: React / Vue (in apps/web)
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **API Style**: REST
- **Package Manager**: pnpm workspace

---

## Build / Lint / Test Commands

### Root Level Commands

```bash
# Install all dependencies
pnpm install

# Run in specific app
pnpm --filter @examforge/api start:dev
pnpm --filter @examforge/web dev

# Build all apps
pnpm build

# Run all tests
pnpm test
```

### Backend (apps/api) Commands

```bash
# Navigate to api directory or use filter
cd apps/api
# OR: pnpm --filter @examforge/api <command>

# Development
pnpm run start:dev          # Start with hot-reload

# Build
pnpm run build              # Compile TypeScript

# Linting & Formatting
pnpm run lint               # ESLint check
pnpm run lint:fix           # ESLint auto-fix
pnpm run format             # Prettier format

# Testing
pnpm run test               # Run all unit tests
pnpm run test:cov           # Coverage report
pnpm run test:e2e           # End-to-end tests

# Run a single test file
pnpm run test -- --testPathPattern="question.service"
pnpm run test -- src/modules/question/question.service.spec.ts

# Run a single test by name
pnpm run test -- -t "should create a question"

# Database
pnpm run prisma:generate    # Generate Prisma client
pnpm run prisma:migrate     # Run migrations (dev)
pnpm run prisma:studio      # Open Prisma Studio GUI
```

---

## Monorepo Project Structure

```
examforge/
├── apps/                     # 应用层（真正运行的）
│   ├── api/                  # 后端 API（Node.js + NestJS）
│   │   ├── src/
│   │   │   ├── modules/      # 业务模块（强烈推荐）
│   │   │   │   ├── question/   # Question bank CRUD
│   │   │   │   ├── exam/       # Exam management
│   │   │   │   ├── import/     # File import (Excel/CSV/PDF)
│   │   │   │   ├── submission/ # Exam submissions
│   │   │   │   └── auth/       # Authentication & authorization
│   │   │   ├── common/       # 通用模块
│   │   │   │   ├── dto/       # Request/Response DTOs
│   │   │   │   ├── errors/    # Custom exceptions
│   │   │   │   ├── guards/    # Auth guards
│   │   │   │   └── utils/     # Helper functions
│   │   │   ├── main.ts       # Application entry point
│   │   │   └── app.module.ts  # Root module
│   │   ├── prisma/
│   │   │   └── schema.prisma  # Database schema
│   │   ├── test/              # E2E tests
│   │   └── package.json
│   │
│   └── web/                  # 前端 Web（React / Vue）
│       ├── src/
│       │   ├── pages/        # 路由页面
│       │   ├── components/   # 通用组件
│       │   ├── features/     # 业务功能模块（推荐）
│       │   │   ├── question/
│       │   │   ├── exam/
│       │   │   └── import/
│       │   ├── services/     # API 调用封装
│       │   ├── hooks/        # React hooks / Vue composables
│       │   ├── types/        # 前端类型
│       │   └── main.tsx
│       └── package.json
│
├── packages/                 # 共享代码（非常重要）
│   ├── shared-types/         # 前后端共享 DTO / Enum / Types
│   │   ├── src/
│   │   │   ├── question.ts
│   │   │   ├── exam.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/               # 共享配置（eslint / tsconfig / prettier）
│       ├── eslint.base.js
│       ├── tsconfig.base.json
│       └── prettier.config.js
│
├── services/                 # 可选：独立微服务
│   ├── ocr-service/          # OCR 服务（Python / Node）
│   └── llm-service/          # 大模型解析服务
│
├── scripts/                  # 构建 / 初始化 / 导入脚本
│   ├── import-excel.ts
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   └── docker-compose.yml
│
├── package.json              # 根 package.json（workspace）
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── tsconfig.json
└── README.md
```

---

## Architecture Principles

### Module Organization

1. **Business Features** (`apps/*/src/modules/` or `apps/*/src/features/`)
   - Each feature should be self-contained (controller/service/dto/components)
   - Use feature-based organization, not layer-based
   - Example: `question/` contains all question-related code

2. **Shared Code** (`packages/`)
   - **shared-types**: All DTOs, enums, interfaces shared between frontend and backend
   - **config**: ESLint, TypeScript, Prettier configs to ensure consistency

3. **Independent Services** (`services/`)
   - OCR and LLM services can be deployed separately
   - Communicate via HTTP/gRPC

### Working with Monorepo

```bash
# When working on backend only
cd apps/api
pnpm run start:dev

# When working on frontend only
cd apps/web
pnpm run dev

# When working on shared types (affects both frontend and backend)
cd packages/shared-types
pnpm build  # Rebuilds shared package
pnpm --filter @examforge/api start:dev  # Restart backend to pick up changes
pnpm --filter @examforge/web dev         # Restart frontend to pick up changes
```

### Import Paths

```typescript
// Backend (apps/api)
import { QuestionType } from '@examforge/shared-types';  // From packages/shared-types
import { PrismaService } from '../common/prisma/prisma.service';

// Frontend (apps/web)
import { QuestionType, CreateQuestionDto } from '@examforge/shared-types';
import { api } from '@/services/api';
```

---

## Code Style Guidelines

### TypeScript
- Strict mode enabled, no implicit `any`
- Use `interface` for object shapes, `type` for unions/intersections
- Import shared types from `@examforge/shared-types`

### Imports Order
1. Node.js built-ins
2. External packages (alphabetized)
3. Internal packages (e.g., `@examforge/shared-types`)
4. Internal modules (`@/` alias for local paths)
5. Relative imports (same module)

### Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `question.service.ts` |
| Classes | PascalCase | `QuestionService` |
| Interfaces | PascalCase (no `I` prefix) | `Question` |
| Functions | camelCase | `findById()` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |
| DB tables | snake_case | `exam_questions` |

### Formatting (Prettier)
- Print width: 100, Tab: 2 spaces, Semicolons: always, Single quotes, Trailing commas: ES5

### NestJS Patterns
- **Controllers**: Thin, delegate to services
- **Services**: All business logic, inject PrismaService
- **DTOs**: Use class-validator decorators for all inputs, import from shared-types when possible

```typescript
@Controller('questions')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @Post()
  create(@Body() dto: CreateQuestionDto): Promise<Question> {
    return this.questionService.create(dto);
  }
}
```

### Error Handling
```typescript
// Use NestJS built-in exceptions
throw new NotFoundException(`Question #${id} not found`);
throw new BadRequestException('Invalid file format');

// Always check existence before returning
async findById(id: string): Promise<Question> {
  const question = await this.prisma.question.findUnique({ where: { id } });
  if (!question) throw new NotFoundException(`Question #${id} not found`);
  return question;
}
```

### Testing
- Unit tests: `*.spec.ts` alongside source files in apps/api/src
- E2E tests: `test/*.e2e-spec.ts` in apps/api/test
- Frontend tests: `*.spec.ts` or `*.test.tsx` in apps/web/src
- Minimum: one happy path + one error case per feature

```typescript
describe('QuestionService', () => {
  it('should create a question', async () => {
    const dto = { content: 'Test?', type: QuestionType.SINGLE_CHOICE };
    const result = await service.create(dto);
    expect(result.content).toBe(dto.content);
  });
});
```

---

## API Response Format

```typescript
// Success: { "data": {...}, "meta": { "total": 100, "page": 1 } }
// Error:   { "statusCode": 404, "message": "Not found", "error": "Not Found" }
```

---

## Environment Variables

### Backend (apps/api/.env)

```bash
DATABASE_URL="file:./dev.db"    # SQLite dev / PostgreSQL prod
LLM_PROVIDER="qwen"             # qwen | doubao | custom
LLM_API_KEY="sk-xxx"
OCR_ENGINE="paddleocr"          # paddleocr | tesseract
PORT=3000
NODE_ENV="development"
```

### Frontend (apps/web/.env)

```bash
VITE_API_URL="http://localhost:3000"
```

---

## Key Reminders for AI Agents

1. **Use workspace commands**: `pnpm --filter <package> <command>` to run commands in specific packages
2. **Shared types**: Always check `packages/shared-types` before creating new DTOs/interfaces
3. **Rebuild after shared changes**: When changing `shared-types`, rebuild dependent packages
4. **Run tests after changes**: `pnpm run test -- --testPathPattern="<module>"`
5. **Validate with lint**: `pnpm run lint` before committing
6. **Use DTOs for all inputs**: Never trust raw request data
7. **Handle errors explicitly**: Use appropriate HTTP exceptions
8. **Keep controllers thin**: Business logic belongs in services
9. **Write tests for new features**: Minimum one happy path + one error case
10. **Use transactions for multi-step DB operations**
11. **Log meaningful context**: Use NestJS Logger with proper levels
