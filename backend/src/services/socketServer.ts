import type { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import prisma from './prisma';

export function initSocketIO(httpServer: HttpServer) {
  const io = new IOServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io',
  });

  io.on('connection', (socket) => {
    const deviceId = socket.handshake.auth.deviceId as string;

    // 채팅방 입장
    socket.on('join_room', (roomId: string) => {
      socket.join(roomId);
    });

    // 메시지 전송
    socket.on('send_message', async (data: { roomId: string; text: string }) => {
      if (!deviceId || !data.roomId || !data.text?.trim()) return;

      const room = await prisma.chatRoom.findUnique({ where: { id: data.roomId } });
      if (!room) return;

      const message = await prisma.message.create({
        data: {
          roomId: data.roomId,
          senderDeviceId: deviceId,
          text: data.text.trim(),
        },
      });

      // 같은 방 모든 참여자에게 브로드캐스트
      io.to(data.roomId).emit('new_message', {
        id: message.id,
        senderDeviceId: message.senderDeviceId,
        text: message.text,
        createdAt: message.createdAt,
      });
    });

    socket.on('leave_room', (roomId: string) => {
      socket.leave(roomId);
    });
  });

  return io;
}
