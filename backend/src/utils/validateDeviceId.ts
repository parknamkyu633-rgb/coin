import { FastifyReply } from 'fastify';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateDeviceId(
  deviceId: string | undefined,
  reply: FastifyReply
): deviceId is string {
  if (!deviceId || !UUID_RE.test(deviceId)) {
    reply.status(400).send({ error: '유효하지 않은 X-Device-ID' });
    return false;
  }
  return true;
}
