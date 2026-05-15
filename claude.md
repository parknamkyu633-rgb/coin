# 코인 식별 앱 개발 & 배포 파이프라인

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [Phase 1 — 기반 구조 설계](#phase-1--기반-구조-설계)
4. [Phase 2 — 핵심 기능 개발](#phase-2--핵심-기능-개발)
5. [Phase 3 — AI 식별 엔진](#phase-3--ai-식별-엔진)
6. [Phase 4 — 부가 기능 개발](#phase-4--부가-기능-개발)
7. [Phase 5 — 테스트](#phase-5--테스트)
8. [Phase 6 — 배포 파이프라인](#phase-6--배포-파이프라인)
9. [Phase 7 — 출시 후 운영](#phase-7--출시-후-운영)
10. [마일스톤 타임라인](#마일스톤-타임라인)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| 앱 이름 | Heritcoin (가칭) |
| 플랫폼 | Android (우선), iOS (2차) |
| 핵심 가치 | 사진 한 장으로 동전·지폐 즉시 식별 + 시세 + 거래 |
| 수익 모델 | 전문가 감정 유료 서비스, 앱 내 거래 수수료 |

---

## 2. 기술 스택

### Frontend (모바일)
```
React Native (Expo)         — 크로스플랫폼 단일 코드베이스
expo-camera                 — 카메라 접근 및 사진 촬영
expo-image-picker           — 갤러리 이미지 선택
react-navigation            — 화면 전환
zustand                     — 클라이언트 상태 관리
react-query (TanStack)      — 서버 상태 / 캐싱
```

### Backend
```
Node.js + Fastify           — API 서버
PostgreSQL                  — 코인 DB, 거래 기록
Redis                       — 세션 캐시, 시세 캐시
AWS S3                      — 이미지 저장소
Prisma ORM                  — DB 스키마 관리
```

### AI / ML
```
Claude API (claude-sonnet-4-6)  — 이미지 분석 + 종류 식별
Vision 전처리                   — Sharp (Node.js) 이미지 리사이즈/정규화
코인 DB                         — 자체 구축 JSON 데이터셋 (국가별 코인 메타)
```

### 인프라 / DevOps
```
AWS EC2 / ECS               — 백엔드 서버
AWS RDS (PostgreSQL)        — 관리형 DB
GitHub Actions              — CI/CD
Docker                      — 컨테이너화
Expo EAS Build              — 앱 빌드 & OTA 업데이트
Sentry                      — 에러 모니터링
```

---

## Phase 1 — 기반 구조 설계

### 1-1. 프로젝트 초기화
- [ ] Expo 프로젝트 생성 (`npx create-expo-app`)
- [ ] ESLint + Prettier + TypeScript 설정
- [ ] Git 리포지토리 초기화, `.gitignore` 설정
- [ ] 폴더 구조 정의

```
/app
  /screens          — 화면 컴포넌트
  /components       — 재사용 UI
  /hooks            — 커스텀 훅
  /services         — API 호출
  /store            — zustand 상태
  /assets           — 이미지, 폰트
/backend
  /src
    /routes         — API 라우트
    /services       — 비즈니스 로직
    /models         — Prisma 모델
    /ml             — AI 식별 로직
/data
  /coins            — 코인 메타데이터 JSON
```

### 1-2. 백엔드 기반
- [ ] Fastify 서버 초기화
- [ ] Prisma 스키마 설계 (아래 참고)
- [ ] PostgreSQL 연결 및 마이그레이션
- [ ] AWS S3 버킷 생성 및 업로드 유틸 작성
- [ ] 환경변수 관리 (`.env`, AWS Secrets Manager)

#### 핵심 DB 스키마
```prisma
model Device {
  id        String   @id @default(uuid())
  deviceId  String   @unique       // 기기 고유 ID (회원가입 불필요)
  createdAt DateTime @default(now())
  scans     Scan[]
  listings  Listing[]
}

model Scan {
  id         String   @id @default(uuid())
  deviceId   String
  imageUrl   String
  result     Json     // AI 분석 결과 전체
  coinName   String?
  year       String?
  country    String?
  rarity     String?
  marketVal  Float?
  createdAt  DateTime @default(now())
  device     Device   @relation(fields: [deviceId], references: [id])
}

model Listing {
  id          String   @id @default(uuid())
  deviceId    String
  scanId      String?
  title       String
  price       Float
  imageUrls   String[]
  description String?
  status      String   @default("active")  // active | sold | removed
  createdAt   DateTime @default(now())
  device      Device   @relation(fields: [deviceId], references: [id])
}

model CoinMeta {
  id        String @id
  name      String
  country   String
  year      String
  material  String
  weight    Float?
  diameter  Float?
  rarity    String  // common | uncommon | rare | very_rare
  variants  Json?   // 소형/대형 날짜, 프루프 등 변종 정보
  imageRef  String?
}
```

---

## Phase 2 — 핵심 기능 개발

### 2-1. 기기 자동 계정 (회원가입 불필요)
- [ ] 앱 최초 실행 시 UUID 생성 → AsyncStorage 저장
- [ ] 모든 API 요청에 `X-Device-ID` 헤더 포함
- [ ] 백엔드에서 Device 레코드 자동 upsert

```typescript
// services/device.ts
import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync('device_id');
  if (!id) {
    id = uuidv4();
    await SecureStore.setItemAsync('device_id', id);
  }
  return id;
}
```

### 2-2. 카메라 & 이미지 입력 화면
- [ ] 카메라 전/후면 전환
- [ ] 앞면/뒷면 2장 연속 촬영 UX
- [ ] 갤러리에서 불러오기 옵션
- [ ] 이미지 품질 가이드 오버레이 (원형 가이드라인)
- [ ] 촬영 후 확인 → 재촬영 or 분석 시작

### 2-3. 이미지 업로드 API
```
POST /api/scan
Header: X-Device-ID
Body: multipart/form-data
  front: File
  back:  File (optional)

Response:
  scanId: string
  status: "processing" | "done"
```

- [ ] Sharp로 이미지 리사이즈 (max 1024px, JPEG 85%)
- [ ] AWS S3 업로드
- [ ] 분석 결과 DB 저장

---

## Phase 3 — AI 식별 엔진

### 3-1. Claude API 연동
- [ ] `@anthropic-ai/sdk` 설치
- [ ] Prompt 엔지니어링 (아래 템플릿 기준)
- [ ] 응답 JSON 파싱 및 검증
- [ ] 분석 실패 시 fallback 처리

#### 식별 프롬프트 설계
```typescript
// backend/src/ml/coinIdentifier.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function identifyCoin(frontImageB64: string, backImageB64?: string) {
  const images = [
    { type: 'base64', media_type: 'image/jpeg', data: frontImageB64 }
  ];
  if (backImageB64) {
    images.push({ type: 'base64', media_type: 'image/jpeg', data: backImageB64 });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `당신은 세계 동전 및 지폐 전문 감정사입니다.
이미지를 분석하여 반드시 아래 JSON 형식으로만 응답하세요.
변종(소형/대형 날짜, 프루프 등)이 식별되면 variants 배열에 포함하세요.`,
    messages: [{
      role: 'user',
      content: [
        ...images.map(img => ({ type: 'image', source: img })),
        {
          type: 'text',
          text: `이 동전/지폐를 분석하고 다음 JSON으로 응답하세요:
{
  "name": "정식 명칭",
  "country": "발행 국가",
  "year": "발행 연도",
  "material": "재질",
  "weight": "무게(g)",
  "diameter": "지름(mm)",
  "rarity": "common | uncommon | rare | very_rare",
  "estimatedValue": { "min": 0, "max": 0, "currency": "KRW" },
  "variants": ["프루프", "소형날짜"],
  "historicalNote": "역사적 의의 (2문장 이내)",
  "confidence": 0.95
}`
        }
      ]
    }]
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
}
```

### 3-2. 코인 메타 DB 매칭
- [ ] AI 응답 결과를 자체 CoinMeta DB와 매칭
- [ ] 신뢰도(confidence) 기준 표시 레벨 결정
  - `>= 0.85` → 확정 결과 표시
  - `0.6 ~ 0.85` → "유사 코인" 후보 목록 제시
  - `< 0.6` → "전문가 감정 권장" 안내

### 3-3. 결과 화면 UI
- [ ] 코인 이름, 국가, 연도 카드
- [ ] 재질, 무게, 지름 정보
- [ ] 희귀도 뱃지 (색상 구분)
- [ ] 시장 가치 범위 표시
- [ ] 변종 태그 표시
- [ ] 역사적 의의 섹션
- [ ] "전문가 감정 의뢰" CTA 버튼

---

## Phase 4 — 부가 기능 개발

### 4-1. 전문가 감정 서비스
- [ ] 감정 의뢰 폼 (상태, 추가 사진, 문의 내용)
- [ ] 결제 연동 (PortOne / Stripe)
  - 기본 감정: ₩5,000
  - 정밀 감정: ₩15,000
- [ ] 감정사 어드민 패널 (웹, Next.js)
- [ ] 감정 결과 알림 (FCM Push)
- [ ] 감정 인증서 PDF 발급

### 4-2. 시세 및 역사 정보
- [ ] 시세 데이터 수집 파이프라인
  - 크롤링 대상: 주요 경매 사이트 공개 낙찰가
  - 주 1회 배치 업데이트 (GitHub Actions cron)
- [ ] 코인별 가격 히스토리 차트 (Victory Native)
- [ ] "이 달의 인기 코인" 큐레이션 섹션

### 4-3. 앱 내 거래
- [ ] 매물 등록 화면
  - 스캔 결과 자동 채우기 옵션
  - 가격 입력, 설명, 추가 사진
- [ ] 매물 목록 / 검색 / 필터
  - 국가, 연도, 희귀도, 가격대
- [ ] 매물 상세 페이지
- [ ] 채팅 (Socket.IO)
- [ ] 거래 완료 처리 + 수수료 정산 (3%)

### 4-4. 내 컬렉션
- [ ] 스캔 기록 목록
- [ ] 컬렉션 보관함 (북마크)
- [ ] 통계: 총 스캔 수, 희귀 코인 수, 예상 자산 가치

---

## Phase 5 — 테스트

### 5-1. 단위 테스트
```bash
# 백엔드
npm run test          # Jest
# 커버리지 목표: 핵심 서비스 로직 70% 이상
```
- [ ] AI 응답 파싱 로직
- [ ] 이미지 업로드 유틸
- [ ] 거래 수수료 계산 로직

### 5-2. 통합 테스트
- [ ] `/api/scan` 전체 플로우 (업로드 → AI 분석 → DB 저장)
- [ ] 거래 생성 → 완료 플로우
- [ ] 기기 ID 자동 생성 플로우

### 5-3. AI 식별 정확도 검증
- [ ] 테스트 코인 이미지 100종 수집
- [ ] 정확도 측정 스크립트 작성
- [ ] 목표: 일반 유통 동전 정확도 90% 이상

### 5-4. 모바일 E2E 테스트
- [ ] Detox 설정
- [ ] 핵심 플로우: 촬영 → 분석 → 결과 확인
- [ ] 거래 등록 플로우

---

## Phase 6 — 배포 파이프라인

### 6-1. CI 설정 (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd backend && npm ci
      - run: cd backend && npm test

  mobile-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd app && npm ci
      - run: cd app && npx tsc --noEmit
```

### 6-2. CD 설정

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths: ['backend/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t coin-api ./backend
      - name: Push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY
          docker tag coin-api:latest $ECR_REGISTRY/coin-api:$GITHUB_SHA
          docker push $ECR_REGISTRY/coin-api:$GITHUB_SHA
      - name: Deploy to ECS
        run: aws ecs update-service --cluster coin-cluster --service coin-api --force-new-deployment
```

```yaml
# .github/workflows/deploy-app.yml
name: Deploy App (EAS)

on:
  push:
    branches: [main]
    paths: ['app/**']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd app && npm ci
      - run: cd app && eas build --platform android --non-interactive
      - run: cd app && eas submit --platform android --non-interactive
```

### 6-3. 인프라 구성

```
[사용자 앱]
    │
    ▼
[AWS CloudFront]  ← 이미지 CDN (S3 origin)
    │
[AWS ALB]
    │
[ECS Fargate]  ← coin-api 컨테이너 (Auto Scaling)
    │
    ├── [AWS RDS PostgreSQL]  (Multi-AZ)
    ├── [ElastiCache Redis]   (시세 캐시, 세션)
    └── [AWS S3]              (이미지 원본)
```

### 6-4. 환경 분리

| 환경 | 브랜치 | 용도 |
|------|--------|------|
| dev | `develop` | 개발 테스트 |
| staging | `release/*` | QA, 검수 |
| production | `main` | 실 서비스 |

### 6-5. Google Play 출시 체크리스트
- [ ] 앱 서명 키스토어 생성 및 안전 보관
- [ ] EAS Credentials 설정
- [ ] 스토어 리소스 준비
  - 아이콘 512×512, 피처드 이미지 1024×500
  - 스크린샷 최소 2장 (폰/태블릿)
  - 앱 설명 (한/영)
- [ ] 개인정보처리방침 URL 등록
- [ ] 콘텐츠 등급 설문 완료
- [ ] 내부 테스트 → 비공개 테스트 → 공개 출시 단계적 롤아웃

---

## Phase 7 — 출시 후 운영

### 7-1. 모니터링
- [ ] Sentry 에러 알림 (Slack 연동)
- [ ] AWS CloudWatch 대시보드
  - API 응답 시간 P95 < 2초
  - AI 분석 응답 시간 P95 < 5초
  - 에러율 < 1%
- [ ] 일간/주간 리텐션 지표 추적

### 7-2. AI 모델 품질 관리
- [ ] 사용자 피드백 ("틀린 결과" 신고) 수집
- [ ] 주간 오식별 케이스 리뷰
- [ ] 프롬프트 개선 이력 관리 (`/prompts` 버전 관리)

### 7-3. 데이터 보안
- [ ] 이미지 30일 후 자동 삭제 (S3 Lifecycle)
- [ ] 기기 ID 기반이므로 개인정보 최소 수집
- [ ] API 요청 Rate Limiting (기기당 분당 10회)
- [ ] S3 이미지 URL 서명된 URL (1시간 만료)

---

## 마일스톤 타임라인

```
Week 1-2   ████████░░░░░░░░░░░░░░░  Phase 1: 기반 구조
Week 3-4   ░░░░████████░░░░░░░░░░░  Phase 2: 핵심 기능 (카메라, 계정)
Week 5-6   ░░░░░░░░████████░░░░░░░  Phase 3: AI 식별 엔진
Week 7-8   ░░░░░░░░░░░░████████░░░  Phase 4: 부가 기능
Week 9     ░░░░░░░░░░░░░░░░████░░░  Phase 5: 테스트
Week 10    ░░░░░░░░░░░░░░░░░░████░  Phase 6: 배포
Week 11+   ░░░░░░░░░░░░░░░░░░░░███  Phase 7: 운영
```

| 마일스톤 | 목표일 | 완료 기준 |
|----------|--------|-----------|
| MVP (촬영+AI식별) | +3주 | 코인 사진 → 결과 화면 동작 |
| Beta (거래 포함) | +7주 | 10명 내부 테스터 사용 가능 |
| Google Play 출시 | +10주 | 스토어 공개 배포 |
| iOS 출시 | +14주 | App Store 공개 배포 |

---

## 빠른 시작 명령어

```bash
# 백엔드 로컬 실행
cd backend
npm install
cp .env.example .env   # 환경변수 입력
npx prisma migrate dev
npm run dev

# 모바일 앱 로컬 실행
cd app
npm install
npx expo start

# 전체 도커 로컬 환경
docker compose up -d   # PostgreSQL + Redis
```
