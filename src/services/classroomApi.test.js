import { beforeEach, expect, it, vi } from 'vitest';
import { api } from './api.js';
import { configureOnlineSession, endOnlineSession, getOnlineSession, startOnlineSession, readmitStudent } from './classroomApi.js';
vi.mock('./api.js', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());
it('encodes IDs and sends only supported fields', () => {
  getOnlineSession('a/b'); expect(api.get).toHaveBeenCalledWith('/schedule/a%2Fb/online-session');
  startOnlineSession('id'); expect(api.post).toHaveBeenCalledWith('/schedule/id/online-session/start');
  endOnlineSession('id'); expect(api.post).toHaveBeenCalledWith('/schedule/id/online-session/end', { reason: 'teacher_ended' });
  configureOnlineSession('id', { waitingRoomEnabled: true, userId: 'ignored' }); expect(api.patch).toHaveBeenCalledWith('/schedule/id/online-session', { waitingRoomEnabled: true });
  readmitStudent('id', 's/t'); expect(api.post).toHaveBeenCalledWith('/schedule/id/online-session/admissions/s%2Ft', { decision: 'admit' });
});
