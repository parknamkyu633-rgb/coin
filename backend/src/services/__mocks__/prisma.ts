// services/prisma 의 Jest 자동 manual mock
const prisma = {
  device: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  scan: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  listing: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  appraisal: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  chatRoom: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
  },
  message: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

export default prisma;
