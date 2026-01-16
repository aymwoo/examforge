# ExamForge (智考工坊) - AI Assistant Context

## Project Overview

**ExamForge** is a comprehensive, AI-driven platform for managing question banks and conducting online examinations. It features AI-powered question import (from Excel, PDF, Images via OCR/LLM), smart exam creation, real-time grading, and detailed student analytics.

### Architecture & Tech Stack

The project is a **Monorepo** managed by **pnpm**.

*   **Backend (`apps/api`)**:
    *   **Framework**: NestJS (TypeScript)
    *   **Database**: SQLite (Development) / PostgreSQL (Production)
    *   **ORM**: Prisma
    *   **AI Integration**: OpenAI / Qwen LLMs + PaddleOCR
    *   **API Documentation**: Swagger/OpenAPI
*   **Frontend (`web`)**:
    *   **Framework**: React + Vite
    *   **Styling**: Tailwind CSS
    *   **UI Reference**: `demo.html` (in root)
*   **Shared Packages (`packages/`)**:
    *   `shared-types`: TypeScript types shared between API and Web.
    *   `config`: Shared configurations (Prettier, Tailwind).
*   **Infrastructure**: Docker (Compose) for production deployment.

## Key Commands

**Note**: All commands should be run from the project root unless specified.

### Setup & Installation

```bash
pnpm install                  # Install dependencies
pnpm --filter ./apps/api run prisma:generate # Generate Prisma Client
pnpm --filter ./apps/api run prisma:migrate  # Run database migrations
```

### Development

```bash
pnpm dev                      # Start API and Web servers in parallel
pnpm dev:api                  # Start API server only (hot reload)
pnpm dev:web                  # Start Web server only (Vite)
```

### Building

```bash
pnpm build                    # Build all packages
pnpm build:api                # Build API only
pnpm build:web                # Build Web only
```

### Database (Prisma)

Commands target the API workspace:

```bash
pnpm --filter ./apps/api run prisma:studio    # Open Prisma Studio (GUI)
pnpm --filter ./apps/api run prisma:generate  # Regenerate client after schema changes
pnpm --filter ./apps/api run prisma:migrate   # Run migrations (dev)
pnpm --filter ./apps/api run prisma:deploy    # Run migrations (prod)
```

### Testing & Quality

```bash
pnpm test                     # Run all tests
pnpm lint                     # Lint all packages
pnpm format                   # Format code with Prettier
pnpm --filter ./apps/api run test:e2e # Run API E2E tests
```

## Project Structure

```
examforge/
├── apps/
│   └── api/                  # NestJS Backend Application
│       ├── src/
│       │   ├── modules/      # Feature modules (Controller, Service, DTOs)
│       │   ├── common/       # Shared utilities, guards, filters
│       │   └── main.ts       # Entry point
│       └── prisma/           # Database schema and migrations
├── web/                      # React Frontend Application (Note: located at root level in workspace)
│   ├── src/
│   │   ├── components/       # Shared UI components
│   │   ├── features/         # Feature-specific components and logic
│   │   ├── pages/            # Route components
│   │   └── services/         # API client services
│   └── index.html
├── packages/                 # Shared workspaces
│   ├── shared-types/         # Shared TypeScript interfaces/types
│   └── config/               # Shared configs
├── docker/                   # Docker configuration (Compose, Dockerfiles)
├── AGENTS.md                 # Critical detailed guidelines for AI Agents
└── README.md                 # General Project Documentation
```

## Development Guidelines (Strict)

Refer to **`AGENTS.md`** for the authoritative source on these rules.

### Backend (NestJS)

*   **Structure**: `apps/api/src/modules/<feature>/`.
    *   `<feature>.controller.ts`: Routing only. No business logic. No direct Prisma access.
    *   `<feature>.service.ts`: Business logic + DB access (via injected `PrismaService`).
    *   `dto/*.dto.ts`: Request/Response objects with `class-validator`.
*   **Error Handling**: Use NestJS standard exceptions (`BadRequestException`, `NotFoundException`, etc.).
*   **Imports**: `@nestjs/*` first. Use aliases (`@/common`, `@/modules`).

### Frontend (React)

*   **Styling**: Use Tailwind CSS.
*   **Components**: Prefer functional components with hooks.
*   **State**: Manage local state or use appropriate context/stores.
*   **Path Aliases**: `@/*` maps to `web/src/*`.

### Code Style & Naming

*   **Files/Folders**: `kebab-case` (e.g., `exam-service.ts`).
*   **Classes**: `PascalCase` (e.g., `ExamController`).
*   **Functions/Variables**: `camelCase`.
*   **Interfaces**: `PascalCase` (no `I` prefix).
*   **Constants**: `SCREAMING_SNAKE_CASE`.
*   **Formatting**: Prettier (`printWidth: 100`, `singleQuote: true`, `semi: true`).

## Key Documentation

*   **`AGENTS.md`**: **MUST READ**. Contains specific rules for agents, including test commands and architectural constraints.
*   **`IMPORT_HISTORY.md`**: Details on the question import feature.
*   **`PDF_IMAGE_PROCESSING.md`**: Documentation on OCR and image processing.
*   **`QUESTION_ORDERING.md`**: Logic for managing question order.
