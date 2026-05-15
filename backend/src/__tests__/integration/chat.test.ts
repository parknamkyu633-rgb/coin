import { buildTestServer, DEVICE_ID, DEVICE_ID_2 } from './helpers';
import { chatRoutes } from '../../routes/chat';
import prisma from '../../services/prisma';

jest.mock('../../services/prisma');

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Chat API', () => {
  let request: Awaited<ReturnType<typeof buildTestServer>>['request'];
  let close: () => Promise<void>;

  beforeAll(async () => {
    ({ request, close } = await buildTestServer((app) => app.register(chatRoutes)));
  });

  afterAll(() => close());

  describe('POST /api/chat/rooms', () => {
    it('X-Device-ID 없으면 400', async () => {
      const res = await request
        .post('/api/chat/rooms')
        .send({ listingId: 'listing-1' });

      expect(res.status).toBe(400);
    });

    it('존재하지 않는 매물로 채팅방 생성 시 404', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const res = await request
        .post('/api/chat/rooms')
        .set('x-device-id', DEVICE_ID)
        .send({ listingId: 'nonexistent' });

      expect(res.status).toBe(404);
    });

    it('채팅방을 생성하고 roomId를 반환한다', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'listing-1', title: '500원 동전' });
      (mockPrisma.chatRoom.upsert as jest.Mock).mockResolvedValueOnce({ id: 'room-uuid-1', listingId: 'listing-1' });

      const res = await request
        .post('/api/chat/rooms')
        .set('x-device-id', DEVICE_ID)
        .send({ listingId: 'listing-1' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ roomId: 'room-uuid-1' });
    });

    it('같은 매물에 두 번 요청해도 같은 방(upsert)을 반환한다', async () => {
      (mockPrisma.listing.findUnique as jest.Mock).mockResolvedValue({ id: 'listing-1' });
      (mockPrisma.chatRoom.upsert as jest.Mock).mockResolvedValue({ id: 'room-uuid-1', listingId: 'listing-1' });

      const [res1, res2] = await Promise.all([
        request.post('/api/chat/rooms').set('x-device-id', DEVICE_ID).send({ listingId: 'listing-1' }),
        request.post('/api/chat/rooms').set('x-device-id', DEVICE_ID_2).send({ listingId: 'listing-1' }),
      ]);

      expect(res1.body.roomId).toBe(res2.body.roomId);
    });
  });

  describe('GET /api/chat/rooms/:roomId/messages', () => {
    it('메시지 이력을 반환한다', async () => {
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValueOnce([
        { id: 'msg-1', roomId: 'room-uuid-1', senderDeviceId: DEVICE_ID,    text: '안녕하세요, 아직 판매 중인가요?', createdAt: new Date('2026-05-10T10:00:00') },
        { id: 'msg-2', roomId: 'room-uuid-1', senderDeviceId: 'other-device', text: '네, 판매 중입니다.',              createdAt: new Date('2026-05-10T10:01:00') },
      ]);

      const res = await request.get('/api/chat/rooms/room-uuid-1/messages');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].text).toBe('안녕하세요, 아직 판매 중인가요?');
    });

    it('메시지가 없으면 빈 배열 반환', async () => {
      (mockPrisma.message.findMany as jest.Mock).mockResolvedValueOnce([]);

      const res = await request.get('/api/chat/rooms/empty-room/messages');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
