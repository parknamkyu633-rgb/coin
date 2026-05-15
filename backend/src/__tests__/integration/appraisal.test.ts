import { buildTestServer, DEVICE_DB_ID, DEVICE_ID } from './helpers';
import { appraisalRoutes } from '../../routes/appraisal';
import prisma from '../../services/prisma';

jest.mock('../../services/prisma');
jest.mock('@portone/server-sdk');

import * as PortOne from '@portone/server-sdk';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Appraisal API', () => {
  let request: Awaited<ReturnType<typeof buildTestServer>>['request'];
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ request, close } = await buildTestServer((app) => app.register(appraisalRoutes)));
  });

  afterAll(() => close());

  describe('POST /api/appraisals', () => {
    it('X-Device-ID 없으면 400', async () => {
      const res = await request
        .post('/api/appraisals')
        .send({ tier: 'basic', imageUrls: ['/uploads/coin.jpg'] });

      expect(res.status).toBe(400);
    });

    it('잘못된 tier는 400', async () => {
      const res = await request
        .post('/api/appraisals')
        .set('x-device-id', DEVICE_ID)
        .send({ tier: 'gold', imageUrls: ['/uploads/coin.jpg'] });

      expect(res.status).toBe(400);
    });

    it('이미지 없으면 400', async () => {
      const res = await request
        .post('/api/appraisals')
        .set('x-device-id', DEVICE_ID)
        .send({ tier: 'basic', imageUrls: [] });

      expect(res.status).toBe(400);
    });

    it('basic 의뢰 생성 — price 5000원', async () => {
      (mockPrisma.device.upsert as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.appraisal.create as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', tier: 'basic', price: 5000 });

      const res = await request
        .post('/api/appraisals')
        .set('x-device-id', DEVICE_ID)
        .send({ tier: 'basic', imageUrls: ['/uploads/coin-front.jpg'] });

      expect(res.status).toBe(201);
      expect(res.body.price).toBe(5000);
      expect(res.body.appraisalId).toBe('appraisal-1');

      const createCall = (mockPrisma.appraisal.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.price).toBe(5000);
      expect(createCall.data.deviceId).toBe(DEVICE_DB_ID);
      expect(createCall.data.imageUrls).toBe('["/uploads/coin-front.jpg"]');
    });

    it('premium 의뢰 생성 — price 15000원', async () => {
      (mockPrisma.device.upsert as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.appraisal.create as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-2', tier: 'premium', price: 15000 });

      const res = await request
        .post('/api/appraisals')
        .set('x-device-id', DEVICE_ID)
        .send({ tier: 'premium', imageUrls: ['/uploads/coin-front.jpg'] });

      expect(res.status).toBe(201);
      expect(res.body.price).toBe(15000);
    });
  });

  describe('POST /api/appraisals/:id/verify-payment', () => {
    it('결제 금액이 일치하면 paid로 업데이트', async () => {
      (mockPrisma.appraisal.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', deviceId: DEVICE_DB_ID, price: 5000, status: 'pending' });
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (PortOne.PortOneClient as jest.Mock).mockReturnValueOnce({ payment: { getPayment: jest.fn().mockResolvedValueOnce({ status: 'PAID', amount: { total: 5000 } }) } });
      (mockPrisma.appraisal.update as jest.Mock).mockResolvedValueOnce({});

      const res = await request
        .post('/api/appraisals/appraisal-1/verify-payment')
        .set('x-device-id', DEVICE_ID)
        .send({ paymentId: 'portone-payment-id' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, status: 'paid' });

      const updateCall = (mockPrisma.appraisal.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.status).toBe('paid');
    });

    it('결제 금액 불일치 시 400', async () => {
      (mockPrisma.appraisal.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', deviceId: DEVICE_DB_ID, price: 5000, status: 'pending' });
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (PortOne.PortOneClient as jest.Mock).mockReturnValueOnce({ payment: { getPayment: jest.fn().mockResolvedValueOnce({ status: 'PAID', amount: { total: 15000 } }) } });

      const res = await request
        .post('/api/appraisals/appraisal-1/verify-payment')
        .set('x-device-id', DEVICE_ID)
        .send({ paymentId: 'portone-payment-id' });

      expect(res.status).toBe(400);
      expect(mockPrisma.appraisal.update).not.toHaveBeenCalled();
    });

    it('결제 미완료(PENDING) 시 400', async () => {
      (mockPrisma.appraisal.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', deviceId: DEVICE_DB_ID, price: 5000, status: 'pending' });
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (PortOne.PortOneClient as jest.Mock).mockReturnValueOnce({ payment: { getPayment: jest.fn().mockResolvedValueOnce({ status: 'PENDING', amount: { total: 5000 } }) } });

      const res = await request
        .post('/api/appraisals/appraisal-1/verify-payment')
        .set('x-device-id', DEVICE_ID)
        .send({ paymentId: 'portone-payment-id' });

      expect(res.status).toBe(400);
    });

    it('이미 처리된 의뢰는 400', async () => {
      (mockPrisma.appraisal.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', deviceId: DEVICE_DB_ID, price: 5000, status: 'paid' });
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (PortOne.PortOneClient as jest.Mock).mockReturnValueOnce({ payment: { getPayment: jest.fn() } });

      const res = await request
        .post('/api/appraisals/appraisal-1/verify-payment')
        .set('x-device-id', DEVICE_ID)
        .send({ paymentId: 'portone-payment-id' });

      expect(res.status).toBe(400);
    });

    it('타인 의뢰 접근 시 403', async () => {
      (mockPrisma.appraisal.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'appraisal-1', deviceId: 'other-device', price: 5000, status: 'pending' });
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (PortOne.PortOneClient as jest.Mock).mockReturnValueOnce({ payment: { getPayment: jest.fn() } });

      const res = await request
        .post('/api/appraisals/appraisal-1/verify-payment')
        .set('x-device-id', DEVICE_ID)
        .send({ paymentId: 'portone-payment-id' });

      expect(res.status).toBe(403);
    });
  });
});
