import { useCallback, useEffect, useRef, useState } from 'react';
import { DisconnectReason } from 'livekit-client';
import { getClassroomErrorMessage, getOnlineSession, isFeatureDisabledError, joinClassroom, startOnlineSession } from '../services/classroomApi.js';

export function disconnectState(reason) {
  if (reason === DisconnectReason.DUPLICATE_IDENTITY) return 'duplicate';
  if (reason === DisconnectReason.PARTICIPANT_REMOVED) return 'removed';
  if (reason === DisconnectReason.ROOM_DELETED) return 'ended';
  return 'disconnected';
}
const refreshKey = id => `classroom-prejoin:${id}`;
export function useClassroomSession(scheduleId, initialData) {
  const [state, setState] = useState('detail');
  const [detail, setDetail] = useState(null);
  const [joinData, setJoinData] = useState(null);
  const [choices, setChoices] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const pending = useRef(false);
  const finish = useCallback(next => {
    generation.current++;
    pending.current = false;
    setBusy(false);
    setState(next);
    setJoinData(null);
    try { sessionStorage.removeItem(refreshKey(scheduleId)); } catch { /* Storage may be unavailable. */ }
  }, [scheduleId]);
  const enter = useCallback(async (selection, knownDetail) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const current = generation.current;
    try {
      let info = knownDetail;
      // Recheck access after pre-join; a teacher may have ended the session meanwhile.
      if (info) info = await getOnlineSession(scheduleId);
      if (current !== generation.current) return;
      if (info?.features?.kickBan && info.me?.admissionStatus === 'removed') { finish('removed'); return; }
      if (info?.features?.lifecycle && info.session?.status === 'ended') { finish('ended'); return; }
      if (info?.features?.lifecycle && info.me?.isHost && info.session?.status !== 'active') {
        if (!info.me.canStart) throw new Error(info.me.joinReason || 'Chưa thể bắt đầu');
        try { await startOnlineSession(scheduleId); }
        catch (failure) { if (!isFeatureDisabledError(failure)) throw failure; info = await getOnlineSession(scheduleId); if (info.features?.lifecycle) throw new Error('Chức năng chưa bật'); }
      } else if (info && !info.me?.canJoin) throw new Error(info.me?.joinReason || 'Chưa thể tham gia');
      if (current !== generation.current) return;
      const data = await joinClassroom(scheduleId);
      if (current !== generation.current) return;
      if (data.admission === 'removed') { finish('removed'); return; }
      if (!data.token) throw new Error('Bạn chưa được phép vào lớp');
      setDetail(info);
      setChoices(selection);
      setJoinData(data);
      setState('live');
    } catch (failure) { if (current === generation.current) setError(isFeatureDisabledError(failure) ? 'Chức năng chưa bật' : getClassroomErrorMessage(failure)); }
    finally { if (current === generation.current) { pending.current = false; setBusy(false); } }
  }, [scheduleId, finish]);
  const invalidate = useCallback(() => { generation.current++; pending.current = false; }, []);
  useEffect(() => {
    const current = ++generation.current;
    pending.current = false;
    async function load() {
      // Defer initialization to the cancellable async task, including StrictMode cleanup.
      await Promise.resolve();
      if (current !== generation.current) return;
      setBusy(false);
      setState('detail');
      setError('');
      setJoinData(null);
      setDetail(null);
      try {
        let info;
        try { info = await getOnlineSession(scheduleId); }
        catch (failure) { if (!isFeatureDisabledError(failure)) throw failure; info = null; }
        if (current !== generation.current) return;
        setDetail(info);
        if (info?.features?.kickBan && info.me?.admissionStatus === 'removed') { finish('removed'); return; }
        if (info?.features?.lifecycle && info.session?.status === 'ended') { finish('ended'); return; }
        if (info && !info.me?.canJoin && !info.me?.canStart) throw new Error(info.me?.joinReason || 'Chưa thể bắt đầu');
        if (!info && initialData?.token) {
          setChoices({ audioEnabled: false, videoEnabled: false });
          setJoinData(initialData);
          setState('live');
          return;
        }
        if (!info) { setState('prejoin'); await enter({ audioEnabled: false, videoEnabled: false }, info); }
        else setState('prejoin');
      } catch (failure) { if (current === generation.current) setError(getClassroomErrorMessage(failure)); }
    }
    if (scheduleId) void load();
    return invalidate;
  }, [scheduleId, attempt, enter, finish, initialData, invalidate]);
  return { state, detail, joinData, choices, busy, error, enter: selection => enter(selection, detail), finish,
    retry: () => setAttempt(value => value + 1), disconnect: reason => finish(disconnectState(reason)) };
}
