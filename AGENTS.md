# AGENTS.md — ExamForge (Monorepo) Agent Guide

This file is for agentic coding tools operating in this repo. Follow it strictly.

## Repo layout

- `apps/api/` — NestJS + TypeScript REST API
- `packages/*` — shared packages (some stubs)
- `apps/web` / `web` — present but not the primary focus yet

Key folders:

- Feature modules live in `apps/api/src/modules/<feature>/` (meaning: controller/service/dto/module in one folder)
- Shared DTOs and enums live in `apps/api/src/common/`
- Prisma schema: `apps/api/prisma/schema.prisma`

## Environment / prereqs

- Node: >= 18 (repo also tested locally with Node v24)
- pnpm: >= 8 (repo uses pnpm 10.x)

Install:

```bash
pnpm install
```

API env file (dev): `apps/api/.env` (do **not** commit it; `.env*` is gitignored).

### Quick start (all services)

Start both API and web frontend in one command:

```bash
# Using pnpm script (recommended)
pnpm dev

# Or use the shell script
./start-dev.sh
```

This will start:

- API at http://localhost:3000 (NestJS)
- Web at http://localhost:5173 (Vite)

## Build / lint / test commands

### Workspace-level (from repo root)

- Build everything:
  ```bash
  pnpm run build
  ```
- Lint everything:
  ```bash
  pnpm run lint
  ```
- Lint & auto-fix (note: current script runs eslint with `--fix`):
  ```bash
  pnpm run lint:fix
  ```
- Format whole repo (Prettier):
  ```bash
  pnpm run format
  ```
- Check formatting:
  ```bash
  pnpm run format:check
  ```
- Run all tests in all workspaces:
  ```bash
  pnpm run test
  ```

### API-only (recommended while working)

Run commands from repo root using pnpm filters (preferred):

- Start dev server:
  ```bash
  pnpm run dev:api
  # equivalent: pnpm --filter ./apps/api run start:dev
  ```
- Build API:
  ```bash
  pnpm run build:api
  # equivalent: pnpm --filter ./apps/api run build
  ```
- Lint API:
  ```bash
  pnpm --filter ./apps/api run lint
  ```
- Format API:
  ```bash
  pnpm --filter ./apps/api run format
  ```

### Tests (Jest)

API scripts live in `apps/api/package.json`:

- Unit tests:
  ```bash
  pnpm --filter ./apps/api run test
  ```
- Watch mode:
  ```bash
  pnpm --filter ./apps/api run test:watch
  ```
- Coverage:
  ```bash
  pnpm --filter ./apps/api run test:cov
  ```
- E2E tests:
  ```bash
  pnpm --filter ./apps/api run test:e2e
  ```

#### Run a single test (unit)

Jest supports path filtering and name filtering:

- By file path:
  ```bash
  pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts
  ```
- By test name (pattern):
  ```bash
  pnpm --filter ./apps/api run test -- -t "should create question"
  ```
- By file + name:
  ```bash
  pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts -t "should create"
  ```

#### Run a single e2e test

E2E uses `apps/api/test/jest-e2e.json` (regex `.e2e-spec.ts$`).

- By file path:
  ```bash
  pnpm --filter ./apps/api run test:e2e -- test/app.e2e-spec.ts
  ```
- By test name:
  ```bash
  pnpm --filter ./apps/api run test:e2e -- -t "health"
  ```

### Prisma / DB

From repo root:

```bash
pnpm --filter ./apps/api run prisma:generate
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:studio
```

Notes:

- Dev uses SQLite via `DATABASE_URL="file:./dev.db"`.
- Schema changes require `prisma:generate` and typically a migration.

## Cursor / Copilot rules

- No `.cursorrules`
- No `.cursor/rules/`
- No `.github/copilot-instructions.md`

(If these appear later, mirror them here and treat them as higher priority than the rest of this document.)

## Code style & conventions

### TypeScript & compiler settings

- TS is strict (`strict: true`, `noImplicitAny: true`).
- API tsconfig alias: `@/* -> src/*` within `apps/api`.
  - Prefer alias imports for common code: `@/common/...`.

### Formatting

- Prettier settings (API):
  - single quotes, semicolons
  - trailing commas (es5)
  - print width 100
  - tab width 2

### Imports

- Prefer `@nestjs/*` imports at top.
- Prefer absolute alias imports for shared code inside API:
  - ✅ `import { PaginationDto } from '@/common/dto/pagination.dto';`
  - ✅ `import { QuestionType } from '@/common/enums/question.enum';`
- Relative imports are OK within a feature module.

### NestJS module organization (IMPORTANT)

- Feature-based folders (not layer-based):
  - `apps/api/src/modules/<feature>/`
    - `<feature>.controller.ts` — routing only
    - `<feature>.service.ts` — business logic + DB
    - `<feature>.module.ts` — Nest module wiring
    - `dto/*.dto.ts` — all request/response input shapes

### Validation & DTOs

- Global ValidationPipe is enabled (`whitelist`, `forbidNonWhitelisted`, `transform`).
  - This means DTOs must be complete and accurate.
- All controller inputs must use DTOs with `class-validator` decorators.
- Prefer `@IsOptional()` + specific type validator over untyped fields.

### Naming

