import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock3, LogIn, LogOut, MapPin, UserCheck, X } from 'lucide-react';
import { usePortal } from './portalStore.js';
import { clockVN, dayVN, displayDay, getCurrentLocation, monday, moveDay, readTimekeeping, saveTimekeeping, timekeepingBlockReason, timekeepingIssues, timekeepingLabel } from './teachingTimekeeping.js';
import './TeacherTimetable.css';

export function TeacherTimetable({ rows, className }) {
  const { data } = usePortal();
  const userId = data.profile.userId || data.profile.id;
  const [week, setWeek] = useState(() => monday());
  const [branch, setBranch] = useState('');
  const [selected, setSelected] = useState('');
  const [records, setRecords] = useState(() => readTimekeeping(userId));
  const [now, setNow] = useState(Date.now);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [locating, setLocating] = useState(false);
  const locationRequest = useRef(0);
  const locationLock = useRef(false);
  const dialog = useRef(null);
  const schedule = rows.find(row => row.id === selected);
  useEffect(() => () => { locationRequest.current++; }, [selected, userId]);
  useEffect(() => {
    const sync = () => setRecords(readTimekeeping(userId));
    sync();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    window.addEventListener('storage', sync);
    window.addEventListener('teacher-timekeeping:updated', sync);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', sync);
      window.removeEventListener('teacher-timekeeping:updated', sync);
    };
  }, [userId]);
  useEffect(() => {
    if (schedule && !dialog.current?.open) dialog.current?.showModal();
    if (!schedule) dialog.current?.close();
  }, [schedule]);
  useEffect(() => {
    if (!schedule) return;
    setNow(Date.now());
    const remaining = Date.parse(schedule.endAt) - Date.now() + 1;
    if (remaining > 0 && remaining <= 2147483647) {
      const timer = setTimeout(() => setNow(Date.now()), remaining);
      return () => clearTimeout(timer);
    }
  }, [schedule]);
  const branchName = row => row.branchName || data.classes.find(c => c.id === row.classId)?.branchName || '';
  const branches = [...new Set(rows.map(branchName).filter(Boolean))];
  const days = Array.from({ length: 7 }, (_, i) => moveDay(week, i));
  const visible = rows.filter(row => {
    const day = dayVN(row.startAt);
    return day >= week && day <= days[6] && (!branch || branchName(row) === branch);
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  const active = visible.filter(row => row.status !== 'cancelled');
  const periods = row => Number(row.periods) > 0 ? `${Number(row.periods)} tiết` : 'Chưa có số tiết';
  const hasPeriods = active.length > 0 && active.every(row => Number(row.periods) > 0);
  const count = items => hasPeriods ? items.reduce((sum, row) => sum + Number(row.periods), 0) : items.length;
  const issues = row => timekeepingIssues(row, records[row.id], now);
  const stats = [
    [hasPeriods ? 'Tiết dạy được phân' : 'Buổi dạy được phân', count(active), 'Theo lịch trong tuần', CalendarDays, 'blue'],
    [hasPeriods ? 'Tiết đã chấm công' : 'Buổi đã chấm công', count(active.filter(row => records[row.id]?.checkIn && records[row.id]?.checkOut)), 'Có đủ check-in và check-out', UserCheck, 'green'],
    ['Đi trễ / về sớm', `${active.filter(row => issues(row).includes('Đi trễ')).length} / ${active.filter(row => issues(row).includes('Về sớm')).length}`, 'Số lần ghi nhận trong tuần', Clock3, 'orange'],
    ['Quên chấm công', active.filter(row => issues(row).includes('Quên chấm công')).length, 'Thiếu check-in/out khi hết lịch', AlertTriangle, 'red'],
  ];
  const open = row => { setError(''); setNotice(''); setSelected(row.id); };
  const cancelLocation = () => { locationRequest.current++; locationLock.current = false; setLocating(false); };
  const close = () => { cancelLocation(); dialog.current?.close(); setSelected(''); };
  const record = schedule && records[schedule.id];
  const blocked = schedule ? timekeepingBlockReason(schedule, now) : '';
  async function stamp(action) {
    if (locationLock.current) return;
    const reason = timekeepingBlockReason(schedule);
    if (reason) { setNow(Date.now()); setError(reason); setNotice(''); return; }
    locationLock.current = true;
    const request = ++locationRequest.current;
    setLocating(true);
    setError(''); setNotice('');
    try {
      const evidence = await getCurrentLocation();
      if (request !== locationRequest.current) return;
      setRecords(saveTimekeeping(userId, schedule, action, Date.now(), evidence));
      setNow(Date.now());
      setNotice(`Đã ${action === 'checkIn' ? 'check-in' : 'check-out'} và lưu vị trí hiện tại · Lưu tạm trên trình duyệt`);
    } catch (cause) { if (request === locationRequest.current) setError(cause.message); }
    finally { if (request === locationRequest.current) { locationLock.current = false; setLocating(false); } }
  }
  return <div className="tt">
    <p className="tt-local-note"><strong>Chấm công lưu tạm</strong> Lịch học lấy từ API. Check-in/check-out hiện chỉ lưu trên trình duyệt này, chưa đồng bộ về admin.</p>
    <div className="tt-stats">{stats.map(([label, value, hint, Icon, tone]) => <article className={`tt-stat tt-${tone}`} key={label}>
      <span>{label}</span><Icon size={20} aria-hidden="true" /><strong>{value}</strong><small>{hint}</small>
    </article>)}</div>
    <div className="tt-panel">
      <div className="tt-toolbar">
        <button aria-label="Tuần trước" onClick={() => setWeek(moveDay(week, -7))}><ChevronLeft size={18} /></button>
        <label className="tt-week-picker"><CalendarDays size={17} /><input type="date" aria-label="Chọn tuần giảng dạy" value={week} onChange={event => event.target.value && setWeek(monday(event.target.value))} /></label>
        <span className="tt-range">{displayDay(week)} – {displayDay(days[6])}</span>
        <button aria-label="Tuần sau" onClick={() => setWeek(moveDay(week, 7))}><ChevronRight size={18} /></button>
        <button onClick={() => setWeek(monday())}>Tuần này</button>
        {branches.length > 0 && <select aria-label="Lọc cơ sở" value={branch} onChange={event => setBranch(event.target.value)}><option value="">Tất cả cơ sở</option>{branches.map(name => <option key={name}>{name}</option>)}</select>}
      </div>
      <div className="tt-heading"><div><h2>Lịch dạy từ ngày {displayDay(week)} tới ngày {displayDay(days[6])}</h2><p>Chọn một lịch dạy để xem chi tiết và chấm công</p></div><button aria-pressed={alertsOnly} onClick={() => setAlertsOnly(!alertsOnly)}>Cảnh báo ({active.filter(row => issues(row).length > 0).length})</button></div>
      <div className="tt-scroll"><div className="tt-week">
        {days.map((day, i) => <section className={`tt-day ${day === dayVN(now) ? 'tt-today' : ''}`} key={day} aria-label={`${i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`} ${displayDay(day)}`}>
          <header><strong>{i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`}</strong><span>{displayDay(day)}</span>{day === dayVN(now) && <small>Hôm nay</small>}</header>
          <div className="tt-day-body">{visible.filter(row => dayVN(row.startAt) === day && (!alertsOnly || issues(row).length > 0)).map(row => {
            const saved = records[row.id];
            const classInfo = data.classes.find(c => c.id === row.classId);
            return <button className={`tt-lesson ${row.status === 'cancelled' ? 'tt-cancelled' : saved?.checkOut ? 'tt-complete' : ''}`} key={row.id} onClick={() => open(row)} aria-label={`Xem lịch dạy ${className(row.classId)} ${clockVN(row.startAt)} ngày ${displayDay(day)}`}>
              <strong>{clockVN(row.startAt)} – {clockVN(row.endAt)}</strong>
              <span>{row.teacher || data.profile.name}</span>
              {classInfo?.code && <b>{classInfo.code}</b>}
              <span>{className(row.classId)}</span>
              <small>{periods(row)} · {row.room || 'Chưa có phòng'}</small>
              {branchName(row) && <small>{branchName(row)}</small>}
              <div className="tt-lesson-attendance"><span className={`tt-badge ${saved?.checkOut ? 'tt-badge-success' : ''}`}>{row.status === 'cancelled' ? 'Đã hủy' : timekeepingLabel(saved)}</span>
                {issues(row).length > 0 && <small className="tt-warning">{issues(row).join(' · ')}</small>}
                <span className="tt-detail-link">Xem chi tiết ›</span><small>Vào: {clockVN(saved?.checkIn)} · Ra: {clockVN(saved?.checkOut)}</small>
              </div>
            </button>;
          })}
          {!visible.some(row => dayVN(row.startAt) === day && (!alertsOnly || issues(row).length > 0)) && <p className="tt-empty">{alertsOnly ? 'Không có cảnh báo' : 'Chưa có lịch dạy'}</p>}</div>
        </section>)}
      </div></div>
      {!visible.length && <p className="tt-week-empty">Chưa có lịch dạy trong tuần này. Bạn có thể chọn tuần khác hoặc làm mới dữ liệu.</p>}
    </div>
    <dialog ref={dialog} className="tt-dialog" aria-label="Chi tiết lịch dạy và chấm công" onCancel={close} onClose={() => { cancelLocation(); setSelected(''); }} onClick={event => { if (event.target === dialog.current) close(); }}>
      {schedule && <div className="tt-dialog-body">
        <header><div><p className="portal-eyebrow">Chi tiết lịch dạy</p><h2>{className(schedule.classId)}</h2></div><button autoFocus aria-label="Đóng chi tiết lịch dạy" onClick={close}><X size={20} /></button></header>
        <div className="tt-session-info"><p><strong>{displayDay(dayVN(schedule.startAt))} · {clockVN(schedule.startAt)} – {clockVN(schedule.endAt)}</strong></p><p>{data.profile.name} · {schedule.room || 'Chưa có phòng'} · {periods(schedule)}</p>{branchName(schedule) && <p>{branchName(schedule)}</p>}{schedule.lessonNote && <p>{schedule.lessonNote}</p>}</div>
        <section className="tt-timekeeping"><h3>Chấm công giảng dạy</h3><span className="tt-badge">{schedule.status === 'cancelled' ? 'Đã hủy' : timekeepingLabel(record)}</span><div className="tt-times"><div><LogIn size={18} /><span>Check-in<strong>{clockVN(record?.checkIn)}</strong></span></div><div><LogOut size={18} /><span>Check-out<strong>{clockVN(record?.checkOut)}</strong></span></div></div>
          {issues(schedule).length > 0 && <p className="tt-warning">{issues(schedule).join(' · ')}</p>}
          <div className="tt-actions"><button className="primary" disabled={locating || !!blocked || !!record?.checkIn} onClick={() => stamp('checkIn')}><LogIn size={16} /> Check-in</button><button disabled={locating || !!blocked || !record?.checkIn || !!record?.checkOut} onClick={() => stamp('checkOut')}><LogOut size={16} /> Check-out</button></div>
          <p className="portal-muted"><MapPin size={14} className="tt-location-icon" /> Khi check-in/check-out, hãy cho phép truy cập vị trí để lưu vị trí hiện tại của bạn.</p>
          {locating && <p role="status" className="portal-muted">Đang lấy vị trí hiện tại…</p>}
          {['checkIn', 'checkOut'].map(action => {
            if (!record?.[action]) return null;
            const evidence = record[`${action}Evidence`];
            const label = action === 'checkIn' ? 'Check-in' : 'Check-out';
            return <div className="tt-location" key={action}><strong><MapPin size={15} /> Vị trí {label}</strong>{evidence ? <><span>{evidence.latitude.toFixed(6)}, {evidence.longitude.toFixed(6)}</span><small>Độ chính xác: ±{Math.round(evidence.accuracy)} m</small><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evidence.latitude},${evidence.longitude}`)}`} target="_blank" rel="noopener noreferrer">Xem vị trí {label} trên bản đồ ↗</a></> : <span>Bản ghi cũ chưa lưu vị trí.</span>}</div>;
          })}
          {blocked && <p className="tt-warning">{blocked}</p>}
          <p className="portal-muted">Giờ chấm công theo múi giờ Việt Nam. Bản ghi lưu tạm trên trình duyệt, chưa gửi về admin.</p>
          {error && <p className="tt-error" role="alert">{error}</p>}{notice && <p className="tt-success" role="status">{notice}</p>}
        </section>
      </div>}
    </dialog>
  </div>;
}
