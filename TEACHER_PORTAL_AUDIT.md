# Rà soát Teacher Portal — 30/10/2026

## Kết quả

Các route nghiệp vụ hiện tại render `PortalScreen` dưới `PortalProvider`, dùng `/portal/snapshot` và mutation `/portal/*`. Không thêm fixture fallback. Các component/datas demo cũ không được dùng trong các route nghiệp vụ này. Luồng LiveKit được giữ nguyên và nằm ngoài phạm vi kiểm tra chức năng.

Đã xử lý:

- Cấu hình API trước đây mặc định `localhost:3000`. Đăng nhập, portal và Axios client giờ cùng `API_BASE_URL`; development và production mặc định dùng backend chung CRM `https://be.di-ichi.edu.vn`. Sau khi gặp proxy 502 do backend local chưa chạy, đã bỏ mặc định development trỏ localhost. Proxy vẫn có thể bật cho phát triển backend local bằng `.env.development.local`.
- Kiểm tra cấu trúc snapshot trước khi render để phản hồi thiếu trường/sai dữ liệu trở thành lỗi có nút thử lại, thay vì màn trắng/crash. Không đổi lỗi thành danh sách giả.
- Timeout request thông thường 15 giây; upload/download 120 giây. Hủy request khi unmount, đọc lỗi API dạng lồng nhau, xử lý phản hồi không phải JSON và response `success:false`.
- Lọc chấm điểm theo tên học sinh/tên bài/lớp; kết quả học tập theo tên/mã học sinh; thông báo danh sách lớp rỗng sau tìm kiếm; nút xóa bộ lọc. Bỏ bộ lọc ở tổng quan vì không tác động các KPI toàn cổng.
- Chấm bài chỉ cho gửi điểm nguyên 0–100 theo `PortalGradeDto`. Nhập điểm kiểm tra không cho vượt thang điểm. Không đổi công thức dữ liệu hoặc enum.
- Đề thi có trường giờ mở/đóng vốn đã được backend hỗ trợ. Khi đổi lớp trong form nhận xét/báo cáo, xóa lựa chọn học sinh/buổi học cũ để tránh gửi sai liên kết.
- Sắp lịch sắp tới tăng dần trước khi lấy 5 buổi. Nhãn tổng quan giáo viên và trạng thái phổ biến được Việt hóa.
- Hệ token màu, Sidebar sáng/active pastel, header gọn, KPI pastel, table hover, nút/focus đồng bộ; mobile drawer có focus trap, Escape, trả focus và khôi phục cuộn.
- Nút quên mật khẩu hướng dẫn liên hệ quản trị viên; không giả lập gửi email hoặc tạo endpoint chưa tồn tại.
- Backend chỉ sửa hai thông báo lỗi bị mất dấu trong `PortalService`; không đổi schema hoặc dữ liệu DB.

## API đang dùng

| Chức năng | Endpoint |
| --- | --- |
| Đăng nhập | POST `/auth/staff/login` |
| Tổng quan, lớp, lịch, hồ sơ, kết quả | GET `/portal/snapshot` |
| Bài tập | POST `/portal/homework`, PATCH/DELETE `/portal/homework/:id` |
| Chấm/trả bài | PATCH `/portal/submissions/:id/grade` |
| Điểm danh | PATCH `/portal/schedules/:id/attendance` |
| Nhập/sửa điểm | POST `/portal/scores`, PATCH `/portal/scores/:id` |
| Đề thi/bài học/tài liệu/báo cáo/nhận xét/thảo luận | POST `/portal/records`, PATCH/DELETE `/portal/records/:id` |
| Tệp | POST `/portal/files`, GET `/portal/files/:id` |
| Đánh dấu thông báo | PATCH `/portal/notifications/:id/read` |

Hồ sơ hiện chỉ xem thông tin; không tự thêm chức năng cập nhật tài khoản khi chưa có hợp đồng API cho giáo viên.

## Bằng chứng kiểm tra

- Teacher: 44 tests PASS trong `PortalScreen.test.jsx` (39), `portalApi.test.js` (4), `Sidebar.test.jsx` (1).
- Các ca bổ sung kiểm tra request payload và snapshot tải lại sau giao bài, chấm/trả bài, điểm danh, nhập điểm và tạo đề thi; không chỉ kiểm tra toast.
- Backend: 10 tests PASS ở `portal.service.spec.ts`, gồm HTTP auth/DTO, phân quyền lớp, upload/download byte thực, điểm số, submission/grading, quiz, attendance và progress. Đây là HTTP/service tests với DB kiểm thử cô lập.
- Teacher lint: không có error; còn warning Fast Refresh có sẵn ở `GradingPagination.jsx` (component cũ ngoài luồng portal).
- Teacher production build: PASS; vẫn có cảnh báo bundle JS lớn khoảng 1,28 MB trước gzip. Không thay đổi bộ tính năng LiveKit để xử lý cảnh báo này.
- Contrast chữ/nền pastel đo được: blue 4,75:1; green 5,21:1; orange 6,84:1; purple 6,48:1; cyan 5,15:1; chữ trắng/nút primary 4,78:1. Các cặp này đạt tối thiểu 4,5:1.
- Backend build và lint riêng `portal.service.ts`: PASS. `git diff --check` phía Teacher: PASS. Bundle production đã chứa đúng backend `https://be.di-ichi.edu.vn`.
- Đối chiếu trực tiếp `https://be.di-ichi.edu.vn/swagger-json`: HTTP 200, có 17 đường dẫn `/portal/*` tương ứng source. GET `/portal/snapshot` không gửi token trả HTTP 401.

## Giới hạn xác minh

Chưa đăng nhập bằng tài khoản giáo viên thật để thực hiện mutation trên production; không gọi migration hoặc ghi DB production để thử giao diện. Swagger và HTTP 401 xác nhận route/auth tồn tại, không chứng minh một tài khoản cụ thể đã được phân lớp đúng.

Chưa có ảnh chụp/đo responsive trên browser thật. Tests DOM xác minh tương tác và focus, không thay thế kiểm tra pixel hoặc đo tràn màn hình.

## File thay đổi

- `.env.example`, `.env.development`, `.env.production`, `vite.config.js`.
- `src/services/apiConfig.js`, `api.js`, `portalApi.js`, `portalApi.test.js`.
- `src/portal/PortalContext.jsx`, `PortalScreen.jsx`, `PortalScreen.test.jsx`, `portal.css`.
- `src/components/Layout/Header.jsx`, `Sidebar.jsx`, `Sidebar.test.jsx`, `menu.js`.
- `src/components/Login/LoginCard.jsx`, `src/layouts/MainLayout.jsx`, `src/styles/global.css`.
- `README.md`, `TEACHER_PORTAL_AUDIT.md`.
- Repo backend: `src/modules/portal/portal.service.ts` (hai chuỗi lỗi tiếng Việt).
