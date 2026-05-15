import { FastifyInstance } from 'fastify';
import { uploadImage } from '../services/s3';
import { validateDeviceId } from '../utils/validateDeviceId';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const LOCAL_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

const hasS3 = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

export async function uploadRoutes(app: FastifyInstance) {
  app.post('/api/upload', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
        keyGenerator: (req) =>
          (req.headers['x-device-id'] as string) || req.ip,
        errorResponseBuilder: () => ({
          error: '요청이 너무 많습니다. 1분 후 다시 시도하세요.',
        }),
      },
    },
  }, async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const parts = req.files();
    const urls: string[] = [];

    for await (const part of parts) {
      if (!part.mimetype.startsWith('image/')) {
        return reply.status(400).send({ error: '이미지 파일만 허용됩니다.' });
      }

      const chunks: Buffer[] = [];
      for await (const chunk of part.file) chunks.push(chunk);
      const buf = Buffer.concat(chunks);

      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      if (!isJpeg && !isPng) {
        return reply.status(400).send({ error: 'JPEG 또는 PNG 이미지만 허용됩니다.' });
      }

      if (hasS3) {
        const key = await uploadImage(buf, part.mimetype);
        urls.push(key);
      } else {
        const filename = `${randomUUID()}.jpg`;
        fs.writeFileSync(path.join(LOCAL_DIR, filename), buf);
        urls.push(`/uploads/${filename}`);
      }
    }

    return reply.send({ urls });
  });
}
