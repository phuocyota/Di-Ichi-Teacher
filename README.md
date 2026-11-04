# Di-Ichi Teacher

Portal giáo viên dùng React/Vite. Các màn tổng quan, lịch, lớp, bài tập, đề thi, chấm điểm, kết quả và hồ sơ lấy dữ liệu từ `/portal/*`; không dùng dữ liệu mẫu khi API lỗi hoặc trống.

## Chạy local

```sh
npm install
npm run dev
```

`.env.development` mặc định dùng backend thật `https://be.di-ichi.edu.vn`, không yêu cầu chạy backend local. Đăng nhập và portal dùng chung cấu hình tại `src/services/apiConfig.js`.

Nếu cần phát triển cùng backend local, tạo `.env.development.local` với `VITE_API_URL=/api` và `VITE_API_PROXY_TARGET=http://localhost:3004`, sau đó khởi động lại Vite. Vite sẽ chuyển `/api/*` sang backend local. Không bật cấu hình này khi backend local chưa chạy.

## Ngôn ngữ và URL

- Tiếng Việt: `/vn/login`, `/vn/dashboard`, `/vn/lich-giang-day`, …
- English: `/en/login`, `/en/dashboard`, `/en/lich-giang-day`, …
- Các route chi tiết cũng có tiền tố, ví dụ `/en/soan-giao-an/:planId` và `/vn/lop-hoc-online/:scheduleId`. Giữ nguyên slug nghiệp vụ sau tiền tố ở cả hai ngôn ngữ.
- URL quyết định ngôn ngữ (`vn` tương ứng mã i18next/HTML `vi`). Đổi ngôn ngữ giữ trang, ID, query và hash; Back/Forward khôi phục ngôn ngữ theo URL.
- URL cũ không có tiền tố tự chuyển sang ngôn ngữ đã chọn, mặc định `/vn/`. Đăng nhập, đăng xuất, hết phiên và liên kết nội bộ giữ đúng tiền tố.
- Nhãn chung và bản dịch cập nhật nằm trong `src/i18n/resources.js` và `src/i18n/uiTranslations.js`; route dùng lớp điều hướng `src/routes/localizedRouter.jsx`. Khi thêm trang, khai báo đường dẫn tương đối trong `src/routes/appRoutes.jsx` để có cả hai ngôn ngữ.
- Hosting cần trả `index.html` cho các route ứng dụng `/vn/*` và `/en/*` để mở trực tiếp hoặc tải lại trang chi tiết.

## Build production

```sh
npm run build
```

`.env.production` trỏ tới backend chung `https://be.di-ichi.edu.vn`. Các biến `VITE_*` là cấu hình công khai được đưa vào bundle lúc build; không đặt mật khẩu/token tại đây. Thay `VITE_API_URL` trước khi build nếu triển khai cho môi trường khác.

Giáo viên cần tài khoản `TEACHER` đang hoạt động và liên kết `class_staff` để thấy lớp. Backend cần module portal, migration `AddPortalRecord` và `PORTAL_UPLOAD_DIR` bền vững. Hợp đồng nguồn nằm ở `PORTAL_API.md` và controllers/DTO trong repo `di-ichi-crm-services`.

## Kiểm tra

### Lịch giảng dạy và chấm công tạm (04/11/2026)

Màn `/{vn|en}/lich-giang-day` hiển thị lịch tuần 7 ngày theo bố cục admin, có lọc lớp/cơ sở, chọn tuần, thống kê và cảnh báo. Lịch vẫn lấy từ `/portal/snapshot`; bấm một buổi để mở chi tiết và check-in/check-out. Cửa sổ này không hiển thị danh sách/điểm danh học viên; điểm danh học viên nằm trong phần lớp học.

Mỗi lần check-in/check-out yêu cầu quyền vị trí qua Geolocation API (HTTPS hoặc localhost). Chỉ lưu khi lấy được vị trí hiện tại; lỗi quyền, định vị hoặc hết thời gian chờ sẽ không tạo bản chấm công. Lưu riêng `checkInEvidence` / `checkOutEvidence` gồm vĩ độ, kinh độ, độ chính xác và thời điểm lấy vị trí; có liên kết xem tọa độ đã ghi trên bản đồ. Bản ghi cũ không có vị trí vẫn xem được. Đóng cửa sổ trong lúc lấy vị trí sẽ bỏ kết quả đang chờ.

Sau giờ kết thúc buổi dạy, khóa cả check-in và check-out; giáo viên phải liên hệ admin để bổ sung chấm công. Quy tắc được kiểm tra trước khi lấy vị trí và ngay trước khi lưu, kể cả khi buổi dạy hết giờ trong lúc chờ định vị. Cửa sổ đang mở tự khóa khi qua giờ kết thúc. Khi nối backend, API cũng phải áp dụng quy tắc này theo giờ máy chủ và chỉ cho admin bổ sung công có lý do.

Trong khi chưa có source/hợp đồng API chấm công chung, check-in/check-out chỉ lưu tạm trong `localStorage`, tách theo tài khoản tại `diichi-teacher-timekeeping-v1:<userId>`. Không gửi mutation chấm công giáo viên đến endpoint chưa tồn tại. Chỉ chấm công cho buổi hôm nay theo múi giờ Việt Nam; phải check-in trước check-out, không chấm trùng hoặc chấm buổi đã hủy. Điểm danh học viên tiếp tục lưu qua API hiện có.

Phần phân lịch/chấm công của `Admin_DiIchi_CRM` hiện dùng kho local riêng `diichi-work-schedule-v1`. Hai cổng **chưa đồng bộ dữ liệu phân lịch hoặc chấm công**. Khi có backend, cần liên kết người được phân lịch với tài khoản giáo viên, đưa lịch phân công vào snapshot, thay kho lưu tạm bằng API có phân quyền và giờ máy chủ, đồng thời cho admin đọc cùng bản ghi. Không dùng giờ trình duyệt hoặc bản ghi tạm làm công chính thức.

### Lệnh kiểm tra

```sh
npm run lint
npm test -- src/portal/PortalScreen.test.jsx src/services/portalApi.test.js src/components/Layout/Sidebar.test.jsx
npm run build
```

Xem [TEACHER_PORTAL_AUDIT.md](./TEACHER_PORTAL_AUDIT.md) để biết phạm vi rà soát, file sửa, bằng chứng kiểm tra và các phần chưa được xác minh trực tiếp. LiveKit tiếp tục nằm ngoài đợt thay đổi này.
