import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Auth + endpoints protegidos (e2e)', () => {
  let app: INestApplication<App>;

  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@taller.com';
  const adminPassword =
    process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin1234!Secure';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/suppliers sin token -> 401', () => {
    return request(app.getHttpServer()).get('/api/v1/suppliers').expect(401);
  });

  it('POST /api/v1/auth/login con credenciales inválidas -> 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: 'contraseña-incorrecta' })
      .expect(401);
  });

  it('POST /api/v1/auth/login con credenciales válidas -> 200 y devuelve tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String) as string,
        refreshToken: expect.any(String) as string,
      }),
    );
  });

  it('GET /api/v1/suppliers con token de ADMIN -> 200 y lista paginada', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password: adminPassword })
      .expect(200);

    const accessToken = (login.body as { accessToken: string }).accessToken;

    const res = await request(app.getHttpServer())
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body).toEqual(
      expect.objectContaining({
        data: expect.any(Array) as unknown[],
        total: expect.any(Number) as number,
      }),
    );
  });
});
