import { ClassroomWhiteboard } from './ClassroomWhiteboard.jsx';
import { ClassroomLesson } from './ClassroomLesson.jsx';
import './classroom.css';
import { BookOpen, PenLine, Radio, Users, MessageSquare } from 'lucide-react';
import { EndSessionDialog } from './EndSessionDialog.jsx';
import { ClassroomStage } from './ClassroomStage.jsx';
import { ClassroomPanels } from './ClassroomPanels.jsx';
import { ConnectionBanner } from './ConnectionBanner.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ControlBar,
  LayoutContextProvider,
  RoomAudioRenderer,
  StartAudio,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';
import { RoomEvent, Track } from 'livekit-client';
import { toast } from 'sonner';
import {
  getClassroomErrorMessage,
  getClassroomParticipants,
  kickClassroomParticipant,
  updateClassroomPermissions,
  readmitStudent,
  isFeatureDisabledError,
} from '../../services/classroomApi.js';
import { useClassroomSocket } from '../../hooks/useClassroomSocket.js';
import { ClassroomBoard } from './ClassroomBoard.jsx';
import { ParticipantPanel } from './ParticipantPanel.jsx';

export const TeacherClassroomExperience = ({
  joinData,
  onLeave,
  onEnded,
  onDeviceError,
}) => {
  const [lessonOpened, setLessonOpened] = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const [sidePanel, setSidePanel] = useState(null);
  const closePanel = useCallback(() => setSidePanel(null), []);
  const [boardOpen, setBoardOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const closeBoard = useCallback(() => setBoardOpen(false), []);
  const onPresentationChange = useCallback((active) => {
    setPresenting(active);
    setShowLesson(active);
  }, []);
  const removedStudents = useRef(new Set());
  const [readmitting, setReadmitting] = useState('');
  const readmitPending = useRef(false);
  const [participants, setParticipants] = useState([]);
  const [raisedHands, setRaisedHands] = useState(new Set());
  const [saving, setSaving] = useState('');
  const [kicking, setKicking] = useState(new Set());
  const kickRequests = useRef(new Set());
  const rosterRequest = useRef(0);
  const room = useRoomContext();
  const loadParticipants = useCallback(async () => {
    const request = ++rosterRequest.current;
    try {
      const result = await getClassroomParticipants(joinData.scheduleId);
      if (request === rosterRequest.current)
        setParticipants(
          result.map((item) =>
            removedStudents.current.has(item.studentId)
              ? { ...item, admissionStatus: 'removed' }
              : item,
          ),
        );
    } catch (error) {
      if (request === rosterRequest.current)
        toast.error('Không thể tải danh sách học sinh', {
          description: getClassroomErrorMessage(error),
        });
    }
  }, [joinData.scheduleId]);
  const onEvent = useCallback(
    (eventName, event) => {
      if (eventName === 'classroom:ended') {
        onEnded?.();
        return;
      }
      if (
        eventName === 'classroom:participant-kicked' &&
        joinData.features?.kickBan
      ) {
        setParticipants((current) =>
          current.map((item) => {
            if (item.identity !== event.identity) return item;
            removedStudents.current.add(item.studentId);
            return { ...item, connected: false, admissionStatus: 'removed' };
          }),
        );
      }
      if (
        eventName === 'classroom:raise-hand' ||
        eventName === 'classroom:lower-hand'
      ) {
        setRaisedHands((current) => {
          const next = new Set(current);
          if (eventName === 'classroom:raise-hand') next.add(event.studentId);
          else next.delete(event.studentId);
          return next;
        });
      }
      if (
        [
          'classroom:resynced',
          'classroom:participant-joined',
          'classroom:participant-left',
          'classroom:participant-kicked',
        ].includes(eventName)
      )
        void loadParticipants();
      if (eventName === 'classroom:permission-changed') {
        setParticipants((current) =>
          current.map((item) =>
            item.identity === event.identity
              ? { ...item, permissions: event.permissions }
              : item,
          ),
        );
      }
    },
    [loadParticipants, onEnded, joinData.features?.kickBan],
  );
  const { socket, connected } = useClassroomSocket({
    scheduleId: joinData.scheduleId,
    onEvent,
  });
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  useEffect(() => {
    void loadParticipants();
    const timer = window.setInterval(loadParticipants, 15000);
    const refresh = () => {
      void loadParticipants();
    };
    const events = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.Reconnected,
    ];
    events.forEach((event) => room.on(event, refresh));
    return () => {
      window.clearInterval(timer);
      events.forEach((event) => room.off(event, refresh));
      // This is a request counter, not a DOM ref: invalidate outstanding fetches on cleanup.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      rosterRequest.current++;
    };
  }, [loadParticipants, room]);

  const kickParticipant = async (participant) => {
    const { identity } = participant;
    if (
      !identity ||
      !participant.connected ||
      kickRequests.current.has(identity)
    )
      return;
    kickRequests.current.add(identity);
    setKicking(new Set(kickRequests.current));
    try {
      const result = await kickClassroomParticipant(
        joinData.scheduleId,
        identity,
      );
      if (result.admissionStatus === 'removed')
        removedStudents.current.add(participant.studentId);
      rosterRequest.current++;
      setParticipants((current) =>
        current.map((item) =>
          item.identity === identity
            ? {
                ...item,
                connected: false,
                admissionStatus: result.admissionStatus,
              }
            : item,
        ),
      );
      setRaisedHands((current) => {
        const next = new Set(current);
        next.delete(participant.studentId);
        return next;
      });
      toast.success(
        result.removed ? 'Đã mời học sinh ra khỏi lớp' : 'Học sinh đã rời lớp',
      );
      await loadParticipants();
    } catch (error) {
      toast.error('Không thể mời học sinh ra khỏi lớp', {
        description: getClassroomErrorMessage(error),
      });
    } finally {
      kickRequests.current.delete(identity);
      setKicking(new Set(kickRequests.current));
    }
  };

  const readmit = async (participant) => {
    if (readmitPending.current) return;
    readmitPending.current = true;
    setReadmitting(participant.studentId);
    try {
      await readmitStudent(joinData.scheduleId, participant.studentId);
      removedStudents.current.delete(participant.studentId);
      setParticipants((current) =>
        current.map((item) =>
          item.studentId === participant.studentId
            ? { ...item, admissionStatus: 'admitted' }
            : item,
        ),
      );
    } catch (error) {
      if (isFeatureDisabledError(error)) toast.info('Chức năng chưa bật');
      else
        toast.error('Không thể cho học sinh vào lại', {
          description: getClassroomErrorMessage(error),
        });
    } finally {
      readmitPending.current = false;
      setReadmitting('');
    }
  };

  const changePermission = async (participant, key, value) => {
    const savingKey = `${participant.studentId}:${key}`;
    setSaving(savingKey);
    try {
      const result = await updateClassroomPermissions(
        joinData.scheduleId,
        participant.studentId,
        { [key]: value },
      );
      setParticipants((current) =>
        current.map((item) =>
          item.studentId === participant.studentId
            ? { ...item, permissions: result.permissions }
            : item,
        ),
      );
    } catch (error) {
      toast.error('Không thể cập nhật quyền', {
        description: getClassroomErrorMessage(error),
      });
    } finally {
      setSaving('');
    }
  };

  return (
    <LayoutContextProvider>
      <div
        className="live-classroom flex flex-col bg-slate-950 text-white"
        data-lk-theme="default"
      >
        <ConnectionBanner />
        <header className="live-header flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="live-eyebrow">
              <Radio size={14} aria-hidden="true" /> Lớp học trực tuyến
            </p>
            <h1 className="live-title text-xl font-black">
              {joinData.className || 'Lớp học trực tuyến'}
            </h1>
            <p className="text-xs text-slate-400">
              <span
                className={
                  connected ? 'live-status' : 'live-status live-status--waiting'
                }
              >
                {connected ? 'Đã kết nối' : 'Đang kết nối lại'}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {presenting && (
              <span className="live-presentation-badge" role="status">
                Đang trình chiếu
              </span>
            )}
          </div>
        </header>
        <div className="live-room-content flex min-h-0 flex-1">
          <main className="live-main flex min-w-0 flex-1 flex-col">
            <div
              className={`live-meeting-stage${showLesson ? ' live-meeting-stage--presenting' : ''}`}
            >
              <div
                id="live-lesson-workspace"
                className="live-lesson-focus"
                hidden={!showLesson}
              >
                {lessonOpened && (
                  <ClassroomLesson
                    socket={socket}
                    connected={connected}
                    joinData={joinData}
                    onPresentationChange={onPresentationChange}
                  />
                )}
              </div>
              <div
                className="live-camera-zone"
                aria-label={showLesson ? 'Video người tham gia' : 'Phòng học'}
              >
                {showLesson && (
                  <p className="live-camera-heading">Người tham gia</p>
                )}
                <ClassroomStage
                  tracks={tracks}
                  hostIdentity={joinData.hostIdentity}
                  compact={showLesson}
                />
              </div>
            </div>
            <RoomAudioRenderer />
            <StartAudio label="Bật âm thanh" />
            <ClassroomWhiteboard open={boardOpen} onClose={closeBoard}>
              <ClassroomBoard
                socket={socket}
                scheduleId={joinData.scheduleId}
                permissions={joinData.permissions}
              />
            </ClassroomWhiteboard>
          </main>
          <div
            id="live-side-panel"
            className="live-side-panel"
            hidden={!sidePanel}
          >
            <ClassroomPanels
              visible={Boolean(sidePanel)}
              activeTab={sidePanel || 'participants'}
              onTabChange={setSidePanel}
              onClose={closePanel}
              participants={
                <ParticipantPanel
                  kickBan={joinData.features?.kickBan}
                  onReadmit={readmit}
                  readmitting={readmitting}
                  participants={participants}
                  raisedHands={raisedHands}
                  saving={saving}
                  onPermission={changePermission}
                  kicking={kicking}
                  onKick={kickParticipant}
                />
              }
            />
          </div>
        </div>
        <footer className="live-controls" aria-label="Điều khiển lớp học">
          <div className="live-toolbar-actions">
            <div className="live-media-controls">
              {' '}
              <ControlBar
                variation="verbose"
                controls={{
                  microphone: true,
                  camera: true,
                  screenShare: true,
                  chat: false,
                  settings: true,
                  leave: false,
                }}
                onDeviceError={({ error }) => onDeviceError(error.message)}
              />
            </div>
            <div className="live-meeting-tools" aria-label="Công cụ lớp học">
              <button
                type="button"
                className="live-tool-button"
                aria-expanded={boardOpen}
                aria-controls="live-whiteboard"
                onClick={() => setBoardOpen(true)}
              >
                <PenLine size={18} aria-hidden="true" /> Bảng trắng
              </button>
              <button
                type="button"
                className="live-tool-button"
                aria-pressed={showLesson}
                onClick={() => {
                  setLessonOpened(true);
                  setShowLesson((value) => !value);
                }}
              >
                <BookOpen size={18} aria-hidden="true" />{' '}
                {showLesson ? 'Ẩn giáo án' : 'Mở giáo án'}
              </button>
            </div>

            <div className="live-panel-controls">
              <button
                type="button"
                className="live-tool-button"
                aria-expanded={sidePanel === 'participants'}
                aria-controls="live-side-panel"
                onClick={() =>
                  setSidePanel((value) =>
                    value === 'participants' ? null : 'participants',
                  )
                }
              >
                <Users size={21} aria-hidden="true" /> Học sinh
              </button>
              <button
                type="button"
                className="live-tool-button"
                aria-expanded={sidePanel === 'chat'}
                aria-controls="live-side-panel"
                onClick={() =>
                  setSidePanel((value) => (value === 'chat' ? null : 'chat'))
                }
              >
                <MessageSquare size={21} aria-hidden="true" /> Trò chuyện
              </button>
            </div>
          </div>
          <div className="live-exit-controls">
            {' '}
            <EndSessionDialog
              scheduleId={joinData.scheduleId}
              enabled={Boolean(joinData.features?.lifecycle && joinData.isHost)}
              onLeave={onLeave}
              onEnded={onEnded}
            />
          </div>
        </footer>
      </div>
    </LayoutContextProvider>
  );
};
