# ExamForge (智考工坊)

AI-driven multi-source question bank and online examination system.

## Features

- ✅ Question Bank CRUD API
- ✅ Excel/CSV Import for bulk questions
- ✅ SQLite Database (dev) with Prisma ORM
- ✅ NestJS + TypeScript
- ✅ Validation with class-validator
- ✅ Swagger API documentation

## Tech Stack

- **Backend**: Node.js + TypeScript + NestJS
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Validation**: class-validator + class-transformer
- **Excel Processing**: xlsx
- **API Style**: REST

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm run prisma:generate

# Run database migrations
pnpm run prisma:migrate

# Start development server
pnpm run start:dev
```

The server will be running at http://localhost:3000

## API Documentation

Once the server is running, access Swagger documentation at:
http://localhost:3000/api

## Available Scripts

```bash
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

# Database
pnpm run prisma:generate    # Generate Prisma client
pnpm run prisma:migrate     # Run migrations (dev)
pnpm run prisma:studio      # Open Prisma Studio GUI
```

## Project Structure

```
src/
├── main.ts                 # Entry point
├── app.module.ts           # Root module
├── common/                 # Shared utilities
│   ├── dto/               # Common DTOs (pagination)
│   └── enums/             # Enum definitions
├── modules/
│   ├── question/           # Question bank CRUD
│   │   ├── dto/           # Request/response DTOs
│   │   ├── question.controller.ts
│   │   └── question.service.ts
│   └── import/            # Excel/CSV import
│       ├── import.controller.ts
│       └── import.service.ts
├── prisma/                # Prisma service
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── prisma/                # Database schema and migrations
    └── schema.prisma
```

## API Endpoints

### Questions

- `POST /questions` - Create a new question
- `GET /questions` - Get all questions with pagination
- `GET /questions/:id` - Get a question by ID
- `PUT /questions/:id` - Update a question
- `DELETE /questions/:id` - Delete a question

### Exams

- `POST /exams` - Create a new exam
- `GET /exams` - Get all exams with pagination and questions
- `GET /exams/:id` - Get an exam by ID with questions
- `PUT /exams/:id` - Update an exam
- `DELETE /exams/:id` - Delete an exam
- `POST /exams/:id/questions` - Add a question to an exam
- `DELETE /exams/:id/questions/:questionId` - Remove a question from an exam
- `PUT /exams/:id/questions/:questionId` - Update question order and score in exam

### Import

- `POST /import/excel` - Import questions from Excel file

## Excel Import Format

The Excel import supports the following columns:

- `题干` or `content` - Question content (required)
- `题型` or `type` - Question type (单选题/SINGLE_CHOICE, 多选题/MULTIPLE_CHOICE, 判断题/TRUE_FALSE, 填空题/FILL_BLANK, 简答题/ESSAY)
- `选项` or `options` - Options for choice questions
- `答案` or `answer` - Correct answer
- `解析` or `explanation` - Explanation
- `标签` or `tags` - Question tags (comma-separated)
- `难度` or `difficulty` - Difficulty level (1-5)
- `知识点` or `knowledgePoint` - Knowledge point

## Environment Variables

```bash
# .env
DATABASE_URL="file:./dev.db"

LLM_PROVIDER="qwen"
LLM_API_KEY="sk-xxx"
LLM_BASE_URL=""

OCR_ENGINE="paddleocr"

PORT=3000
NODE_ENV="development"
```

## API Usage Examples

### Create a Question

```bash
curl -X POST http://localhost:3000/questions \
  -H "Content-Type: application/json" \
  -d '{
    "content": "What is 2 + 2?",
    "type": "SINGLE_CHOICE",
    "options": [
      {"label": "A", "content": "3"},
      {"label": "B", "content": "4"},
      {"label": "C", "content": "5"},
      {"label": "D", "content": "6"}
    ],
    "answer": "B",
    "difficulty": 1
  }'
```

### Create an Exam

```bash
curl -X POST http://localhost:3000/exams \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Math Quiz",
    "description": "Basic mathematics quiz",
    "duration": 60,
    "totalScore": 100
  }'
```

### Add Question to Exam

```bash
curl -X POST http://localhost:3000/exams/{examId}/questions \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "{questionId}",
    "order": 1,
    "score": 10
  }'
```

### Get Exam with Questions

```bash
curl http://localhost:3000/exams/{examId}
```

## Database Schema

### Question
- id, content, type, options, answer, explanation, tags, difficulty, status, knowledgePoint

### Exam
- id, title, description, duration, totalScore, status, startTime, endTime

### ExamQuestion (junction)
- id, examId, questionId, order, score

### Submission
- id, examId, answers, score, isAutoGraded, submittedAt

## Next Steps

- [ ] Add Exam module (exam CRUD)
- [ ] Add Submission module
- [ ] Add OCR + LLM parsing for image/PDF
- [ ] Add authentication
- [ ] Write unit tests
- [ ] Add E2E tests
