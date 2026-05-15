import { FastifyInstance } from 'fastify';
import prisma from '../services/prisma';
import { validateDeviceId } from '../utils/validateDeviceId';

export async function listingRoutes(app: FastifyInstance) {
  app.get('/api/listings', async (req, reply) => {
    const { minPrice, maxPrice, q } = req.query as Record<string, string>;

    const all = await prisma.listing.findMany({
      where: {
        status: 'active',
        ...(minPrice || maxPrice
          ? { price: { ...(minPrice ? { gte: Number(minPrice) } : {}), ...(maxPrice ? { lte: Number(maxPrice) } : {}) } }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    // SQLite는 mode:insensitive 미지원 → JS에서 필터
    const listings = q
      ? all.filter((l) => l.title.toLowerCase().includes(q.toLowerCase()))
      : all;

    const parsed = listings.map(parseListingImages);

    return reply.send(parsed);
  });

  app.post('/api/listings', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const { title, price, description, scanId, imageUrls } = req.body as {
      title: string;
      price: number;
      description?: string;
      scanId?: string;
      imageUrls?: string[];
    };

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return reply.status(400).send({ error: '제목을 입력하세요.' });
    }
    if (typeof price !== 'number' || price <= 0) {
      return reply.status(400).send({ error: '유효한 가격을 입력하세요.' });
    }

    const device = await prisma.device.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId },
    });

    const listing = await prisma.listing.create({
      data: {
        deviceId: device.id,
        title,
        price,
        description,
        scanId,
        imageUrls: JSON.stringify(imageUrls ?? []),
      },
    });
    return reply.status(201).send({
      ...listing,
      imageUrls: (() => { try { return JSON.parse(listing.imageUrls); } catch { return []; } })(),
    });
  });

  app.patch('/api/listings/:id/sold', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const device = await prisma.device.findUnique({ where: { deviceId } });
    if (!device) return reply.status(403).send({ error: '권한 없음' });

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) return reply.status(404).send({ error: '매물 없음' });
    if (listing.deviceId !== device.id) return reply.status(403).send({ error: '권한 없음' });

    await prisma.listing.update({ where: { id }, data: { status: 'sold' } });
    return reply.send({ ok: true });
  });
}

function parseListingImages<T extends { imageUrls: string | string[] }>(listing: T) {
  return {
    ...listing,
    imageUrls: (() => {
      if (Array.isArray(listing.imageUrls)) return listing.imageUrls;
      try {
        return JSON.parse(listing.imageUrls);
      } catch {
        return [];
      }
    })(),
  };
}
