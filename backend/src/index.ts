import 'dotenv/config';
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import path from 'path';
import fs from 'fs';
import { scanRoutes } from './routes/scan';
import { listingRoutes } from './routes/listings';
import { appraisalRoutes } from './routes/appraisal';
import { chatRoutes } from './routes/chat';
import { uploadRoutes } from './routes/upload';
import { initSocketIO } from './services/socketServer';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = Fastify({ logger: true });

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ALLOWED_ORIGINS
    : true,
});
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
app.register(rateLimit, {
  global: false, // 라우트별로 개별 적용
});
app.register(staticFiles, { root: UPLOADS_DIR, prefix: '/uploads/' });

app.setErrorHandler((error: FastifyError, req, reply) => {
  req.log.error({ err: error }, 'Unhandled error');
  const status = error.statusCode ?? 500;
  reply.status(status).send({
    error: status < 500 ? error.message : '서버 오류가 발생했습니다.',
  });
});

app.register(scanRoutes);
app.register(listingRoutes);
app.register(appraisalRoutes);
app.register(chatRoutes);
app.register(uploadRoutes);

app.get('/', async () => ({
  name: 'Heritcoin API',
  status: 'ok',
  health: '/health',
}));

app.get('/health', async () => ({ status: 'ok' }));

const PORT = Number(process.env.PORT ?? 3000);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // Fastify의 내장 http.Server에 Socket.IO 연결
  initSocketIO(app.server);
});
