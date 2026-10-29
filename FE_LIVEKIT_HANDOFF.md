# LiveKit — FE handoff cho Teacher và Student LMS

Cập nhật: 15/09/2026. Đối chiếu source BE và API client của hai FE. Đợt này chỉ sửa BE và tài liệu; các thay đổi giao diện dưới đây cần FE triển khai.

## 1. Contract chung

Base URL là `VITE_API_URL` của từng FE; BE không có global `/api` prefix. Mọi API lớp học bên dưới yêu cầu `Authorization: Bearer <JWT đăng nhập>`. Token LiveKit chỉ dùng kết nối audio/video, không dùng gọi API BE hoặc Socket.IO.

| Method / route | Người dùng và kết quả |
| --- | --- |
| `GET /teacher/schedules/online?from=<ISO>&to=<ISO>` | Giáo viên: lịch được xếp cho mình |
| `GET /student/schedules/online?from=<ISO>&to=<ISO>` | Học sinh: lịch của lớp có enrollment hiện hành |
| `POST /schedule/:scheduleId/livekit/join` | Giáo viên/học sinh đủ quyền; không cần body |
| `GET /schedule/:scheduleId/participants` | Giáo viên được phân công vào lớp; roster học sinh, gồm cả offline |
| `PATCH /schedule/:scheduleId/participants/:studentId/permissions` | Giáo viên được phân công; cập nhật quyền học sinh |
| `DELETE /schedule/:scheduleId/participants/:identity` | Giáo viên được phân công; kick học sinh khỏi kết nối LiveKit hiện tại; không cần body |

`scheduleId`, `studentId` là UUID; `identity` có dạng `user-<UUID tài khoản>`. Không dùng studentId thay cho identity khi kick. Không gửi roomName/userId/displayName do FE tự chọn để xin token; BE suy ra từ schedule và tài khoản đăng nhập.

### Response wrapper và API client

HTTP thành công: `{ "success": true, "message": "Thành công", "data": ... }`.

- Teacher: `src/services/api.js` đã unwrap `response.data.data`; kết quả của `api.get/post/patch/delete` là payload trực tiếp.
- Student: `src/services/apiClient.js` đã unwrap `payload.data`; kết quả `apiRequest()` là payload trực tiếp.
- Không đọc thêm `.data` ở component sau khi dùng hai client này.
- Teacher lỗi Axios: đọc `error.response?.status` và `error.response?.data?.message`; Student client: đọc `error.status`, `error.message`.

### Lịch và join

`from`, `to` là chuỗi ngày ISO, `from < to`. Mặc định BE lấy từ một ngày trước tới 30 ngày sau hiện tại. Dữ liệu lịch là mảng trong `data`, không phân trang.

Ví dụ các trường điều khiển chính trong một lịch giáo viên:

```json
{
  "scheduleId": "10000000-0000-4000-8000-000000000001",
  "classId": "10000000-0000-4000-8000-000000000002",
  "className": "Lớp tiếng Nhật",
  "courseName": "Khóa N5",
  "physicalRoom": null,
  "startAt": "2026-09-15T03:00:00.000Z",
  "endAt": "2026-09-15T04:00:00.000Z",
  "status": "active",
  "isConfirmed": true,
  "teacherConfirmedAt": "2026-09-15T03:00:00.000Z",
  "meetingStarted": true,
  "canStart": true,
  "startReason": null
}
```

Lịch học sinh có `teacherName`, `canJoin`, `joinReason`, `joinAvailableAt`, `joinClosesAt`, cùng `isConfirmed`, `meetingStarted`; không dùng `canStart/startReason`. Ví dụ nhóm trạng thái đang chờ: `{ "canJoin": false, "joinReason": "Giáo viên chưa bắt đầu lớp học", "isConfirmed": true, "meetingStarted": false }`.

Giáo viên chính gọi join sẽ tự xác nhận và tạo/tái sử dụng phòng. `POST /schedule/:scheduleId/teacher-confirmation` vẫn tồn tại nhưng không phải bước UI bắt buộc trước join. Học sinh và giáo viên hỗ trợ không được tự mở phòng. Giữ điều kiện join của BE; không suy ra quyền vào lớp chỉ từ giờ máy FE hoặc `meetingStarted`.

Ví dụ payload join trong `data`:

```json
{
  "serverUrl": "wss://live.di-ichi.edu.vn",
  "room": "schedule-10000000-0000-4000-8000-000000000001",
  "scheduleId": "10000000-0000-4000-8000-000000000001",
  "identity": "user-10000000-0000-4000-8000-000000000003",
  "displayName": "Nguyễn Văn A",
  "role": "student",
  "isHost": false,
  "token": "<LiveKit JWT>",
  "expiresAt": "2026-09-15T05:00:00.000Z",
  "permissions": {
    "canUseMic": true, "canUseCamera": true, "canShareScreen": false,
    "canWriteBoard": false, "canControlBoard": false
  }
}
```

