#!/bin/bash
# setup-swap.sh - VPS 首次启动时运行
# 用法: bash setup-swap.sh

set -e

echo "[SWAP] 开始配置 SWAP..."

# 检查 SWAP 是否已存在
if [ -f /swapfile ]; then
    echo "[SWAP] SWAP 文件已存在，跳过创建"
    swapon --show
else
    echo "[SWAP] 创建 2GB SWAP 文件..."
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # 添加到 fstab
    if ! grep -q '/swapfile none swap sw 0 0' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
        echo "[SWAP] 已添加到 /etc/fstab"
    fi
fi

# 调整 swappiness (值越低越优先使用物理内存)
echo "[SWAP] 调整 swappiness 为 10..."
echo 10 > /proc/sys/vm/swappiness

# 持久化 swappiness
if ! grep -q 'vm.swappiness' /etc/sysctl.conf; then
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo "[SWAP] 已持久化 swappiness"
fi

# 显示 SWAP 状态
echo ""
echo "[SWAP] 当前 SWAP 状态:"
swapon --show
echo ""
echo "[SWAP] 内存状态:"
free -h

# 清理内存缓存（可选）
echo ""
echo "[SWAP] 清理内存缓存..."
sync
echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

echo ""
echo "[SWAP] 配置完成!"
echo "[SWAP] 总内存: $(free -h | grep Mem | awk '{print $2}')"
echo "[SWAP] 可用内存: $(free -h | grep Mem | awk '{print $7}')"
