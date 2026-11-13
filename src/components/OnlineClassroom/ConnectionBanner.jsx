import { useConnectionState } from '@livekit/components-react';
import { ConnectionState } from 'livekit-client';
export function ConnectionBanner() {
  const state = useConnectionState();
  if (state === ConnectionState.Connected || state === ConnectionState.Connecting) return null;
  return <p role="status" className="bg-amber-100 p-3 text-center font-bold text-amber-950">{state === ConnectionState.Disconnected ? 'Đã mất kết nối lớp học' : 'Đang kết nối lại lớp học…'}</p>;
}
