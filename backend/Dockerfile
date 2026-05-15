# ---- build stage ----
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---- production stage ----
FROM node:20-slim AS runner

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# prod 의존성만 설치 + Prisma 클라이언트 재생성 (Linux 네이티브 바이너리)
RUN npm ci --omit=dev && npx prisma generate

COPY --from=builder /app/dist ./dist/

RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
