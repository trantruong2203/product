---
name: docker-compose-launcher
description: |
  Khởi động toàn bộ hệ thống Docker services cho dự án.
  Khi user nói "chạy docker", "start docker", "up docker", "khởi động services",
  "chạy project", "start services", hoặc "docker-compose up", kể cả khi nói "chạy backend" hay "chạy all".
---

# Goal
Khởi động toàn bộ Docker services (frontend + backend + worker + redis + postgres) và kiểm tra health trong 30 giây.

# Instructions
1. Chạy `docker-compose up -d` để start tất cả services
2. Đợi 5 giây cho containers khởi động
3. Kiểm tra logs của các services chính:
   - `docker-compose logs backend`
   - `docker-compose logs worker`
4. Gọi API health check (thường là `GET /api/health` hoặc `GET /`)
5. Trả về kết quả:
   - Services nào đang chạy
   - API health status
   - Logs có lỗi không

# Examples
## Ví dụ 1: Khởi động thành công
**Input:** "chạy docker đi"
**Output:**
```
✅ Docker services đã start:
- frontend    : Running (port 3000)
- backend     : Running (port 3001)
- worker      : Running
- redis       : Running (port 6379)
- postgres    : Running (port 5432)

✅ API Health Check: 200 OK
Logs: Không có lỗi
```

## Ví dụ 2: Có lỗi
**Input:** "start docker"
**Output:**
```
⚠️ Có vấn đề:
- backend: Lỗi kết nối database

Logs:
backend  | Error: connection refused to postgres:5432

👉 Gợi ý: Kiểm tra postgres có chạy chưa, hoặc chạy lại docker-compose up
```

# Constraints
- 🚫 KHÔNG chạy build trước khi up (build khi có thay đổi cần build lại)
- 🚫 KHÔNG xóa volumes khi up (sẽ mất data)
- ✅ LUÔN kiểm tra health sau khi up
- ✅ LUÔN hiển thị ports của từng service
- ✅ Nếu service lỗi → hiển thị logs để debug
