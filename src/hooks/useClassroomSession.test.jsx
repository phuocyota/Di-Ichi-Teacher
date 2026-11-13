import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DisconnectReason } from 'livekit-client';
import fixture from './__fixtures__/onlineSession.json';
import { disconnectState, useClassroomSession } from './useClassroomSession.js';
import { getOnlineSession, joinClassroom, startOnlineSession } from '../services/classroomApi.js';
vi.mock('../services/classroomApi.js', () => ({
  getClassroomErrorMessage: error => error.message, getOnlineSession: vi.fn(), joinClassroom: vi.fn(), startOnlineSession: vi.fn(),
  isFeatureDisabledError: error => (error?.response?.status ?? error?.status) === 404,
}));
const choices = { audioEnabled: false, videoEnabled: false };
let info;
beforeEach(() => {
  vi.clearAllMocks();
  // Explicit in-memory storage also covers Node versions with experimental webstorage.
  const storage = new Map();
  vi.stubGlobal('sessionStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) });
  info = structuredClone(fixture);
  getOnlineSession.mockImplementation(async () => info);
  joinClassroom.mockResolvedValue({ token: 'test-token', permissions: {}, admission: 'admitted' });
  startOnlineSession.mockResolvedValue({});
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function ready() {
  const view = renderHook(() => useClassroomSession('schedule-id'));
  await waitFor(() => expect(view.result.current.state).toBe('prejoin'));
  return view;
}
describe('classroom entry and terminal states', () => {
  it('waits for prejoin and rechecks access before requesting a token', async () => {
    const view = await ready();
    expect(joinClassroom).not.toHaveBeenCalled();
    await act(async () => view.result.current.enter(choices));
    expect(getOnlineSession).toHaveBeenCalledTimes(2);
    expect(view.result.current.state).toBe('live');
    expect(view.result.current.choices).toEqual(choices);
    expect(startOnlineSession).toHaveBeenCalledExactlyOnceWith('schedule-id');
  });
  it('does not call lifecycle start with flags OFF', async () => {
    info.features.lifecycle = false;
    const view = await ready();
    await act(async () => view.result.current.enter(choices));
    expect(view.result.current.state).toBe('live');
    expect(startOnlineSession).not.toHaveBeenCalled();
  });
  it('uses legacy join only for A1 404', async () => {
    getOnlineSession.mockRejectedValue({ response: { status: 404 }, status: 404 });
    const view = renderHook(() => useClassroomSession('schedule-id'));
    await waitFor(() => expect(view.result.current.state).toBe('live'));
    expect(startOnlineSession).not.toHaveBeenCalled();
  });
  it('does not fall back on authorization or network errors, and retries explicitly', async () => {
    getOnlineSession.mockRejectedValueOnce(new Error('Forbidden'));
    const view = renderHook(() => useClassroomSession('schedule-id'));
    await waitFor(() => expect(view.result.current.error).toBe('Forbidden'));
    expect(joinClassroom).not.toHaveBeenCalled();
    act(() => view.result.current.retry());
    await waitFor(() => expect(view.result.current.state).toBe('prejoin'));
  });
  it.each(['ended', 'removed'])('blocks entry when session is %s', async terminal => {
    if (terminal === 'ended') info.session.status = 'ended';
    else info.me.admissionStatus = 'removed';
    const view = renderHook(() => useClassroomSession('schedule-id'));
    await waitFor(() => expect(view.result.current.state).toBe(terminal));
    expect(joinClassroom).not.toHaveBeenCalled();
  });
  it('blocks a session ended while the user was choosing devices', async () => {
    const view = await ready();
    info.session.status = 'ended';
    await act(async () => view.result.current.enter(choices));
    expect(view.result.current.state).toBe('ended');
    expect(joinClassroom).not.toHaveBeenCalled();
  });
  it.each([['removed', 'removed'], ['waiting', 'prejoin']])('never opens the room for A4 admission %s without a token', async (admission, expected) => {
    const view = await ready();
    joinClassroom.mockResolvedValue({ token: null, admission });
    await act(async () => view.result.current.enter(choices));
    expect(view.result.current.state).toBe(expected);
    expect(view.result.current.joinData).toBeNull();
  });
  it('ignores a token request completing after a terminal event', async () => {
    const view = await ready();
    let resolve;
    joinClassroom.mockImplementation(() => new Promise(done => { resolve = done; }));
    let entering;
    act(() => { entering = view.result.current.enter(choices); });
    await waitFor(() => expect(joinClassroom).toHaveBeenCalledOnce());
    act(() => view.result.current.finish('ended'));
    await act(async () => { resolve({ token: 'late' }); await entering; });
    expect(view.result.current.state).toBe('ended');
    expect(view.result.current.joinData).toBeNull();
  });
  it.each([
    [DisconnectReason.DUPLICATE_IDENTITY, 'duplicate'],
    [DisconnectReason.PARTICIPANT_REMOVED, 'removed'],
    [DisconnectReason.ROOM_DELETED, 'ended'],
    [undefined, 'disconnected'],
  ])('handles disconnect %s without auto rejoin', async (reason, expected) => {
    expect(disconnectState(reason)).toBe(expected);
    const view = await ready();
    await act(async () => view.result.current.enter(choices));
    const calls = joinClassroom.mock.calls.length;
    act(() => view.result.current.disconnect(reason));
    expect(view.result.current.state).toBe(expected);
    expect(joinClassroom).toHaveBeenCalledTimes(calls);
  });
  it('deduplicates Start and join submissions', async () => {
    const view = await ready();
    await act(async () => { await Promise.all([view.result.current.enter(choices), view.result.current.enter(choices)]); });
    expect(startOnlineSession).toHaveBeenCalledOnce();
    expect(joinClassroom).toHaveBeenCalledOnce();
  });
  it('does not start an active session again', async () => {
    info.session.status = 'active';
    const view = await ready();
    await act(async () => view.result.current.enter(choices));
    expect(startOnlineSession).not.toHaveBeenCalled();
  });
});