Dùng `joinData.serverUrl` và `joinData.token` cho `LiveKitRoom`. Không lưu token vào log. `isHost` chỉ xác định giáo viên chính mở phòng; quyền kick tương đương quyền sửa quyền, không giới hạn theo `isHost`.

### Roster, sửa quyền, kick

Roster trả mảng học sinh hiện hành trong lớp. Ví dụ một phần tử:

```json
{
  "studentId": "10000000-0000-4000-8000-000000000004",
  "identity": "user-10000000-0000-4000-8000-000000000003",
  "displayName": "Nguyễn Văn A",
  "connected": true,
  "permissions": {
    "canUseMic": true, "canUseCamera": true, "canShareScreen": false,
    "canWriteBoard": false, "canControlBoard": false
  }
}
```

`identity` có thể null nếu học sinh chưa có tài khoản. Đây không phải danh sách tất cả participant LiveKit: giáo viên không nằm trong roster này.

PATCH nhận ít nhất một trong năm quyền boolean ở trên, ví dụ `{ "canUseMic": false }`. Payload trả về: `{ scheduleId, identity, permissions }`, với toàn bộ năm quyền sau cập nhật.

DELETE trả HTTP 200:

```json
{
  "success": true,
  "message": "Thành công",
  "data": {
    "scheduleId": "10000000-0000-4000-8000-000000000001",
    "identity": "user-10000000-0000-4000-8000-000000000003",
    "removed": true
  }
}
```

`removed: false` nghĩa là LiveKit báo room/participant đã không tồn tại. Đây vẫn là kết quả thành công. Kick không xóa enrollment, không thu hồi quyền đã lưu, không cấm xin token vào lại. Không có API kết thúc cả phòng trong đợt này.

### Lỗi

```json
{
  "statusCode": 403,
  "message": "Bạn không được phân công vào lớp này",
  "error": "Forbidden",
  "timestamp": "2026-09-15T03:00:00.000Z",
  "path": "/schedule/<uuid>/participants/<identity>",
  "method": "DELETE"
}
```

| HTTP | Cách xử lý |
| --- | --- |
| 400 | ID/body/query không hợp lệ; message validation có thể là mảng, ghép để hiển thị |
| 401 | JWT BE thiếu/sai/hết hạn; dùng luồng đăng nhập lại hiện có |
| 403 | Không có quyền, lịch bị hủy, chưa tới giờ/quá giờ hoặc giáo viên chưa mở lớp; hiển thị message BE |
| 404 | Không tìm thấy lịch hoặc học sinh đích hợp lệ trong lớp |
| 500 | LiveKit/DB/cấu hình gặp lỗi; báo thất bại, cho thử lại chủ động; không giả định kick thành công |

## 2. Teacher — điểm tích hợp

Repo `Di-Ichi-Teacher`:

- `src/services/classroomApi.js`: thêm hàm sau; client đã unwrap response.
- `src/components/OnlineClassroom/ParticipantPanel.jsx`: nút “Mời ra khỏi lớp” trên dòng có `identity` và `connected: true`.
- `src/components/OnlineClassroom/TeacherClassroomExperience.jsx`: trạng thái đang kick theo identity, gọi API và tải lại roster sau thành công. Giữ học sinh trong roster, không xóa dòng enrollment; xử lý `removed: false` như đã offline.
- `src/pages/OnlineClassroom/TeacherClassroomPage.jsx`: giữ luồng join, rời phòng. “Rời lớp” không kết thúc room cho mọi người.

```js
export const kickClassroomParticipant = (scheduleId, identity) =>
  api.delete(
    `/schedule/${encodeURIComponent(scheduleId)}/participants/${encodeURIComponent(identity)}`,
  );
```

Khóa nút trong lúc request để tránh bấm lặp, bỏ khóa trong `finally`. Khi API kick thành công nhưng tải roster thất bại, báo riêng lỗi tải danh sách, không đổi thông báo thành kick thất bại. Không cần thêm rule chỉ host mới thấy nút: BE cho phép giáo viên được phân công như API sửa quyền.

Giữ polling roster 15 giây hiện có. Dùng `RoomEvent.ParticipantConnected` / `RoomEvent.ParticipantDisconnected` từ `livekit-client` để kích hoạt tải roster; đăng ký listener trong component con `LiveKitRoom`, dọn listener khi unmount. Không chỉ dựa vào sự kiện Socket.IO để đặt `connected: true`.

## 3. Student LMS — điểm tích hợp

Repo `Di-Ichi-Student-LMS`:

- `src/services/classroomApi.js`: tiếp tục dùng `joinClassroom(scheduleId)`; không cần API kick ở Student.
- `src/pages/ClassroomPage.jsx`: hiện `onDisconnected` chỉ chuyển trang; bổ sung phân biệt lý do ngắt kết nối.
- `src/hooks/useClassroomSocket.js`: cleanup đã gọi `socket.disconnect()` khi unmount; giữ cleanup này để dọn kết nối bảng/giơ tay.
- `src/hooks/useOnlineScheduleWatcher.js` và giao diện `/online`: giữ luồng watch/polling chờ giáo viên; hiển thị thông báo sau khi bị kick.

