---
name: api-endpoint-tester
description: |
  Test API endpoint nhanh với method, URL, body và authentication.
  Khi user nói "test API", "gọi endpoint", "check API", "curl request",
  "kiểm tra endpoint", hoặc "chạy request này đi", kể cả khi paste URL.
---

# Goal
Test API endpoint và trả về status code + response body trong 3 giây thay vì mở Postman.

# Instructions
1. Parse input từ user để xác định:
   - **Method**: GET, POST, PUT, DELETE, PATCH
   - **URL**: endpoint cần test
   - **Body** (nếu có): JSON body
   - **Auth** (nếu có): Bearer token hoặc API key
2. Nếu thiếu thông tin → hỏi user bổ sung:
   - "Cần method gì? (GET/POST/PUT/DELETE)"
   - "Có body không? Paste JSON đi"
   - "Cần auth không? Token hay API key?"
3. Gọi API bằng curl hoặc fetch
4. Trả về kết quả format:
   ```
   Status: <200/201/400/401/404/500...>
   Response: <JSON body>
   ```
5. Nếu lỗi → hiển thị error message rõ ràng

# Examples
## Ví dụ 1: GET request không có auth
**Input:** "test endpoint GET /api/users"
**Output:**
```
Status: 200
Response: [{"id": 1, "name": "John"}]
```

## Ví dụ 2: POST request có body và auth
**Input:** "POST /api/auth/login với body {email, password} và token abc123"
**Output:**
```
Status: 200
Response: {"token": "xyz789", "expiresIn": 3600}
```

## Ví dụ 3: Lỗi 401
**Input:** "GET /api/admin/users với token sai"
**Output:**
```
Status: 401
Error: Unauthorized - Invalid token
```

# Constraints
- 🚫 KHÔNG hardcode credentials vào code
- 🚫 KHÔNG lưu token sau khi test xong
- ✅ LUÔN hiển thị status code
- ✅ LUÔN parse JSON response cho dễ đọc
- ✅ Nếu timeout → thông báo "Request timeout, thử lại không?"
