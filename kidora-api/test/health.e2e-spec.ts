import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { HealthModule } from '../src/health/health.module';


describe('Health (e2e)', () => {
  let app: INestApplication;


  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();


    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');

    await app.init();
  });


  afterAll(async () => {
    await app.close();
  });


  it('GET /api/health returns ok', async () => {

    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);


    expect(response.body.status).toBe('ok');

  });

});