SDK đang cài hỗ trợ `onDisconnected(reason)` và `DisconnectReason.PARTICIPANT_REMOVED`. Có thể truyền thông báo bằng router state và hiển thị tại `/online`:

```jsx
import { DisconnectReason } from 'livekit-client';

const handleDisconnected = (reason) => {
  const removed = reason === DisconnectReason.PARTICIPANT_REMOVED;
  navigate('/online', {
    replace: true,
    state: {
      classroomNotice: removed
        ? 'Bạn đã được giáo viên mời ra khỏi lớp. Bạn có thể chủ động tham gia lại.'
        : 'Bạn đã rời kết nối lớp học.',
    },
  });
};
// <LiveKitRoom ... onDisconnected={handleDisconnected} />
```

Đoạn mẫu xử lý ngắt kết nối cuối cùng. Với nút rời chủ động, giữ một ref đánh dấu để không hiện thông báo lỗi hoặc điều hướng hai lần. Mất mạng trong lúc SDK đang reconnect chỉ hiển thị trạng thái kết nối lại; không suy diễn thành bị kick.

Khi bị kick: unmount lớp học để dọn LiveKit và Socket.IO, quay lại `/online`, không tự gọi join lại. Học sinh bấm “Tham gia” lại mới xin token mới; BE tiếp tục kiểm tra toàn bộ rule hiện tại. FE không được coi kick là cơ chế cấm: client khác vẫn có thể xin token nếu đủ quyền.

## 4. Realtime và webhook

Socket.IO namespace `/classroom` dùng JWT đăng nhập qua `auth.token`. Các event hiện có gồm `classroom:watch`, `classroom:started`, `classroom:join`, `classroom:participant-joined/left`, `classroom:permission-changed`, giơ tay và bảng. Event socket participant phản ánh kết nối logic Socket.IO, không bảo đảm trạng thái audio/video. Đợt này không thêm event kick hoặc kết thúc lớp.

`POST /livekit/webhook` chỉ dành cho LiveKit server. BE nhận raw body `application/webhook+json`, kiểm tra chữ ký `Authorization`, rồi cập nhật dữ liệu. Webhook sai chữ ký trả 401; lỗi xử lý DB trả 500 để retry. Room finished đối chiếu SID hiện tại; duplicate participant SID không tạo dòng thứ hai.

BE: `LIVEKIT_URL=https://...`; FE nhận `LIVEKIT_PUBLIC_URL=wss://...` qua response join. Không dùng biến `LIVEKIT_WS_URL`, không đưa API key/secret LiveKit lên FE. Cấu hình server LiveKit gửi webhook về URL BE công khai; đây là bước vận hành riêng.

## 5. Checklist nghiệm thu tích hợp thực

- [ ] Giáo viên chính mở phòng; học sinh vào sau; người ngoài lớp bị chặn.
- [ ] Mic/camera, chia sẻ màn hình và các quyền hiện tại không thay đổi.
- [ ] Teacher kick đúng học sinh; nút khóa trong lúc gửi; roster giữ dòng nhưng chuyển offline.
- [ ] Student nhận lý do bị kick, dọn kết nối, thấy thông báo ở `/online`, không tự join lại.
- [ ] Student chủ động vào lại được khi đủ điều kiện; nhận quyền đã lưu.
- [ ] Kick học sinh đã offline vẫn thành công; lỗi BE/LiveKit không bị báo thành công.
- [ ] Hai giáo viên cùng lớp thấy roster cập nhật; người không được phân công không kick được.
- [ ] Mất mạng/reconnect và rời lớp chủ động không bị thông báo nhầm là kick.
- [ ] Webhook đã ký thật cập nhật phiên/lịch sử; event cũ không đóng phiên mới.

Test tự động BE dùng DB giả lập và mock RoomServiceClient; HTTP webhook dùng chữ ký thật với khóa test và Nest middleware thật. Checklist trên phải chạy với tài khoản Teacher/Student và LiveKit thực; build/unit test không chứng minh kết nối audio/video hoặc cấu hình production.

## 6. Kết quả kiểm chứng BE trong đợt bàn giao

| Kiểm tra | Kết quả |
| --- | --- |
| `npm test -- --runInBand --testPathPatterns='livekit\|live-classroom'` | 5 suites, 25 tests pass |
| Test HTTP webhook/kick riêng sau chỉnh kiểu dữ liệu test | 5 tests pass |
| `npm run build` | Pass |
| ESLint không `--fix` trên các file TypeScript thay đổi | Pass; không còn warning sau chỉnh kiểu HTTP server trong test |
| `npx tsc --noEmit --incremental false` toàn repo, bao gồm test | Còn 13 lỗi có sẵn trong test CRM/auth/lớp học/potential-candidate; đối chiếu source `HEAD` bằng compiler host trong bộ nhớ cũng cho cùng 13 lỗi |

Không sửa các lỗi TypeScript cũ ngoài phạm vi. Không thay code hai FE, không chạy migration, không deploy. Checklist tích hợp thực ở mục 5 chưa được thực hiện.
