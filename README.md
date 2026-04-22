# English Quiz (Admin/User)

## Backend
- Cấu hình: `backend/.env`
  - `PORT=8080`
  - `MONGO_URI=mongodb://127.0.0.1:27017/AssSDN302`
  - `JWT_SECRET=...`
  - `ADMIN_SECRET=...` (dùng cho `POST /api/auth/register-admin`)

- Chạy:
  - `cd backend`
  - `npm run dev`

## Frontend (React)
- (Tuỳ chọn) set API URL:
  - Tạo file `frontend/.env`:
    - `VITE_API_URL=http://localhost:8080`

- Chạy:
  - `cd frontend`
  - `npm i`
  - `npm run dev`

## Luồng sử dụng nhanh
1. Mở UI: `http://localhost:5173`
2. Tạo admin: vào `/admin-setup` (nhập đúng `ADMIN_SECRET`)
3. Admin: tạo `Question` → tạo `Exam`
4. User: đăng ký → vào `Đề thi` → nộp bài → xem `Lịch sử`

