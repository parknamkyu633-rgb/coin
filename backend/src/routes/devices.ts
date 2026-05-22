import { FastifyInstance } from 'fastify';
import { Expo } from 'expo-server-sdk';
import prisma from '../services/prisma';
import { validateDeviceId } from '../utils/validateDeviceId';

export async function deviceRoutes(app: FastifyInstance) {
  app.post('/api/devices/token', async (req, reply) => {
    const deviceId = req.headers['x-device-id'] as string;
    if (!validateDeviceId(deviceId, reply)) return;

    const { pushToken } = req.body as { pushToken: string };

    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      return reply.status(400).send({ error: '유효하지 않은 푸시 토큰' });
    }

    await prisma.device.upsert({
      where: { deviceId },
      update: { pushToken },
      create: { deviceId, pushToken },
    });

    return reply.send({ ok: true });
  });
}
