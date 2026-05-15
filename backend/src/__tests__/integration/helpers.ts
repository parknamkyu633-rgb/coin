import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import supertest from 'supertest';

export async function buildApp() {
  const app = Fastify();
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(rateLimit, { global: false });
  return app;
}

export async function buildTestServer(registerRoutes: (app: Awaited<ReturnType<typeof buildApp>>) => unknown) {
  const app = await buildApp();
  await registerRoutes(app);
  await app.ready();
  await app.listen({ port: 0 }); // OS가 빈 포트 자동 할당
  return {
    request: supertest(app.server),
    close: () => app.close(),
  };
}

export const DEVICE_ID    = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
export const DEVICE_ID_2  = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
export const DEVICE_DB_ID = 'device-db-id-1234';
