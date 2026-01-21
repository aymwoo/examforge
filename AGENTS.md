# AGENTS.md — ExamForge (Monorepo) Agent Guide

This file guides AI agents operating in the ExamForge monorepo.

## ⚠️ Critical Agent Rules

1.  **No Interactive Commands**: DO NOT run commands requiring user input (e.g., `git rebase -i`, `npm init`).
2.  **Lint/Format/Build**: Always verify changes by running lint, format, and build commands before finishing.
3.  **File Paths**: Use absolute paths or correct relative paths from the workspace root.
4.  **Conventions**: Strictly follow the project's architecture (NestJS for API, React+Vite for Web).

## 📂 Repository Structure

- `apps/api`: NestJS Backend (REST API, Prisma, SQLite/Postgres).
- `web`: React Frontend (Vite, Tailwind CSS, Radix UI).
- `packages/shared-types`: Shared TypeScript interfaces.
- `packages/config`: Shared configurations (ESLint, Prettier).

## 🛠 Build & Development Commands

Run these from the workspace root:

| Command         | Description                                    |
| :-------------- | :--------------------------------------------- |
| `pnpm install`  | Install all dependencies (requires Node >=18). |
| `pnpm dev`      | Start API and Web dev servers in parallel.     |
| `pnpm build`    | Build all packages/apps.                       |
| `pnpm lint`     | Run ESLint across the workspace.               |
| `pnpm lint:fix` | Fix auto-fixable lint errors.                  |
| `pnpm format`   | Run Prettier write on all files.               |

### Component Specific

- **API**: `pnpm --filter ./apps/api run <command>` (dev, build, start:prod)
- **Web**: `pnpm --filter ./web run <command>` (dev, build, preview)

## 🧪 Testing

### Running Tests

| Type          | Command                         | Description                              |
| :------------ | :------------------------------ | :--------------------------------------- |
| **Workspace** | `pnpm test`                     | Run all tests.                           |
| **API E2E**   | `pnpm test:e2e`                 | Run API integration tests (recommended). |
| **API Unit**  | `pnpm --filter ./apps/api test` | Run API unit tests.                      |

### Running a Single Test

**API E2E (Jest)** - _Most common for this repo_

```bash
# Run a specific test file
pnpm --filter ./apps/api run test:e2e -- test/app.e2e-spec.ts

# Run tests matching a pattern (e.g., "Auth")
pnpm --filter ./apps/api run test:e2e -- -t "Auth"
```

**API Unit (Jest)**

```bash
# Run a specific spec file
pnpm --filter ./apps/api run test -- src/modules/auth/auth.service.spec.ts

# Watch mode for development
pnpm --filter ./apps/api run test:watch
```

## 🎨 Code Style & Conventions

### General

- **Formatter**: Prettier (2 spaces, single quotes, no semi-colons restrictions per config).
- **Linter**: ESLint (standard flat config).
- **Types**: Strict TypeScript in `web`; looser in `api` (legacy `strict: false`).
- **Exports**: Prefer named exports over default exports.

### API (NestJS)

- **Architecture**: Modular (Modules, Controllers, Services).
- **Database**: Prisma ORM. _Never_ use Prisma in Controllers.
- **DTOs**: Use `class-validator` decorators in `*.dto.ts` files.
- **Imports**:
  ```typescript
  import { Controller, Get } from "@nestjs/common"; // Framework first
  import { UserService } from "./user.service"; // Relative last
  import { UserDto } from "@/modules/user/dto"; // Alias @/ -> src/
  ```
- **Error Handling**: Throw standard NestJS exceptions (`NotFoundException`, `BadRequestException`).

### Web (React + Vite)

- **UI Library**: Tailwind CSS + Radix UI Primitives.
- **State**: React Query (Server state), Context (Global UI state).
- **Naming**: PascalCase for components (`UserProfile.tsx`), camelCase for hooks/utils.
- **Path Aliases**: `@/` maps to `src/`.

### Naming Conventions

- **Files**: `kebab-case` (e.g., `user-profile.component.tsx`, `auth.service.ts`).
- **Classes**: `PascalCase` (e.g., `AuthService`, `CreateUserDto`).
- **Variables/Functions**: `camelCase`.
- **Constants**: `SCREAMING_SNAKE_CASE`.

## 🤖 Cursor & Copilot Rules

- **Files**: `.cursor/rules/` or `.github/copilot-instructions.md`.
- **Priority**: If these files exist, their rules override this document.
- **Current State**: No specific rule files detected at root. Follow this guide.

## 🔄 Verification Workflow

When completing a task, you MUST:

1.  **Format**: `pnpm format`
2.  **Lint**: `pnpm lint` (Fix any errors introduced)
3.  **Build**: `pnpm build` (Ensure no compilation errors)
4.  **Test**: Run relevant tests (`pnpm test:e2e` for API changes).

## 🗄️ Database (Prisma)

- **Schema**: `apps/api/prisma/schema.prisma`
- **Migration**: `pnpm --filter ./apps/api run prisma:migrate` (Dev)
- **Generate**: `pnpm --filter ./apps/api run prisma:generate` (After schema changes)
