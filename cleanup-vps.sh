#!/bin/bash
# cleanup-vps.sh - Xóa sạch mọi thứ để làm lại từ đầu
set -e

echo "⚠️ Đang dọn dẹp VPS hoàn toàn..."

# 1. Dừng và xóa tất cả container Docker đang chạy
echo "🛑 Dừng container..."
docker stop $(docker ps -aq) 2>/dev/null || true
docker rm $(docker ps -aq) 2>/dev/null || true

# 2. Xóa sạch Image, Volume, Network không dùng đến
echo "🧹 Quét sạch Docker system (deep prune)..."
docker system prune -a --volumes -f

# 3. Xóa thư mục dự án cũ (Thay đổi đường dẫn nếu cần)
echo "📁 Xóa thư mục dự án hiện tại..."
# Lưu ý: Cẩn trọng khi dùng rm -rf
# rm -rf ~/product 

echo "✅ VPS đã sạch sẽ. Sẵn sàng để deploy mới!"
