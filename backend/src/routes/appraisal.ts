import { FastifyInstance } from 'fastify';
import * as PortOne from '@portone/server-sdk';
import prisma from '../services/prisma';
import { validateDeviceId } from '../utils/validateDeviceId';

const TIERS = {
  basic: { price: 5000, label: '기본 감정' },
  premium: { price: 15000, label: '정밀 감정' },
} as const;

type Tier = keyof typeof TIERS;

export async function appraisalRoutes(app: FastifyInstance) {
  // 감정 의뢰 생성 (결제 전)
  app.post('/api/appraisals', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const { tier, scanId, condition, note, imageUrls } = req.body as {
      tier: Tier;
      scanId?: string;
      condition?: string;
      note?: string;
      imageUrls: string[];
    };

    if (!tier || !TIERS[tier]) return reply.status(400).send({ error: '유효하지 않은 감정 등급' });
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return reply.status(400).send({ error: '이미지를 첨부하세요.' });
    }

    const device = await prisma.device.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId },
    });

    const appraisal = await prisma.appraisal.create({
      data: {
        deviceId: device.id,
        scanId,
        tier,
        price: TIERS[tier].price,
        condition,
        note,
        imageUrls: JSON.stringify(imageUrls ?? []),
      },
    });

    return reply.status(201).send({
      appraisalId: appraisal.id,
      price: appraisal.price,
      paymentOrderId: `appraisal-${appraisal.id}`,
    });
  });

  // PortOne 결제 완료 검증
  app.post('/api/appraisals/:id/verify-payment', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    const { id } = req.params as { id: string };
    const { paymentId } = req.body as { paymentId: string };

    if (!paymentId || typeof paymentId !== 'string') {
      return reply.status(400).send({ error: 'paymentId가 필요합니다.' });
    }

    const appraisal = await prisma.appraisal.findUnique({ where: { id } });
    if (!appraisal) return reply.status(404).send({ error: '의뢰 없음' });

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device || appraisal.deviceId !== device.id) {
      return reply.status(403).send({ error: '권한 없음' });
    }

    if (appraisal.status !== 'pending') return reply.status(400).send({ error: '이미 처리된 의뢰' });

    const portone = PortOne.PortOneClient({ secret: process.env.PORTONE_API_SECRET! });
    const payment = await portone.payment.getPayment({ paymentId });

    if (
      payment.status !== 'PAID' ||
      (payment as any).amount?.total !== appraisal.price
    ) {
      return reply.status(400).send({ error: '결제 금액 불일치 또는 미완료' });
    }

    await prisma.appraisal.update({
      where: { id },
      data: { status: 'paid', paymentId },
    });

    return reply.send({ ok: true, status: 'paid' });
  });

  // 내 감정 의뢰 목록
  app.get('/api/appraisals', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return reply.send([]);

    const list = await prisma.appraisal.findMany({
      where: { deviceId: device.id },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send(list.map(parseAppraisalImages));
  });

  // 감정 상세
  app.get('/api/appraisals/:id', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const { id } = req.params as { id: string };
    const appraisal = await prisma.appraisal.findUnique({ where: { id } });
    if (!appraisal) return reply.status(404).send({ error: '의뢰 없음' });

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device || appraisal.deviceId !== device.id) {
      return reply.status(403).send({ error: '권한 없음' });
    }

    return reply.send(parseAppraisalImages(appraisal));
  });
}

function parseAppraisalImages<T extends { imageUrls: string }>(appraisal: T) {
  return {
    ...appraisal,
    imageUrls: (() => {
      try {
        return JSON.parse(appraisal.imageUrls);
      } catch {
        return [];
      }
    })(),
  };
}
