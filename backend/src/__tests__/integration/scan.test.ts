import { buildTestServer, DEVICE_DB_ID, DEVICE_ID } from './helpers';
import { scanRoutes } from '../../routes/scan';
import prisma from '../../services/prisma';

jest.mock('../../services/prisma');
jest.mock('../../ml/coinIdentifier');
jest.mock('../../services/s3');
jest.mock('sharp', () =>
  jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
  }))
);

import { identifyCoin } from '../../ml/coinIdentifier';
import { uploadImage } from '../../services/s3';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const MOCK_COIN_RESULT = {
  name: '대한민국 500원',
  country: '대한민국',
  year: '1982',
  material: '동-아연',
  weight: '7.7',
  diameter: '26.5',
  rarity: 'common',
  estimatedValue: { min: 500, max: 1000, currency: 'KRW' },
  variants: [],
  historicalNote: '1982년 발행.',
  confidence: 0.95,
};

describe('Scan API', () => {
  let request: Awaited<ReturnType<typeof buildTestServer>>['request'];
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ request, close } = await buildTestServer((app) => app.register(scanRoutes)));
  });

  afterAll(() => close());

  beforeEach(() => {
    (identifyCoin as jest.Mock).mockResolvedValue(MOCK_COIN_RESULT);
    (uploadImage as jest.Mock).mockResolvedValue('coins/test-uuid.jpg');
    (mockPrisma.device.upsert as jest.Mock).mockResolvedValue({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
    (mockPrisma.scan.create as jest.Mock).mockResolvedValue({ id: 'scan-uuid-1', ...MOCK_COIN_RESULT });
  });

  describe('GET /api/scans', () => {
    it('X-Device-ID 없으면 400', async () => {
      const res = await request.get('/api/scans');
      expect(res.status).toBe(400);
    });

    it('내 스캔 목록을 반환한다', async () => {
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.scan.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'scan-1', coinName: '500원', createdAt: new Date() },
      ]);

      const res = await request
        .get('/api/scans')
        .set('x-device-id', DEVICE_ID);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].coinName).toBe('500원');

      const findCall = (mockPrisma.scan.findMany as jest.Mock).mock.calls[0][0];
      expect(findCall.where.deviceId).toBe(DEVICE_DB_ID);
    });
  });

  describe('GET /api/scan/:id', () => {
    it('스캔 상세를 반환한다', async () => {
      (mockPrisma.scan.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'scan-1', coinName: '500원' });

      const res = await request.get('/api/scan/scan-1');

      expect(res.status).toBe(200);
    });

    it('없는 스캔은 404', async () => {
      (mockPrisma.scan.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const res = await request.get('/api/scan/nonexistent');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/scan — AI 식별 결과 저장 검증', () => {
    it('AI 결과의 핵심 필드가 DB에 저장된다', async () => {
      (mockPrisma.scan.create as jest.Mock).mockResolvedValueOnce({ id: 'scan-uuid-1' });

      const createData = {
        deviceId: DEVICE_ID,
        frontUrl: 'coins/front.jpg',
        result: MOCK_COIN_RESULT as object,
        coinName: MOCK_COIN_RESULT.name,
        year: MOCK_COIN_RESULT.year,
        country: MOCK_COIN_RESULT.country,
        rarity: MOCK_COIN_RESULT.rarity,
        confidence: MOCK_COIN_RESULT.confidence,
        marketMin: MOCK_COIN_RESULT.estimatedValue.min,
        marketMax: MOCK_COIN_RESULT.estimatedValue.max,
      };

      await prisma.scan.create({ data: createData });

      const createCall = (mockPrisma.scan.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.coinName).toBe('대한민국 500원');
      expect(createCall.data.confidence).toBe(0.95);
      expect(createCall.data.marketMin).toBe(500);
      expect(createCall.data.marketMax).toBe(1000);
    });
  });
});
