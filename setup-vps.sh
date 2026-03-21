#!/bin/bash
# setup-vps.sh - VPS 初始配置脚本
# 用法: bash setup-vps.sh
set -e

echo "=========================================="
echo "  GEO SaaS VPS 初始配置脚本"
echo "=========================================="
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "[错误] 请使用 root 用户运行此脚本"
    echo "用法: sudo bash setup-vps.sh"
    exit 1
fi

echo "[1/5] 更新系统包..."
apt-get update -qq
apt-get upgrade -y -qq

echo "[2/5] 安装必要的依赖..."
apt-get install -y -qq \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip

echo "[3/5] 安装 Docker..."
if ! command -v docker &> /dev/null; then
    echo "  安装 Docker..."
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "  Docker 已安装"
else
    echo "  Docker 已安装，跳过"
fi

echo "[4/5] 配置 Docker 优化..."
# 创建 Docker daemon 配置
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65536,
      "Soft": 65536
    }
  },
  "default-address-pools": [
    {
      "base": "172.17.0.0/12",
      "size": 24
    }
  ]
}
EOF

echo "[5/5] 配置系统优化..."
# 增加文件描述符限制
if ! grep -q "* soft nofile" /etc/security/limits.conf; then
    cat >> /etc/security/limits.conf << 'EOF'
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF
fi

# 增加网络参数
if ! grep -q "net.core.somaxconn" /etc/sysctl.conf; then
    cat >> /etc/sysctl.conf << 'EOF'
# 网络优化
net.core.somaxconn = 1024
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 4096
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 3

# 文件描述符
fs.file-max = 65536
EOF
fi

# 应用 sysctl 设置
sysctl -p 2>/dev/null || true

echo ""
echo "=========================================="
echo "  VPS 初始配置完成!"
echo "=========================================="
echo ""
echo "下一步操作:"
echo "1. 运行 setup-swap.sh 配置 SWAP"
echo "2. 部署 GEO SaaS:"
echo "   - 克隆项目代码"
echo "   - 配置环境变量 (.env)"
echo "   - 运行 docker compose up -d"
echo ""
echo "推荐资源配置 (2GB RAM, 2 CPU):"
echo "  - Worker: 1.2GB (最多)"
echo "  - Backend: 384MB"
echo "  - PostgreSQL: 256MB"
echo "  - Redis: 128MB"
echo "  - Frontend: 256MB"
echo "  - SWAP: 2GB"
echo ""
echo "内存总计: ~2.2GB"
echo "=========================================="
