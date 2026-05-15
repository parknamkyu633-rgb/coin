import { FastifyInstance } from 'fastify';
import prisma from '../services/prisma';
import { validateDeviceId } from '../utils/validateDeviceId';

export async function chatRoutes(app: FastifyInstance) {
  // 채팅방 생성 또는 조회 (매물당 1개)
  app.post('/api/chat/rooms', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const { listingId } = req.body as { listingId: string };

    if (!listingId || typeof listingId !== 'string') {
      return reply.status(400).send({ error: 'listingId가 필요합니다.' });
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return reply.status(404).send({ error: '매물 없음' });

    const room = await prisma.chatRoom.upsert({
      where: { listingId },
      update: {},
      create: { listingId },
    });

    return reply.send({ roomId: room.id });
  });

  // 메시지 이력 조회 (최근 50개)
  app.get('/api/chat/rooms/:roomId/messages', async (req, reply) => {
    const { roomId } = req.params as { roomId: string };
    const messages = await prisma.message.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    return reply.send(messages);
  });
}
