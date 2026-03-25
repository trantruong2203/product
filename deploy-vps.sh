#!/bin/bash
# deploy-vps.sh - Deploy GEO SaaS lên VPS

set -e

echo "============================================"
echo "GEO SaaS - Deployment Script"
echo "============================================"

# 1. Clone or pull code
if [ -d "~/product" ]; then
    echo "📥 Pulling latest code..."
    cd ~/product
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone <your-repo-url> ~/product
    cd ~/product
fi

# 2. Copy environment file
echo "📝 Setting up environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.production" ]; then
        cp .env.production .env
        echo "⚠️ Đã tạo .env từ .env.production"
        echo "⚠️ VUI LÒNG CHỈNH SỬA .env VỚI CREDENTIALS THỰC TẾ!"
    fi
fi

# 3. Build Docker images
echo "🔨 Building Docker images..."
docker compose -f docker-compose.prod.yml build

# 4. Start services
echo "🚀 Starting services..."
docker compose -f docker-compose.prod.yml up -d

# 5. Wait for services to be ready
echo "⏳ Waiting for services..."
sleep 10

# 6. Check status
echo "📊 Service Status:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo "============================================"
echo "Deployment hoàn tất!"
echo "============================================"
echo ""
echo "Để đăng nhập vào AI engines (chạy từng lệnh):"
echo ""
echo "  # Đăng nhập Gemini:"
echo "  docker exec geo_saas_worker npx tsx src/scripts/loginGemini.ts"
echo ""
echo "  # Đăng nhập ChatGPT:"
echo "  docker exec geo_saas_worker npx tsx src/scripts/loginChatgpt.ts"
echo ""
echo "  # Đăng nhập Claude:"
echo "  docker exec geo_saas_worker npx tsx src/scripts/loginClaude.ts"
echo ""
echo "Lưu ý: Đảm bảo credentials đã được đặt trong .env trước khi chạy!"
echo ""
