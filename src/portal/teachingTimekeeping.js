export const VN_ZONE = 'Asia/Ho_Chi_Minh';
export const dayVN = (value = Date.now()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: VN_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(value));
export const moveDay = (day, amount) => new Date(Date.parse(`${day}T00:00:00Z`) + amount * 86400000).toISOString().slice(0, 10);
export function monday(day = dayVN()) {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return moveDay(day, -(weekday || 7) + 1);
}
export const clockVN = (value) => value ? new Date(value).toLocaleTimeString('vi-VN', { timeZone: VN_ZONE, hour: '2-digit', minute: '2-digit' }) : '—';
export const displayDay = (day) => day.split('-').reverse().join('/');
export const CLOSED_TIMEKEEPING_MESSAGE = 'Đã quá giờ kết thúc lớp. Không thể check-in/check-out. Vui lòng liên hệ admin để bổ sung chấm công.';
export function timekeepingBlockReason(schedule, now = Date.now()) {
  if (schedule.status === 'cancelled') return 'Buổi học đã hủy không thể chấm công.';
  const end = Date.parse(schedule.endAt);
  if (!Number.isFinite(end)) return 'Lịch dạy chưa có giờ kết thúc hợp lệ. Vui lòng liên hệ admin để kiểm tra.';
  if (now > end) return CLOSED_TIMEKEEPING_MESSAGE;
  if (dayVN(schedule.startAt) !== dayVN(now)) return 'Chỉ có thể check-in/check-out cho buổi dạy hôm nay.';
  return '';
}
export function timekeepingIssues(schedule, record, now = Date.now()) {
  if (schedule.status === 'cancelled') return [];
  const issues = [];
  if (record?.checkIn && Date.parse(record.checkIn) > Date.parse(schedule.startAt)) issues.push('Đi trễ');
  if (record?.checkOut && Date.parse(record.checkOut) < Date.parse(schedule.endAt)) issues.push('Về sớm');
  if (now > Date.parse(schedule.endAt) && (!record?.checkIn || !record?.checkOut)) issues.push('Quên chấm công');
  return issues;
}
export const timekeepingLabel = (record) => record?.checkOut ? 'Đã chấm công đầy đủ' : record?.checkIn ? 'Đã check-in · Chưa check-out' : 'Chưa chấm công';
const storageKey = (userId) => `diichi-teacher-timekeeping-v1:${userId}`;
export function readTimekeeping(userId) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
// Browser-only records are explicitly marked provisional until CRM exposes a shared API.
export function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Trình duyệt không hỗ trợ định vị. Vui lòng dùng HTTPS và bật vị trí trên thiết bị.'));
    navigator.geolocation.getCurrentPosition(
      position => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
      }),
      error => reject(new Error({
        1: 'Bạn chưa cho phép truy cập vị trí. Hãy cho phép vị trí trong trình duyệt rồi thử lại.',
        2: 'Không xác định được vị trí hiện tại. Hãy bật định vị trên thiết bị rồi thử lại.',
        3: 'Lấy vị trí quá lâu. Vui lòng thử lại.',
      }[error.code] || 'Không lấy được vị trí hiện tại. Vui lòng thử lại.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
export function saveTimekeeping(userId, schedule, action, now = Date.now(), evidence) {
  if (!userId) throw new Error('Không xác định được tài khoản giáo viên.');
  if (!['checkIn', 'checkOut'].includes(action)) throw new Error('Thao tác chấm công không hợp lệ.');
  const blocked = timekeepingBlockReason(schedule, now);
  if (blocked) throw new Error(blocked);
  const records = readTimekeeping(userId);
  const record = records[schedule.id] || {};
  if (record[action]) throw new Error('Thao tác này đã được ghi nhận.');
  if (action === 'checkOut' && !record.checkIn) throw new Error('Cần check-in trước khi check-out.');
  if (action === 'checkOut' && now <= Date.parse(record.checkIn)) throw new Error('Check-out phải sau check-in.');
  if (!evidence || !Number.isFinite(evidence.latitude) || Math.abs(evidence.latitude) > 90 || !Number.isFinite(evidence.longitude) || Math.abs(evidence.longitude) > 180 || !Number.isFinite(evidence.accuracy) || evidence.accuracy < 0 || !Number.isFinite(Date.parse(evidence.capturedAt))) throw new Error('Cần lấy vị trí hiện tại hợp lệ trước khi chấm công.');
  const next = { ...records, [schedule.id]: { ...record, assignmentId: schedule.id, [action]: new Date(now).toISOString(), [`${action}Evidence`]: { latitude: evidence.latitude, longitude: evidence.longitude, accuracy: evidence.accuracy, capturedAt: evidence.capturedAt }, source: 'teacher-local' } };
  try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); }
  catch { throw new Error('Không lưu được chấm công trên trình duyệt. Vui lòng kiểm tra quyền lưu trữ.'); }
  window.dispatchEvent(new Event('teacher-timekeeping:updated'));
  return next;
}
