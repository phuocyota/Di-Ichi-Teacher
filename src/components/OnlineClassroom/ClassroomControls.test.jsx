import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConnectionState, Track } from 'livekit-client';
import { ClassroomChat } from './ClassroomChat.jsx';
import { PreJoinPanel } from './PreJoinPanel.jsx';
import { ClassroomStage } from './ClassroomStage.jsx';
import { ConnectionBanner } from './ConnectionBanner.jsx';
globalThis.React = React;
const mock = vi.hoisted(() => ({ send: vi.fn(), state: 'connected', messages: [] }));
vi.mock('@livekit/components-react', () => ({
  useChat: () => ({ send: mock.send, isSending: false, chatMessages: mock.messages }),
  useSpeakingParticipants: () => [],
  useConnectionState: () => mock.state,
  PreJoin: ({ onError, onSubmit }) => <><button onClick={() => onError(new Error('Denied'))}>Deny</button><button onClick={() => onSubmit({ audioEnabled: true, audioDeviceId: 'mic', videoEnabled: true, videoDeviceId: 'cam' })}>Choose devices</button></>,
  CarouselLayout: ({ tracks }) => <div>Carousel {tracks.length}</div>, FocusLayout: () => <div>Focus</div>, GridLayout: ({ tracks }) => <div>Grid {tracks.length}</div>, ParticipantTile: () => null,
}));
beforeEach(() => { vi.clearAllMocks(); mock.send.mockResolvedValue({}); mock.messages = []; mock.state = ConnectionState.Connected; });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('escapes received content and sends trimmed text, preserving a failed draft', async () => {
  mock.messages = [{ timestamp: 1, message: '<script>alert(1)</script>', from: { name: 'A' } }];
  const view = render(<ClassroomChat />);
  expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  expect(view.container.querySelector('script')).toBeNull();
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: ' Hello ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
  await waitFor(() => expect(mock.send).toHaveBeenCalledWith('Hello'));
  await waitFor(() => expect(input).toHaveValue(''));
  mock.send.mockRejectedValue(new Error('Offline'));
  fireEvent.change(input, { target: { value: 'Retry' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
  await screen.findByRole('alert');
  expect(input).toHaveValue('Retry');
  fireEvent.change(input, { target: { value: 'x'.repeat(501) } });
  expect(screen.getByRole('button', { name: 'Gửi' })).toBeDisabled();
});
it('allows listen-only entry after device permission denial and forwards selected device IDs', () => {
  const submit = vi.fn();
  render(<PreJoinPanel onSubmit={submit} />);
  fireEvent.click(screen.getByText('Deny'));
  expect(screen.getByRole('status')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Vào không cần mic/camera'));
  expect(submit).toHaveBeenCalledWith({ audioEnabled: false, videoEnabled: false });
  fireEvent.click(screen.getByText('Choose devices'));
  expect(submit).toHaveBeenCalledWith({ audioEnabled: true, audioDeviceId: 'mic', videoEnabled: true, videoDeviceId: 'cam' });
});
it('focuses a real screen share and limits mobile video tiles to four', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  const tracks = Array.from({ length: 6 }, () => ({ source: Track.Source.Camera }));
  const view = render(<ClassroomStage tracks={tracks} />);
  expect(screen.getByText('Carousel 3')).toBeInTheDocument();
  expect(screen.getByText('Focus')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Tiếp'));
  expect(screen.getByText('Carousel 1')).toBeInTheDocument();
  view.rerender(<ClassroomStage tracks={[...tracks, { source: Track.Source.ScreenShare, publication: { track: {} } }]} />);
  expect(screen.getByText('Focus')).toBeInTheDocument();
});
it('shows connection recovery without remounting the room', () => {
  const view = render(<ConnectionBanner />);
  expect(screen.queryByRole('status')).toBeNull();
  mock.state = ConnectionState.Reconnecting;
  view.rerender(<ConnectionBanner />);
  expect(screen.getByRole('status')).toHaveTextContent('Đang kết nối lại');
  mock.state = ConnectionState.Disconnected;
  view.rerender(<ConnectionBanner />);
  expect(screen.getByRole('status')).toHaveTextContent('Đã mất kết nối');
});
