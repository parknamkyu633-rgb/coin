import 'dotenv/config';
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import rateLimit from '@fastify/rate-limit';
import path from 'path';
import fs from 'fs';
import { scanRoutes } from './routes/scan';
import { listingRoutes } from './routes/listings';
import { appraisalRoutes } from './routes/appraisal';
import { chatRoutes } from './routes/chat';
import { uploadRoutes } from './routes/upload';
import { deviceRoutes } from './routes/devices';
import { initSocketIO } from './services/socketServer';

const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = Fastify({ logger: true });

if (process.env.SENTRY_DSN) {
  Sentry.setupFastifyErrorHandler(app);
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : [];

app.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ALLOWED_ORIGINS
    : true,
});
app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
app.register(rateLimit, {
  global: false, // 라우트별로 개별 적용
});
app.register(staticFiles, { root: UPLOADS_DIR, prefix: '/uploads/' });

app.setErrorHandler((error: FastifyError, req, reply) => {
  req.log.error({ err: error }, 'Unhandled error');
  const status = error.statusCode ?? 500;
  if (status >= 500) Sentry.captureException(error);
  reply.status(status).send({
    error: status < 500 ? error.message : '서버 오류가 발생했습니다.',
  });
});

app.register(scanRoutes);
app.register(listingRoutes);
app.register(appraisalRoutes);
app.register(chatRoutes);
app.register(uploadRoutes);
app.register(deviceRoutes);

app.get('/', async () => ({
  name: 'Heritcoin API',
  status: 'ok',
  health: '/health',
}));

app.get('/health', async () => ({ status: 'ok', version: '1.0.1' }));

app.get('/privacy', async (_req, reply) => {
  reply.type('text/html; charset=utf-8').send(`<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Heritcoin 개인정보처리방침</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.7; }
  h1 { color: #1a1a2e; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
  h2 { color: #0f3460; margin-top: 30px; }
  table { border-collapse: collapse; width: 100%; margin: 16px 0; }
  td, th { border: 1px solid #ddd; padding: 8px 12px; }
  th { background: #f8f9fa; }
  .updated { color: #888; font-size: 0.9em; }
</style>
</head>
<body>
<h1>Heritcoin 개인정보처리방침</h1>
<p class="updated">최종 업데이트: 2026년 5월 25일 &nbsp;·&nbsp; 시행일: 2026년 6월 1일</p>

<p>Heritcoin(이하 "앱")은 사용자의 개인정보를 소중히 여기며, 개인정보 보호법 및 관련 법령을 준수합니다.</p>

<h2>1. 수집하는 정보</h2>
<table>
  <tr><th>항목</th><th>수집 방법</th><th>목적</th></tr>
  <tr><td>기기 고유 ID (UUID)</td><td>앱 최초 실행 시 자동 생성</td><td>회원가입 없이 서비스 제공</td></tr>
  <tr><td>촬영·업로드한 코인 이미지</td><td>사용자 직접 촬영 또는 갤러리 선택</td><td>AI 코인 식별 분석</td></tr>
  <tr><td>푸시 알림 토큰</td><td>알림 허용 시 자동 수집</td><td>감정 결과 알림 발송</td></tr>
  <tr><td>결제 정보</td><td>PortOne(포트원) 결제 모듈 경유</td><td>전문가 감정 서비스 결제 처리</td></tr>
</table>
<p>이름, 이메일, 전화번호 등 식별 가능한 개인정보는 <strong>수집하지 않습니다.</strong></p>

<h2>2. 정보의 이용 목적</h2>
<ul>
  <li>AI 코인 식별 서비스 제공</li>
  <li>전문가 감정 서비스 처리 및 결과 알림</li>
  <li>코인 거래 마켓 운영</li>
  <li>서비스 품질 개선 및 오류 수정</li>
</ul>

<h2>3. 정보의 보관 및 삭제</h2>
<ul>
  <li>업로드한 이미지: <strong>30일 후 자동 삭제</strong> (AWS S3 Lifecycle 정책)</li>
  <li>스캔 결과 데이터: 서비스 탈퇴 요청 시 즉시 삭제</li>
  <li>결제 정보: PortOne에서 관리하며, 앱 서버에는 결제 승인 여부만 저장</li>
</ul>

<h2>4. 제3자 서비스</h2>
<table>
  <tr><th>서비스</th><th>용도</th><th>개인정보처리방침</th></tr>
  <tr><td>Anthropic Claude API</td><td>코인 이미지 AI 분석</td><td>anthropic.com/privacy</td></tr>
  <tr><td>AWS (Amazon Web Services)</td><td>이미지 저장 (S3), 서버 운영 (EC2)</td><td>aws.amazon.com/privacy</td></tr>
  <tr><td>PortOne (포트원)</td><td>결제 처리</td><td>portone.io/privacy</td></tr>
  <tr><td>Sentry</td><td>앱 오류 모니터링</td><td>sentry.io/privacy</td></tr>
  <tr><td>Expo (EAS)</td><td>앱 빌드 및 푸시 알림</td><td>expo.dev/privacy</td></tr>
</table>

<h2>5. 사용자 권리</h2>
<p>기기 ID 기반 서비스이므로 별도 계정이 없습니다. 데이터 삭제를 원하시면 아래 이메일로 기기 ID를 포함해 요청해 주세요.</p>

<h2>6. 문의</h2>
<p>개인정보 관련 문의: <a href="mailto:parknamkyu633@gmail.com">parknamkyu633@gmail.com</a></p>

<h2>7. 변경 고지</h2>
<p>방침 변경 시 앱 내 공지 또는 이 페이지를 통해 사전 안내합니다.</p>
</body>
</html>`);
});

const PORT = Number(process.env.PORT ?? 3000);

app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  // Fastify의 내장 http.Server에 Socket.IO 연결
  initSocketIO(app.server);
});
