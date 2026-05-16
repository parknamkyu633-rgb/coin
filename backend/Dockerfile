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

RUN npm ci --omit=dev

# builder에서 생성된 Prisma 클라이언트 복사
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=builder /app/dist ./dist/

RUN mkdir -p uploads

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
