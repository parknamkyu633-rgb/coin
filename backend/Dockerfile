# ---- build stage ----
FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci

RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

# ---- production stage ----
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist/

# Prisma 생성 파일(JS + 네이티브 바이너리)을 dist/generated 로 복사
COPY --from=builder /app/src/generated ./dist/generated

RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
