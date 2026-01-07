# AGENTS.md — ExamForge (Monorepo) Agent Guide

This file is for agentic coding tools operating in this repo. Follow it strictly.

## Repo layout

- `apps/api/` — NestJS + TypeScript REST API
- `packages/*` — shared packages
- `web/` — Vite frontend (follow `/demo.html` UI style)

Feature modules: `apps/api/src/modules/<feature>/` (controller/service/dto/module together)
Shared code: `apps/api/src/common/`
Prisma schema: `apps/api/prisma/schema.prisma`

## Environment / prereqs

- Node: >= 18, pnpm: >= 8
- Install: `pnpm install`
- API env: `apps/api/.env` (do not commit)

Quick start: `pnpm dev` (API:3000, Web:5173)

## Build / lint / test commands

**Workspace-level:**

- `pnpm run build` - build everything
- `pnpm run lint` - lint everything
- `pnpm run lint:fix` - lint & auto-fix
- `pnpm run format` - Prettier format whole repo
- `pnpm run test` - run all tests

**API-only (recommended while working):**

- `pnpm run dev:api` - start API dev server
- `pnpm run build:api` - build API
- `pnpm --filter ./apps/api run lint`
- `pnpm --filter ./apps/api run format`

**Run a single unit test:**

```bash
pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts
pnpm --filter ./apps/api run test -- -t "should create question"
pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts -t "should create"
```

**Run a single e2e test:**

```bash
pnpm --filter ./apps/api run test:e2e -- test/app.e2e-spec.ts
pnpm --filter ./apps/api run test:e2e -- -t "health"
```

**Prisma:**

```bash
pnpm --filter ./apps/api run prisma:generate
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:studio
```

## Cursor / Copilot rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` exist
- If added later, mirror them here (higher priority than rest of this doc)

## Code style & conventions

### TypeScript & compiler settings

- TS strict mode enabled (`strict: true`, `noImplicitAny: true`)
- API tsconfig alias: `@/* -> src/*` — prefer `@/common/...` for shared code

### Formatting

- Single quotes, semicolons, trailing commas (es5), print width 100, tab width 2

### Imports

- `@nestjs/*` imports at top
- Absolute alias imports for shared code inside API: `import { PaginationDto } from '@/common/dto/pagination.dto';`
- Relative imports OK within a feature module

### NestJS module organization (IMPORTANT)

- Feature-based folders (not layer-based): `apps/api/src/modules/<feature>/`
  - `<feature>.controller.ts` — routing only
  - `<feature>.service.ts` — business logic + DB
  - `<feature>.module.ts` — Nest module wiring
  - `dto/*.dto.ts` — request/response shapes

### Validation & DTOs

- Global ValidationPipe enabled (`whitelist`, `forbidNonWhitelisted`, `transform`)
- All controller inputs must use DTOs with `class-validator` decorators
- Prefer `@IsOptional()` + specific type validator over untyped fields

### Naming

- Files: kebab-case | Classes: PascalCase | Functions/methods: camelCase | DB tables: snake_case
- Avoid `I*` interface prefix

### Error handling

- Use Nest exceptions: `NotFoundException`, `BadRequestException`, `UnprocessableEntityException`
- Check existence before update/delete and throw early

### Database access (Prisma)

- Controllers MUST NOT touch Prisma directly
- Services inject `PrismaService` and perform DB operations
- Use transactions for multi-step writes that must be atomic

### Known codebase debt (don't cargo-cult)

- ESLint forbids `any` but a few `as any` exist for Prisma enums/sheet parsing
- Prefer fixing type correctness when touching these areas

## Frontend UI style (web/)

See `/demo.html` as source of truth. Key requirements:

- Use shared Tailwind preset: `packages/config/tailwind.preset.js`
- Apply base styles: `bg-slatebg text-ink-900 antialiased`
- Required: focus-visible ring, prefers-reduced-motion support
- Standardize on card/panel/button recipes from demo.html

## Project notes

- Swagger decorators (`@ApiTags`, `@ApiOperation`, etc.) are used; keep API docs consistent
- Do not add new dependencies without explicit reason and approval
