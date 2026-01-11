import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import * as request from 'supertest';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let questionId: string;
  let examId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Questions', () => {
    it('should create a question', () => {
      return request(app.getHttpServer())
        .post('/questions')
        .send({
          content: 'What is 2 + 2?',
          type: 'SINGLE_CHOICE',
          options: [
            { label: 'A', content: '3' },
            { label: 'B', content: '4' },
            { label: 'C', content: '5' },
            { label: 'D', content: '6' },
          ],
          answer: 'B',
          difficulty: 1,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          questionId = res.body.id;
          expect(res.body.content).toBe('What is 2 + 2?');
        });
    });

    it('should get all questions', () => {
      return request(app.getHttpServer())
        .get('/questions')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get a question by id', () => {
      return request(app.getHttpServer())
        .get(`/questions/${questionId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(questionId);
        });
    });
  });

  describe('Exams', () => {
    it('should create an exam', () => {
      return request(app.getHttpServer())
        .post('/exams')
        .send({
          title: 'Math Quiz',
          description: 'Basic mathematics quiz',
          duration: 60,
          totalScore: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          examId = res.body.id;
          expect(res.body.title).toBe('Math Quiz');
        });
    });

    it('should get all exams', () => {
      return request(app.getHttpServer())
        .get('/exams')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should add question to exam', () => {
      return request(app.getHttpServer())
        .post(`/exams/${examId}/questions`)
        .send({
          questionId,
          order: 1,
          score: 10,
        })
        .expect(201);
    });

    it('should get exam with questions', () => {
      return request(app.getHttpServer())
        .get(`/exams/${examId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(examId);
          expect(Array.isArray(res.body.questions)).toBe(true);
        });
    });
  });
});
