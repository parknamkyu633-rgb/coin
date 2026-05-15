#!/bin/bash
# EC2 초기 서버 세팅 스크립트
# Ubuntu 22.04 LTS 기준
# 실행: chmod +x setup-ec2.sh && sudo bash setup-ec2.sh

set -e

DOMAIN="api.heritcoin.com"
APP_DIR="/opt/heritcoin"
REPO_URL="https://github.com/YOUR_USERNAME/heritcoin.git"   # ← 실제 레포 주소로 변경

echo "=== 1. 패키지 업데이트 ==="
apt-get update && apt-get upgrade -y

echo "=== 2. Docker 설치 ==="
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable docker

echo "=== 3. Nginx + Certbot 설치 ==="
apt-get install -y nginx certbot python3-certbot-nginx

echo "=== 4. 앱 디렉터리 설정 ==="
mkdir -p "$APP_DIR"
git clone "$REPO_URL" "$APP_DIR"
cd "$APP_DIR"

echo "=== 5. 환경변수 파일 생성 ==="
cat > "$APP_DIR/backend/.env" << 'EOF'
DATABASE_URL=postgresql://user:CHANGE_ME@postgres:5432/heritcoin
ANTHROPIC_API_KEY=sk-ant-CHANGE_ME
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
AWS_S3_BUCKET=heritcoin-images
PORT=3000
NODE_ENV=production
ALLOWED_ORIGINS=
EOF
echo ">>> backend/.env 생성됨 — 실제 값으로 편집하세요: nano $APP_DIR/backend/.env"

echo "=== 6. Nginx 설정 복사 ==="
# 도메인 이름을 실제 값으로 교체
sed "s/api.heritcoin.com/$DOMAIN/g" "$APP_DIR/deploy/nginx.conf" \
  > /etc/nginx/sites-available/heritcoin
ln -sf /etc/nginx/sites-available/heritcoin /etc/nginx/sites-enabled/heritcoin
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== 7. SSL 인증서 발급 (Let's Encrypt) ==="
echo ">>> 도메인 DNS가 이 서버 IP를 가리키고 있어야 합니다."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m parknamkyu633@gmail.com
systemctl enable certbot.timer

echo "=== 8. Docker 서비스 시작 ==="
cd "$APP_DIR"
docker compose --profile full up -d
docker compose --profile full exec api npx prisma migrate deploy

echo "=== 9. GitHub Actions 배포에 필요한 SSH 공개키 출력 ==="
echo ">>> 아래 내용을 GitHub Secrets에 추가하세요:"
echo "    EC2_HOST  = $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)"
echo "    EC2_USER  = ubuntu"
echo "    EC2_SSH_KEY = (로컬에서 생성한 SSH 개인키)"

echo ""
echo "=== 완료! ==="
echo "API 확인: https://$DOMAIN/health"
