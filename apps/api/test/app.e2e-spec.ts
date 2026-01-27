import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

describe('API E2E Tests', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let questionId: string;
  let examId: string;
  let authToken: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    const { AppModule } = await import('./../src/app.module');
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Auth', () => {
    it('should register and login after approval', async () => {
      const username = `user_${Date.now()}`;
      const password = 'TestPass123!';

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username,
          password,
          name: 'Test User',
        })
        .expect(201);

      const userId = registerResponse.body.user?.id;
      const isApproved = registerResponse.body.user?.isApproved;
      expect(userId).toBeDefined();

      if (isApproved === false) {
        await request(app.getHttpServer()).patch(`/admin/users/${userId}/approve`).expect(200);
      }

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username,
          password,
        })
        .expect(201);

      expect(loginResponse.body).toHaveProperty('access_token');
      authToken = loginResponse.body.access_token;
    });
  });

  describe('Questions', () => {
    it('should create a question', () => {
      return request(app.getHttpServer())
        .post('/questions')
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should get a question by id', () => {
      return request(app.getHttpServer())
        .get(`/questions/${questionId}`)
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it('should add question to exam', () => {
      return request(app.getHttpServer())
        .post(`/exams/${examId}/questions`)
        .set('Authorization', `Bearer ${authToken}`)
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
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(examId);
          expect(Array.isArray(res.body.examQuestions)).toBe(true);
        });
    });
  });
});
