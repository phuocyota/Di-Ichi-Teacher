import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TeacherClassroomPage as Page } from './TeacherClassroomPage.jsx';
import { getOnlineSession, joinClassroom } from '../../services/classroomApi.js';
import fixture from '../../hooks/__fixtures__/onlineSession.json';
import joinFixture from '../../hooks/__fixtures__/classroomJoin.json';
globalThis.React = React;
const mock = vi.hoisted(() => ({ roomProps: null }));
vi.mock('@livekit/components-react', () => ({
  PreJoin: ({ onSubmit }) => <button onClick={() => onSubmit({ audioEnabled: true, videoEnabled: true, audioDeviceId: 'mic-1', videoDeviceId: 'cam-1' })}>Use devices</button>,
  LiveKitRoom: props => { mock.roomProps = props; return <div data-testid="live-room">{props.children}</div>; },
}));
vi.mock('../../components/OnlineClassroom/TeacherClassroomExperience.jsx', () => ({ TeacherClassroomExperience: ({ onEnded }) => <button onClick={onEnded}>Remote end</button> }));
vi.mock('../../services/classroomApi.js', () => ({ getClassroomErrorMessage: error => error.message, getOnlineSession: vi.fn(), joinClassroom: vi.fn(), startOnlineSession: vi.fn(), isFeatureDisabledError: () => false }));
beforeEach(() => {
  vi.clearAllMocks();
  const storage = new Map();
  vi.stubGlobal('sessionStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) });
  getOnlineSession.mockResolvedValue({ ...fixture, session: { status: 'active' } });
  joinClassroom.mockResolvedValue(joinFixture);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const mount = () => render(<MemoryRouter initialEntries={['/vn/lop-hoc-online/schedule-id']}><Routes><Route path="/vn/lop-hoc-online/:scheduleId" element={<Page />} /></Routes></MemoryRouter>);
it('passes selected devices and stable room options; unmounts the room on classroom:ended', async () => {
  mount();
  fireEvent.click(await screen.findByText('Use devices'));
  await screen.findByTestId('live-room');
  expect(mock.roomProps.audio).toEqual({ deviceId: 'mic-1' });
  expect(mock.roomProps.video).toEqual({ deviceId: 'cam-1' });
  expect(mock.roomProps.options).toMatchObject({ adaptiveStream: true, dynacast: true, publishDefaults: { simulcast: true } });
  fireEvent.click(screen.getByText('Remote end'));
  await screen.findByText('Buổi học đã kết thúc');
  expect(screen.queryByTestId('live-room')).toBeNull();
});
it('never mounts LiveKitRoom if A4 has no token', async () => {
  joinClassroom.mockResolvedValue({ token: null, admission: 'removed' });
  mount();
  fireEvent.click(await screen.findByText('Use devices'));
  await screen.findByText('Bạn đã được mời ra khỏi lớp');
  expect(screen.queryByTestId('live-room')).toBeNull();
});
it('respects backend media permissions even when selected in prejoin', async () => {
  joinClassroom.mockResolvedValue({ token: 'token', permissions: { canUseMic: false, canUseCamera: false } });
  mount();
  fireEvent.click(await screen.findByText('Use devices'));
  await waitFor(() => expect(screen.getByTestId('live-room')).toBeInTheDocument());
  expect(mock.roomProps.audio).toBe(false);
  expect(mock.roomProps.video).toBe(false);
});
