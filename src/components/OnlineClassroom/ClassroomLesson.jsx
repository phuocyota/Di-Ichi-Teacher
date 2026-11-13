import { useCallback, useEffect, useRef, useState } from 'react';
import SlidePresentation from '../../lesson-planner/SlidePresentation.jsx';
import { portalRequest } from '../../services/portalApi.js';
import '../../lesson-planner/lesson-planner.css';

const sendPresentation = (socket, scheduleId, data) =>
  new Promise((resolve, reject) => {
    if (!socket?.connected || !socket.classroomReady) {
      reject(new Error('Kết nối lớp học chưa sẵn sàng. Vui lòng thử lại.'));
      return;
    }
    socket
      .timeout(8000)
      .emit('lesson:present', { scheduleId, data }, (error, result) => {
        if (error || result?.ok !== true)
          reject(
            new Error(
              result?.message || 'Không thể đồng bộ giáo án. Vui lòng thử lại.',
            ),
          );
        else resolve(result);
      });
  });

export function ClassroomLesson({
  socket,
  connected,
  joinData,
  onPresentationChange,
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const state = useRef(null);
  const pending = useRef(false);
  const transport = useRef(Promise.resolve());
  const alive = useRef(false);
  const selection = useRef(null);
  const publish = useCallback(
    (data) => {
      const request = transport.current
        .catch(() => {})
        .then(() => sendPresentation(socket, joinData.scheduleId, data));
      transport.current = request;
      return request;
    },
    [socket, joinData.scheduleId],
  );
  const replay = useCallback(() => {
    if (!pending.current && joinData.isHost) {
      void publish(state.current || { planId: null }).catch(() => {});
    }
  }, [publish, joinData.isHost]);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      selection.current?.abort();
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!joinData.classId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    portalRequest('/lesson-plans', { signal: controller.signal })
      .then((result) => {
        if (!Array.isArray(result?.items))
          throw new Error('Danh sách giáo án không hợp lệ');
        if (!controller.signal.aborted)
          setItems(
            result.items.filter(
              (item) =>
                item.classId === joinData.classId &&
                item.status === 'ready' &&
                item.editorMode !== 'elearning',
            ),
          );
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [joinData.classId, retry]);
  useEffect(() => {
    if (!socket || !connected) return;
    const request = (event) => {
      if (event?.scheduleId === joinData.scheduleId) replay();
    };
    socket.on('lesson:request', request);
    replay();
    return () => socket.off('lesson:request', request);
  }, [socket, connected, joinData.scheduleId, replay]);

  const present = async (plan, nextIndex = 0) => {
    if (pending.current || !joinData.isHost) return;
    pending.current = true;
    setBusy(true);
    setError('');
    try {
      const data = plan
        ? {
            planId: plan.id,
            revision: plan.revision || 0,
            slideIndex: nextIndex,
          }
        : { planId: null };
      await publish(data);
      if (!alive.current) return;
      state.current = plan ? data : null;
      setActive(plan);
      if (Boolean(plan) !== Boolean(active))
        onPresentationChange?.(Boolean(plan));
      setSlideIndex(nextIndex);
    } catch (failure) {
      if (alive.current) setError(failure.message);
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const choose = async (id) => {
    if (busy || selection.current) return;
    const controller = new AbortController();
    selection.current = controller;
    setBusy(true);
    setError('');
    try {
      const plan = await portalRequest(
        `/lesson-plans/${encodeURIComponent(id)}`,
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (
        plan.classId !== joinData.classId ||
        !Array.isArray(plan.blocks) ||
        plan.editorMode === 'elearning'
      )
        throw new Error('Giáo án không thuộc lớp học này');
      if (!(plan.pages?.length || plan.blocks.length))
        throw new Error('Giáo án chưa có nội dung để trình chiếu');
      await present(plan);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure.message);
    } finally {
      selection.current = null;
      if (alive.current) setBusy(false);
    }
  };

  return (
    <section
      className="live-lesson"
      aria-label="Giáo án trong lớp Live"
      aria-busy={busy || loading}
    >
      <div className="live-lesson-heading">
        <div>
          <h2>Giáo án của lớp</h2>
          <p>
            {active
              ? 'Học viên đang theo dõi slide bạn trình chiếu.'
              : 'Chọn giáo án đã chia sẻ để trình chiếu cùng học viên.'}
          </p>
        </div>
        {active && (
          <button
            type="button"
            disabled={busy || !connected}
            onClick={() => present(null)}
          >
            Dừng trình chiếu
          </button>
        )}
      </div>
      {!connected && <p role="status">Đang chờ kết nối để đồng bộ giáo án…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            type="button"
            disabled={busy || loading}
            onClick={() => setRetry((value) => value + 1)}
          >
            Tải lại danh sách
          </button>
        </div>
      )}
      {!joinData.classId ? (
        <p>Không xác định được lớp của buổi học. Vui lòng vào lại phòng.</p>
      ) : !joinData.isHost ? (
        <p>Giáo viên phụ trách buổi học sẽ điều khiển giáo án.</p>
      ) : active ? (
        <SlidePresentation
          key={`${active.id}:${active.revision}`}
          embedded
          plan={active}
          slideIndex={slideIndex}
          navigationLocked={busy || !connected}
          onSlideChange={(next) => present(active, next)}
        />
      ) : loading ? (
        <p role="status">Đang tải giáo án…</p>
      ) : !items.length && !error ? (
        <p>
          Chưa có giáo án được chia sẻ cho lớp. Hãy gán giáo án cho lớp và
          chuyển sang trạng thái sẵn sàng trong mục Giáo án của tôi.
        </p>
      ) : (
        <ul className="live-lesson-list">
          {items.map((item) => (
            <li key={item.id}>
              <div>
                <h3>{item.title}</h3>
                <p>
                  {item.subject || 'Giáo án'} · {item.blockCount || 0} nội dung
                </p>
              </div>
              <button
                type="button"
                disabled={busy || !connected}
                onClick={() => choose(item.id)}
              >
                Trình chiếu
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
