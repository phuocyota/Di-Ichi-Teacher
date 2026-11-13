import { useRef, useState } from 'react';
import { useChat } from '@livekit/components-react';

export function ClassroomChat() {
  const { chatMessages, send, isSending } = useChat();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  async function submit(event) {
    event.preventDefault();
    const value = message.trim();
    if (!value || value.length > 500 || isSending || pending.current) return;
    pending.current = true;
    setError('');
    try { await send(value); setMessage(current => current === message ? '' : current); }
    catch { setError('Không gửi được tin nhắn. Vui lòng thử lại.'); }
    finally { pending.current = false; }
  }
  return <section aria-label="Trò chuyện" className="border-t border-white/10 p-4">
    <h2 className="font-bold">Trò chuyện</h2>
    <ol data-i18n-skip aria-live="polite" className="my-3 max-h-48 overflow-y-auto">
      {chatMessages.map((item, index) => <li key={item.id || `${item.timestamp}-${index}`} className="break-words whitespace-pre-wrap"><b>{item.from?.name || item.from?.identity}: </b>{item.message}</li>)}
    </ol>
    <form onSubmit={submit} className="flex gap-2">
      <input aria-label="Tin nhắn" maxLength={500} value={message} onChange={event => setMessage(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-slate-800 p-2 text-white" />
      <button type="submit" disabled={isSending || !message.trim() || message.trim().length > 500} className="rounded-lg bg-orange-600 p-2 disabled:opacity-50">Gửi</button>
    </form>
    {error && <p role="alert">{error}</p>}
  </section>;
}
