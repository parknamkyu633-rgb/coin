import { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { identifyCoin } from '../ml/coinIdentifier';
import { uploadImage } from '../services/s3';
import prisma from '../services/prisma';
import { validateDeviceId } from '../utils/validateDeviceId';

export async function scanRoutes(app: FastifyInstance) {
  app.post('/api/scan', {
    config: {
      rateLimit: {
        max: 10,
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
    const files: Record<string, Buffer> = {};

    for await (const part of parts) {
      if (!part.mimetype.startsWith('image/')) {
        return reply.status(400).send({ error: '이미지 파일만 허용됩니다.' });
      }
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) chunks.push(chunk);
      const buf = Buffer.concat(chunks);

      // 매직 바이트 검증 (JPEG: FF D8 FF / PNG: 89 50 4E 47)
      const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
      const isPng  = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
      if (!isJpeg && !isPng) {
        return reply.status(400).send({ error: 'JPEG 또는 PNG 이미지만 허용됩니다.' });
      }

      files[part.fieldname] = buf;
    }

    if (!files['front']) return reply.status(400).send({ error: '앞면 이미지 필요' });

    // 이미지 전처리 (max 1024px, JPEG 85%)
    const frontBuf = await sharp(files['front'])
      .resize(1024, 1024, { fit: 'inside' })
      .jpeg({ quality: 85 })
      .toBuffer();

    const backBuf = files['back']
      ? await sharp(files['back'])
          .resize(1024, 1024, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer()
      : undefined;

    // 기기 upsert — Device.id(PK) 를 반환받아야 Scan FK에 사용 가능
    const device = await prisma.device.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId },
    });

    // S3 업로드
    const frontKey = await uploadImage(frontBuf, 'image/jpeg');
    const backKey = backBuf ? await uploadImage(backBuf, 'image/jpeg') : undefined;

    // AI 분석
    const result = await identifyCoin(
      frontBuf.toString('base64'),
      backBuf?.toString('base64')
    );

    // DB 저장
    const scan = await prisma.scan.create({
      data: {
        deviceId: device.id,
        frontUrl: frontKey,
        backUrl: backKey,
        result: result as object,
        coinName: result.name,
        year: result.year,
        country: result.country,
        rarity: result.rarity,
        confidence: result.confidence,
        marketMin: result.estimatedValue?.min,
        marketMax: result.estimatedValue?.max,
      },
    });

    return reply.send({ scanId: scan.id, result });
  });

  app.get('/api/scan/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan) return reply.status(404).send({ error: '스캔 결과 없음' });
    return reply.send(scan);
  });

  app.delete('/api/scan/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return reply.status(403).send({ error: '권한 없음' });

    const scan = await prisma.scan.findUnique({ where: { id } });
    if (!scan) return reply.status(404).send({ error: '스캔 결과 없음' });
    if (scan.deviceId !== device.id) return reply.status(403).send({ error: '권한 없음' });

    await prisma.scan.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.get('/api/scans', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return reply.send([]);

    const scans = await prisma.scan.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return reply.send(scans);
  });
}
