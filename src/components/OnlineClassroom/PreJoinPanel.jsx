import { useState } from 'react';
import { PreJoin } from '@livekit/components-react';

export function PreJoinPanel({ onSubmit, busy, displayName }) {
  const [deviceError, setDeviceError] = useState(false);
  return <section className="mx-auto max-w-xl space-y-4 p-6" data-lk-theme="default">
    <h1 className="text-2xl font-bold">Chuẩn bị vào lớp</h1>
    <fieldset disabled={busy}>
      <PreJoin defaults={{ username: displayName || 'Participant', audioEnabled: false, videoEnabled: false }}
        persistUserChoices={false} onSubmit={onSubmit} onError={() => setDeviceError(true)}
        joinLabel="Vào lớp" micLabel="Mic" camLabel="Camera" userLabel="Tên hiển thị" />
    </fieldset>
    {deviceError && <p role="status">Không truy cập được thiết bị. Bạn vẫn có thể vào lớp chỉ nghe.</p>}
    <button type="button" disabled={busy} onClick={() => onSubmit({ audioEnabled: false, videoEnabled: false })} className="rounded-xl bg-orange-600 px-4 py-3 font-bold text-white disabled:opacity-50">Vào không cần mic/camera</button>
  </section>;
}
