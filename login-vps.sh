#!/bin/bash
# login-vps.sh - Chạy script đăng nhập AI engines trên VPS
# 
# Script này chạy trong container Docker với X11 forwarding
# để hiển thị trình duyệt trên máy local
#

set -e

echo "============================================"
echo "GEO SaaS - AI Engine Login Scripts"
echo "============================================"
echo ""
echo "⚠️  LƯU Ý: Cần X11 forwarding để chạy script này!"
echo ""
echo "Trên máy local, chạy lệnh sau trước khi SSH:"
echo "  # Linux/Mac:"
echo "  ssh -X user@vps-server"
echo ""
echo "  # Windows (cần Xming hoặc VcXsrv):"
echo "  ssh -X user@vps-server"
echo ""
echo "Hoặc sử dụng noVNC/Xpra để truy cập GUI từ xa."
echo ""
echo "============================================"
echo ""

# Kiểm tra credentials trong .env
echo "📋 Kiểm tra credentials..."

if grep -q "GEMINI_EMAIL=your" .env 2>/dev/null; then
    echo "⚠️  GEMINI credentials chưa được cấu hình!"
fi

if grep -q "CHATGPT_EMAIL=your" .env 2>/dev/null; then
    echo "⚠️  CHATGPT credentials chưa được cấu hình!"
fi

if grep -q "CLAUDE_EMAIL=your" .env 2>/dev/null; then
    echo "⚠️  CLAUDE credentials chưa được cấu hình!"
fi

echo ""
echo "============================================"
echo "Menu đăng nhập:"
echo ""
echo "1) Đăng nhập Gemini"
echo "2) Đăng nhập ChatGPT"
echo "3) Đăng nhập Claude"
echo "4) Đăng nhập tất cả (lần lượt)"
echo "5) Thoát"
echo ""
read -p "Chọn tùy chọn [1-5]: " choice

case $choice in
    1)
        echo "Đang đăng nhập Gemini..."
        docker exec -it geo_saas_worker npx tsx src/scripts/loginGemini.ts
        ;;
    2)
        echo "Đang đăng nhập ChatGPT..."
        docker exec -it geo_saas_worker npx tsx src/scripts/loginChatgpt.ts
        ;;
    3)
        echo "Đang đăng nhập Claude..."
        docker exec -it geo_saas_worker npx tsx src/scripts/loginClaude.ts
        ;;
    4)
        echo "Đăng nhập tất cả AI engines..."
        echo ""
        echo "--- Gemini ---"
        docker exec -it geo_saas_worker npx tsx src/scripts/loginGemini.ts
        echo ""
        echo "--- ChatGPT ---"
        docker exec -it geo_saas_worker npx tsx src/scripts/loginChatgpt.ts
        echo ""
        echo "--- Claude ---"
        docker exec -it geo_saas_worker npx tsx src/scripts/loginClaude.ts
        echo ""
        echo "✅ Hoàn tất đăng nhập tất cả!"
        ;;
    5)
        echo "Thoát."
        exit 0
        ;;
    *)
        echo "Lựa chọn không hợp lệ!"
        exit 1
        ;;
esac

echo ""
echo "============================================"
echo "Session đã được lưu vào thư mục:"
echo "  chrome-profile/gemini/"
echo "  chrome-profile/chatgpt/"
echo "  chrome-profile/claude/"
echo ""
echo "Các session này sẽ được tái sử dụng bởi worker!"
echo "============================================"
