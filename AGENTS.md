# AGENTS.md — ExamForge (Monorepo) Agent Guide
⚠️ 规则：
- 不允许执行任何需要用户交互输入的命令
- 所有命令必须是 non-interactive
- 若某命令可能阻塞，必须改写为非交互形式
- 若无法避免，必须仅输出命令，不执行

## Repo layout

- `apps/api/` — NestJS + TypeScript REST API (Jest unit + e2e)
- `web/` — Vite + React + Tailwind frontend (UI style: `demo.html`)
- `packages/shared-types/` — TypeScript types shared across apps
- `packages/config/` — shared Prettier/Tailwind preset

API code lives in `apps/api/src/` (features in `src/modules/`, shared in `src/common/`).

## Environment

- Node: `>=18`
- pnpm: `>=8` (repo uses `pnpm@10.x` via `packageManager`)
- Install: `pnpm install`
- API env file: `apps/api/.env` (do not commit)

## Commands

### Workspace-level (root)

- `pnpm dev` — run API + Web dev servers
- `pnpm build` — build everything
- `pnpm lint` / `pnpm lint:fix` — lint everything
- `pnpm format` / `pnpm format:check` — Prettier write/check
- `pnpm test` — workspace tests (only packages that define `test`)
- `pnpm test:e2e` — API e2e tests

### Package-specific

- API: `pnpm dev:api`, `pnpm build:api`, `pnpm --filter ./apps/api run lint|test|test:e2e`
- Web: `pnpm dev:web`, `pnpm build:web`, `pnpm --filter ./web run lint|lint:fix`
- Shared types: `pnpm --filter @examforge/shared-types run build|watch|clean`

### Single test (API - Jest)

```bash
pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts
pnpm --filter ./apps/api run test -- -t "should create question"
pnpm --filter ./apps/api run test -- src/modules/question/question.service.spec.ts -t "should create"
pnpm --filter ./apps/api run test:watch
pnpm --filter ./apps/api run test:debug -- -t "should create"
```

Tip: when running from `apps/api`, you can also use `pnpm test -- <path> -t <pattern>`.

### Single e2e (API - Jest)

```bash
pnpm --filter ./apps/api run test:e2e -- test/app.e2e-spec.ts
pnpm --filter ./apps/api run test:e2e -- -t "health"
```

Tip: when running from `apps/api`, you can also use `pnpm test:e2e -- <path> -t <pattern>`.

### Prisma (API)

```bash
pnpm --filter ./apps/api run prisma:generate
pnpm --filter ./apps/api run prisma:migrate
pnpm --filter ./apps/api run prisma:studio
```

## Cursor / Copilot rules

- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` exist.
- If added later, summarize them here; those rules override this file.

## Code style

### TypeScript

- Web: `strict: true`; API: `strict: false` (intentionally disabled).
- Do not introduce `any` - API ESLint errors on `@typescript-eslint/no-explicit-any`.
- Prefer explicit domain types and request/response DTOs over ad-hoc object shapes.
- Path aliases (`tsconfig.json`):
  - API: `@/* -> apps/api/src/*`
  - Web: `@/* -> web/src/*`
  - Shared types: `@examforge/shared-types -> packages/shared-types/src`

### Formatting

- Prettier: `printWidth: 100`, `tabWidth: 2`, `singleQuote: true`, `semi: true`, `trailingComma: 'es5'`, `endOfLine: 'lf'`.
- Prefer running `pnpm format` over manual formatting.

### Linting

- API ESLint errors on `@typescript-eslint/no-explicit-any`; fix types instead of using `any`.
- Keep lint fixes scoped to touched files.

### Imports

- Order: framework → third-party → internal alias → relative.
- API: keep `@nestjs/*` imports at the top.
- Prefer alias imports for cross-module code, e.g. `@/common/...`.

### Naming

- Files/folders: `kebab-case`.
- Classes/providers: `PascalCase`.
- Functions/variables: `camelCase`.
- Avoid `I*` interface prefix.

### Backend architecture (NestJS)

- Feature folders: `apps/api/src/modules/<feature>/`.
- Controllers: routing only; no Prisma, no business logic.
- Services: business logic + DB access via injected `PrismaService`.
- DTOs: `dto/*.dto.ts` with `class-validator` decorators.

### Error handling

- Use Nest exceptions (`BadRequestException`, `NotFoundException`, `UnprocessableEntityException`, etc.).
- Check existence before update/delete and fail fast.

### DB / Prisma

- Controllers MUST NOT touch Prisma directly.
- Use transactions for multi-step writes.

### Frontend UI

- Use `demo.html` as the visual reference.
- Use shared Tailwind preset: `packages/config/tailwind.preset.js`.
- Ensure focus-visible rings and `prefers-reduced-motion` support.
- Web structure: `src/features/` for feature modules, `src/components/` for shared UI.

### Testing patterns

- Unit tests: `*.spec.ts` alongside source files in API modules.
- E2e tests: `test/*.e2e-spec.ts` in API root.
- Use `describe` blocks for logical grouping; `it`/`test` for individual test cases.

### Environment variables

- API: `apps/api/.env` (local dev only; never commit).
- Use `@nestjs/config` with validation schemas for required env vars.

### Scope

- More-specific `AGENTS.md` files (if present) override this one for their subtree.

## Notes

- Root `tsconfig.json` includes `@examforge/web -> apps/web/src` but the actual frontend lives in `web/src`; treat it as legacy unless confirmed.
- Swagger decorators are used on API routes; keep docs consistent.
