# Di-Ichi Teacher

Portal giáo viên dùng React/Vite. Các màn tổng quan, lịch, lớp, bài tập, đề thi, chấm điểm, kết quả và hồ sơ lấy dữ liệu từ `/portal/*`; không dùng dữ liệu mẫu khi API lỗi hoặc trống.

## Chạy local

```sh
npm install
npm run dev
```

`.env.development` mặc định dùng backend thật `https://be.di-ichi.edu.vn`, không yêu cầu chạy backend local. Đăng nhập và portal dùng chung cấu hình tại `src/services/apiConfig.js`.

Nếu cần phát triển cùng backend local, tạo `.env.development.local` với `VITE_API_URL=/api` và `VITE_API_PROXY_TARGET=http://localhost:3004`, sau đó khởi động lại Vite. Vite sẽ chuyển `/api/*` sang backend local. Không bật cấu hình này khi backend local chưa chạy.

## Build production

```sh
npm run build
```

`.env.production` trỏ tới backend chung `https://be.di-ichi.edu.vn`. Các biến `VITE_*` là cấu hình công khai được đưa vào bundle lúc build; không đặt mật khẩu/token tại đây. Thay `VITE_API_URL` trước khi build nếu triển khai cho môi trường khác.

Giáo viên cần tài khoản `TEACHER` đang hoạt động và liên kết `class_staff` để thấy lớp. Backend cần module portal, migration `AddPortalRecord` và `PORTAL_UPLOAD_DIR` bền vững. Hợp đồng nguồn nằm ở `PORTAL_API.md` và controllers/DTO trong repo `di-ichi-crm-services`.

## Kiểm tra

```sh
npm run lint
npm test -- src/portal/PortalScreen.test.jsx src/services/portalApi.test.js src/components/Layout/Sidebar.test.jsx
npm run build
```

Xem [TEACHER_PORTAL_AUDIT.md](./TEACHER_PORTAL_AUDIT.md) để biết phạm vi rà soát, file sửa, bằng chứng kiểm tra và các phần chưa được xác minh trực tiếp. LiveKit tiếp tục nằm ngoài đợt thay đổi này.