- Files: kebab-case
- Classes: PascalCase
- Functions/methods: camelCase
- DB tables: snake_case (Prisma schema)
- Avoid `I*` interface prefix.

### Error handling

- Use Nest exceptions, not raw Errors:
  - `NotFoundException` for missing resources
  - `BadRequestException` for validation/semantic failures
  - `UnprocessableEntityException` if input is well-formed but invalid for domain rules
- Pattern used in services:
  - check existence before update/delete and throw early.

### Database access (Prisma)

- Controllers MUST NOT touch Prisma directly.
- Services inject `PrismaService` and perform DB operations.
- Use transactions for multi-step writes that must be atomic.

### Known codebase debt (don’t cargo-cult)

- ESLint forbids `any` (`@typescript-eslint/no-explicit-any: error`).
- However, there are currently a few `as any` usages for Prisma enum fields / sheet parsing.
  - Prefer fixing type correctness when touching these areas (don’t spread `any`).

## Frontend UI style (web/) — Source of truth: /demo.html

The root frontend lives in `web/`. All new frontend pages/components MUST follow the UI style demonstrated in `demo.html`.
Goal: clean academic look, high readability, clear spacing, large tap targets, accessible focus states.

### 1) Tailwind design tokens (MUST match demo.html)

Use Tailwind with the following `theme.extend` tokens:

**Colors**

- ink.950: #020617
- ink.900: #0F172A
- ink.800: #1E293B
- ink.700: #334155
- slatebg: #F8FAFC
- accent.600: #F97316
- accent.700: #EA580C
- link.700: #0369A1
- link.800: #075985
- border: #E2E8F0

**Shadows**

- shadow-soft: 0 10px 30px rgba(2,6,23,.10)
- shadow-lift: 0 16px 40px rgba(2,6,23,.14)

### 2) Global base styles (A11y required)

- Base page (apply on `<body>` or app root container):
  - `bg-slatebg text-ink-900 antialiased`

- Focus ring (required):
  - `:focus-visible { outline: 2px solid #f97316; outline-offset: 3px; }`

- Reduced motion support (required):
  - `@media (prefers-reduced-motion: reduce) { * { scroll-behavior:auto !important; transition-duration:0.001ms !important; animation-duration:0.001ms !important; } }`

- Prefer adding a “Skip to content” link on pages with a header (see `demo.html`).

### 3) Layout & spacing recipes (copy these patterns)

- Main page container:
  - `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`

- Section spacing:
  - large sections typically: `mt-16`
  - anchor alignment: `scroll-mt-28`
  - fixed header spacing: main content uses `pt-28`

### 4) Surface / card recipes

- Border baseline:
  - `border border-border`

- Radii hierarchy:
  - small controls: `rounded-xl`
  - cards: `rounded-2xl`
  - large panels: `rounded-3xl`

- Card (default):
  - `rounded-2xl border border-border bg-white p-5 shadow-sm`
- Panel (emphasis):
  - `rounded-3xl border border-border bg-white p-6 shadow-soft`
- Muted block:
  - `rounded-2xl bg-slate-50 p-4`

### 5) Buttons (standardize on these)

- Primary button:
  - `inline-flex items-center justify-center rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700`
- Secondary button:
  - `inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-ink-900 shadow-sm transition-colors hover:bg-slate-50`
- Text link:
  - `text-xs font-semibold text-link-800 hover:text-link-700`

### 6) Forms (inputs/select)

- Input/select baseline:
  - `mt-2 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm text-ink-900`
- Helper text:
  - `mt-1 text-xs text-ink-700`

### 7) Implementation requirement (Option B: enforce via shared Tailwind preset)

Do NOT copy tokens per-project. Implement the design system once and reuse it across the workspace:

**Create shared Tailwind preset**

- Location: `packages/config/tailwind.preset.js`
- Export the `theme.extend` tokens from section 1 (colors + shadows)
- Example:
  ```js
  // packages/config/tailwind.preset.js
  module.exports = {
    theme: {
      extend: {
        colors: {
          ink: {
            950: "#020617",
            900: "#0F172A",
            800: "#1E293B",
            700: "#334155",
          },
          slatebg: "#F8FAFC",
          accent: { 600: "#F97316", 700: "#EA580C" },
          link: { 700: "#0369A1", 800: "#075985" },
          border: "#E2E8F0",
        },
        boxShadow: {
          soft: "0 10px 30px rgba(2,6,23,.10)",
          lift: "0 16px 40px rgba(2,6,23,.14)",
        },
      },
    },
  };
  ```

**Configure web/ to consume the preset**

- In `web/tailwind.config.js` (or `.ts`):
  ```js
  module.exports = {
    presets: [require("@examforge/config/tailwind.preset")],
    // ... other web-specific config
  };
  ```
- Ensure `packages/config` is listed in workspace and accessible to `web/`.

**Add global CSS**

- In `web/` (e.g., `src/index.css` or `src/globals.css`):
  - Include `:focus-visible` ring and `prefers-reduced-motion` rules from section 2
  - Ensure base `bg-slatebg text-ink-900 antialiased` is applied by the root layout component

## Project notes

- Swagger decorators (`@ApiTags`, `@ApiOperation`, etc.) are used; keep API docs consistent.
- Frontend lives in `web/` and MUST follow the UI style defined in this document.
- Do not add new dependencies without an explicit reason and approval.
