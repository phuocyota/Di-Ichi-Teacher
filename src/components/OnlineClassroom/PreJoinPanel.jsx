import './classroom.css';
import { Video, Headphones, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PreJoin } from '@livekit/components-react';

export function PreJoinPanel({ onSubmit, busy, displayName }) {
  const [deviceError, setDeviceError] = useState(false);
  return <section className="live-prejoin mx-auto max-w-xl space-y-4 p-6" data-lk-theme="default">
    <div className="live-prejoin-icon"><Video size={26} aria-hidden="true" /></div>
      <p className="live-prejoin-eyebrow">DI-ICHI · LIVE CLASSROOM</p>
      <h1 className="text-2xl font-bold">Chuẩn bị vào lớp</h1>
      <p className="live-prejoin-description">Kiểm tra hình ảnh và âm thanh để sẵn sàng cho buổi học.</p>
    <fieldset disabled={busy} aria-busy={Boolean(busy)}>
      <PreJoin defaults={{ username: displayName || 'Participant', audioEnabled: false, videoEnabled: false }}
        persistUserChoices={false} onSubmit={onSubmit} onError={() => setDeviceError(true)}
        joinLabel="Vào lớp" micLabel="Mic" camLabel="Camera" userLabel="Tên hiển thị" />
    </fieldset>
    {deviceError && <p role="status">Không truy cập được thiết bị. Bạn vẫn có thể vào lớp chỉ nghe.</p>}
    <button type="button" disabled={busy} onClick={() => onSubmit({ audioEnabled: false, videoEnabled: false })} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50"><Headphones size={18} aria-hidden="true" />Vào không cần mic/camera</button>
      <p className="live-prejoin-note"><ShieldCheck size={16} aria-hidden="true" /> Mic và camera mặc định tắt. Bạn có thể bật khi sẵn sàng.</p>
      {busy && <p role="status" className="live-prejoin-description">Đang kết nối vào lớp…</p>}
  </section>;
}
