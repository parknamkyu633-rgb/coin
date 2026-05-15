import { buildTestServer, DEVICE_DB_ID, DEVICE_ID } from './helpers';
import { listingRoutes } from '../../routes/listings';
import prisma from '../../services/prisma';

jest.mock('../../services/prisma');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Listings API', () => {
  let request: Awaited<ReturnType<typeof buildTestServer>>['request'];
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ request, close } = await buildTestServer((app) => app.register(listingRoutes)));
  });

  afterAll(() => close());

  describe('GET /api/listings', () => {
    it('active 매물 목록을 반환한다', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([
        {
          id: 'listing-1',
          deviceId: DEVICE_DB_ID,
          title: '500원 동전 1982년',
          price: 3000,
          imageUrls: '[]',
          description: '상태 양호',
          status: 'active',
          createdAt: new Date(),
        },
      ]);

      const res = await request.get('/api/listings');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('500원 동전 1982년');
    });

    it('검색어 q가 있으면 필터가 적용된다', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'listing-1', deviceId: DEVICE_DB_ID, title: '1달러 1971년',  price: 5000, imageUrls: '[]', status: 'active', createdAt: new Date() },
        { id: 'listing-2', deviceId: DEVICE_DB_ID, title: '500원 동전',    price: 3000, imageUrls: '[]', status: 'active', createdAt: new Date() },
      ]);

      const res = await request.get('/api/listings?q=달러');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('1달러 1971년');
    });

    it('가격 범위 필터가 적용된다', async () => {
      (mockPrisma.listing.findMany as jest.Mock).mockResolvedValueOnce([]);

      await request.get('/api/listings?minPrice=1000&maxPrice=10000');

      const callArgs = (mockPrisma.listing.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.price).toEqual({ gte: 1000, lte: 10000 });
    });
  });

  describe('POST /api/listings', () => {
    it('X-Device-ID 없으면 400 반환', async () => {
      const res = await request
        .post('/api/listings')
        .send({ title: '테스트', price: 1000, imageUrls: [] });

      expect(res.status).toBe(400);
    });

    it('매물을 생성한다', async () => {
      (mockPrisma.device.upsert as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.listing.create as jest.Mock).mockResolvedValueOnce({
        id: 'new-listing-id',
        deviceId: DEVICE_DB_ID,
        title: '1달러 1971년',
        price: 5000,
        imageUrls: '[]',
        description: '희귀 동전',
        status: 'active',
        createdAt: new Date(),
      });

      const res = await request
        .post('/api/listings')
        .set('x-device-id', DEVICE_ID)
        .send({ title: '1달러 1971년', price: 5000, description: '희귀 동전', imageUrls: [] });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('new-listing-id');
      expect(res.body.title).toBe('1달러 1971년');
    });
  });

  describe('PATCH /api/listings/:id/sold', () => {
    it('본인 매물을 sold로 변경한다', async () => {
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'listing-1', deviceId: DEVICE_DB_ID, status: 'active' });
      (mockPrisma.listing.update as jest.Mock).mockResolvedValueOnce({});

      const res = await request
        .patch('/api/listings/listing-1/sold')
        .set('x-device-id', DEVICE_ID);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('타인 매물 변경 시도 시 403 반환', async () => {
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'listing-2', deviceId: 'other-device-id', status: 'active' });

      const res = await request
        .patch('/api/listings/listing-2/sold')
        .set('x-device-id', DEVICE_ID);

      expect(res.status).toBe(403);
    });

    it('존재하지 않는 매물은 404 반환', async () => {
      (mockPrisma.device.findUnique as jest.Mock).mockResolvedValueOnce({ id: DEVICE_DB_ID, deviceId: DEVICE_ID });
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const res = await request
        .patch('/api/listings/nonexistent/sold')
        .set('x-device-id', DEVICE_ID);

      expect(res.status).toBe(404);
    });
  });
});
