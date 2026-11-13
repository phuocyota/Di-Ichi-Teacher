import { useEffect, useRef, useState } from 'react';
import { endOnlineSession, isFeatureDisabledError } from '../../services/classroomApi.js';
export function EndSessionDialog({ scheduleId, enabled, onLeave, onEnded }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector('button')?.focus();
    const opener = trigger.current;
    return () => opener?.focus();
  }, [open]);
  function keyboard(event) {
    if (event.key === 'Escape' && !busy) { event.preventDefault(); setOpen(false); }
    if (event.key !== 'Tab') return;
    const buttons = [...dialog.current.querySelectorAll('button:not(:disabled)')];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  async function end() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true); setError('');
    try { await endOnlineSession(scheduleId); onEnded(); }
    catch (failure) { setError(isFeatureDisabledError(failure) ? 'Chức năng chưa bật' : failure.message); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="flex gap-2">
    <button type="button" disabled={busy} onClick={onLeave} className="rounded-xl bg-slate-700 px-4 py-2">Rời tạm</button>
    {enabled && <button ref={trigger} type="button" onClick={() => setOpen(true)} className="rounded-xl bg-red-600 px-4 py-2">Kết thúc buổi</button>}
    {open && <div ref={dialog} role="dialog" onKeyDown={keyboard} tabIndex={-1} aria-modal="true" aria-labelledby="end-session-title" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-5"><div className="max-w-md space-y-4 rounded-2xl bg-slate-900 p-6">
      <h2 id="end-session-title" className="text-xl font-bold">Kết thúc buổi học cho tất cả mọi người?</h2>
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={() => setOpen(false)} className="m-2 rounded-lg bg-slate-700 p-3">Hủy</button>
      <button type="button" disabled={busy} onClick={end} className="rounded-lg bg-red-600 p-3">Xác nhận kết thúc</button>
    </div></div>}
  </div>;
}
