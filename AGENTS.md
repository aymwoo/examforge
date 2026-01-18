# AGENTS.md — ExamForge (Monorepo) Agent Guide

⚠️ Rules:

- Do NOT run commands requiring user interaction; all commands must be non-interactive
- If a command may block, rewrite it to be non-interactive
- If unavoidable, output the command only, do not execute

## Repo Layout

- `apps/api/` — NestJS + TypeScript REST API (Jest unit + e2e tests)
- `web/` — Vite + React + Tailwind frontend (UI style: `demo.html`)
- `packages/shared-types/` — Shared TypeScript types across apps
- `packages/config/` — Shared Prettier/Tailwind preset
  API code: `apps/api/src/` (features in `src/modules/`, shared in `src/common/`).

## Environment

- Node: `>=18`
- npm: `>=8` (uses npm workspaces)
- Install: `npm install`
- API env: `apps/api/.env` (never commit)

## Commands

### Workspace-level (root)

| Command                                   | Description                           |
| ----------------------------------------- | ------------------------------------- |
| `npm run dev`                             | Run API + Web dev servers in parallel |
| `npm run build`                           | Build all packages                    |
| `npm run lint` / `npm run lint:fix`       | Lint all packages                     |
| `npm run format` / `npm run format:check` | Prettier write/check                  |
| `npm run test`                            | Run workspace tests                   |
| `npm run test:e2e`                        | Run API e2e tests                     |

### Package-specific

| Package      | Commands                                                                                           |
| ------------ | -------------------------------------------------------------------------------------------------- |
| API          | `npm run dev:api`, `npm run build:api`, `npm run test -w apps/api`, `npm run test:e2e -w apps/api` |
| Web          | `npm run dev:web`, `npm run build:web`, `npm run lint -w web`                                      |
| Shared types | `npm run build -w packages/shared-types`, `npm run watch -w packages/shared-types`                 |

### Single test (API - Jest)

```bash
npm run test -w apps/api -- src/modules/question/question.service.spec.ts
npm run test -w apps/api -- -t "should create question"
npm run test:watch -w apps/api
cd apps/api && npm test -- <path> -t <pattern>
```

### Single e2e test (API - Jest)

```bash
npm run test:e2e -w apps/api -- test/app.e2e-spec.ts
npm run test:e2e -w apps/api -- -t "health"
```

### Prisma (API)

```bash
npm run prisma:generate -w apps/api   # Regenerate client after schema changes
npm run prisma:migrate -w apps/api    # Development migrations (may reset sqlite data)
npm run prisma:studio -w apps/api     # GUI database viewer
npx prisma migrate deploy -w apps/api # Production migrations (safe for sqlite data)
```

## Cursor / Copilot Rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` exist
- If added later, those rules override this file

## Code Style

### TypeScript

| Setting                              | API                     | Web    |
| ------------------------------------ | ----------------------- | ------ |
| `strict`                             | `false` (intentionally) | `true` |
| `@typescript-eslint/no-explicit-any` | `off` (but avoid `any`) | `off`  |

- Prefer explicit domain types and DTOs over ad-hoc object shapes
- Path aliases:
  - API: `@/* -> apps/api/src/*`
  - Web: `@/* -> web/src/*`
  - Shared: `@examforge/shared-types -> packages/shared-types/src`

### Formatting (Prettier)

`printWidth: 100`, `tabWidth: 2`, `singleQuote: true`, `semi: true`, `trailingComma: "es5"`, `endOfLine: "lf"`.
Run `npm run format` to format code; avoid manual formatting.

### Linting

- API: ESLint with TypeScript parser; `@typescript-eslint/no-explicit-any` errors on `any`
- Web: ESLint flat config with React plugins
- Keep lint fixes scoped to touched files

### Imports

- Order: framework → third-party → internal alias → relative
- API: keep `@nestjs/*` imports at the top
- Use alias imports for cross-module code: `@/common/...`, `@/modules/...`

### Naming Conventions

| Type                | Convention                   | Example                  |
| ------------------- | ---------------------------- | ------------------------ |
| Files/folders       | `kebab-case`                 | `exam-service.ts`        |
| Classes/providers   | `PascalCase`                 | `ExamController`         |
| Functions/variables | `camelCase`                  | `handleSubmissionSelect` |
| Interfaces          | `PascalCase` (no `I` prefix) | `ExamListResponse`       |
| Constants           | `SCREAMING_SNAKE_CASE`       | `MAX_RETRY_COUNT`        |

### Backend Architecture (NestJS)

- Feature folders: `apps/api/src/modules/<feature>/`
- Structure per module:
  - `<feature>.controller.ts` — routing only; no Prisma, no business logic
  - `<feature>.service.ts` — business logic + DB access via injected `PrismaService`
  - `dto/*.dto.ts` — request/response DTOs with `class-validator` decorators
  - `<feature>.spec.ts` — unit tests (co-located)

### Error Handling

- Use NestJS exceptions (`BadRequestException`, `NotFoundException`, `ConflictException`, etc.)
- Fail fast: check existence before update/delete
- Frontend: handle errors inline with toast notifications; avoid page redirects on load errors

### Database / Prisma

- Controllers MUST NOT touch Prisma directly
- Use transactions for multi-step writes: `prisma.$transaction([...])`
- After schema changes: `npm run prisma:generate -w apps/api`

### Frontend UI

- UI reference: `demo.html` in repo root; use shared Tailwind preset
- Accessibility: ensure `focus-visible` rings and `prefers-reduced-motion` support
- Structure: `src/features/`, `src/components/`, `src/services/`, `src/pages/`, `src/types/`

### Testing Patterns

| Type | Location                      | Pattern                        |
| ---- | ----------------------------- | ------------------------------ |
| Unit | `*.spec.ts` co-located        | `describe` blocks; `it`/`test` |
| E2E  | `apps/api/test/*.e2e-spec.ts` | Full API integration           |

### Environment Variables

- API: `apps/api/.env` (local dev only; never commit)
- Use `@nestjs/config` with `ConfigService` and validation schemas
- Document required env vars in `.env.example`

## Scope

- More-specific `AGENTS.md` files (if present in subdirectories) override this file

## Notes

- Root `tsconfig.json` includes `@examforge/web -> apps/web/src` but frontend lives in `web/src`
- Swagger decorators are used on API routes; keep docs consistent
- Web: Vite + React + Tailwind; API: NestJS + Prisma + SQLite (dev) / PostgreSQL (prod)
