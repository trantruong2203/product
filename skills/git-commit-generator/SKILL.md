---
name: git-commit-generator
description: |
  Tự động tạo git commit message theo conventional commits format.
  Khi user nói "tạo commit", "viết commit message", "commit đi", "generate commit",
  "git commit message", hoặc "commit cái này đi", kể cả khi nói tắt "commit".
---

# Goal
Tạo commit message chuẩn conventional format `type(scope): description` từ git diff trong 5 giây thay vì nghĩ 30 giây.

# Instructions
1. Chạy `git diff --staged` để lấy thay đổi đã được staged
2. Nếu không có staged changes → hỏi user "Có staged changes chưa? Chạy git add trước nhé"
3. Phân tích diff để xác định:
   - **type**: feat (thêm mới), fix (sửa lỗi), refactor (tái cấu trúc), docs (tài liệu), style (format), test, chore
   - **scope**: tên file/folder/module bị ảnh hưởng (ví dụ: auth, api, ui)
   - **description**: mô tả ngắn gọn bằng tiếng Anh, max 50 ký tự, không dùng thì quá khứ
4. Format output: `type(scope): description`
5. Hiển thị commit message và hỏi user có muốn commit không

# Examples
## Ví dụ 1: Thêm feature mới
**Input:** git diff --staged cho thấy thêm route `/api/auth/login`
**Output:**
```
feat(auth): add login endpoint
```

## Ví dụ 2: Fix bug
**Input:** git diff --staged cho thấy sửa lỗi validation trong file `validator.ts`
**Output:**
```
fix(validator): handle empty string case
```

## Ví dụ 3: Refactor
**Input:** git diff --staged cho thấy rename function và thay đổi cấu trúc
**Output:**
```
refactor(api): rename fetchData to getData
```

# Constraints
- 🚫 KHÔNG dùng tiếng Việt trong commit message
- 🚫 KHÔNG quá 72 ký tự
- 🚫 KHÔNG dùng thì quá khứ (ví dụ: "added" → "add")
- ✅ LUÔN có scope khi xác định được module bị ảnh hưởng
- ✅ Nếu không rõ scope → dùng `type: description` không có scope
