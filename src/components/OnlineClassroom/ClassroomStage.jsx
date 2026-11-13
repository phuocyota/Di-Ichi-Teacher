import { useEffect, useState } from 'react';
import {
  FocusLayout,
  ParticipantTile,
  useSpeakingParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

export function ClassroomStage({ tracks, hostIdentity, compact = false }) {
  const speakers = useSpeakingParticipants();
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 767px)').matches ?? false,
  );
  const [page, setPage] = useState(0);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 767px)');
    if (!query) return;
    const change = () => setMobile(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  const share = tracks.find(
    (track) =>
      track.source === Track.Source.ScreenShare && track.publication?.track,
  );
  const cameras = tracks.filter(
    (track) => track.source === Track.Source.Camera,
  );
  const speaker = cameras.find(
    (track) =>
      track.participant?.identity === speakers[0]?.identity &&
      speakers[0]?.identity,
  );
  const host = cameras.find(
    (track) => hostIdentity && track.participant?.identity === hostIdentity,
  );
  const focus = share || speaker || host || cameras[0];
  const thumbnails =
    compact || share ? cameras : cameras.filter((track) => track !== focus);
  const pageSize = mobile ? 3 : 5;
  const pages = Math.max(1, Math.ceil(thumbnails.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = thumbnails.slice(
    current * pageSize,
    (current + 1) * pageSize,
  );
  const filmstrip = (
    <div className="live-filmstrip" aria-label="Video người tham gia">
      {pages > 1 && (
        <button
          className="live-filmstrip-arrow"
          type="button"
          disabled={current === 0}
          onClick={() => setPage(current - 1)}
          aria-label="Trang video trước"
        >
          ‹
        </button>
      )}
      <div
        className="live-filmstrip-tiles"
        style={{ '--live-filmstrip-count': Math.max(1, visible.length) }}
      >
        {visible.map((track, index) => (
          <ParticipantTile
            key={`${track.participant?.identity || index}:${track.source}`}
            trackRef={track}
          />
        ))}
        {compact && !visible.length && (
          <p className="live-camera-empty">Camera sẽ xuất hiện tại đây.</p>
        )}
      </div>
      {pages > 1 && (
        <button
          className="live-filmstrip-arrow"
          type="button"
          disabled={current === pages - 1}
          onClick={() => setPage(current + 1)}
          aria-label="Trang video sau"
        >
          ›
        </button>
      )}
      {pages > 1 && (
        <span className="sr-only" aria-live="polite">
          Trang video {current + 1} / {pages}
        </span>
      )}
    </div>
  );

  if (compact)
    return <div className="live-stage live-stage--compact">{filmstrip}</div>;
  return (
    <div
      className={`live-stage live-stage--zoom${thumbnails.length ? '' : ' live-stage--single'}`}
    >
      {thumbnails.length > 0 && filmstrip}
      {focus ? (
        <div
          className={`live-spotlight${share ? ' live-spotlight--share' : ' live-spotlight--camera'}`}
          aria-label={share ? 'Màn hình đang chia sẻ' : 'Video chính'}
        >
          <FocusLayout trackRef={focus} />
        </div>
      ) : (
        <div className="live-stage-empty">
          <span aria-hidden="true">◉</span>
          <h2>Phòng học đã sẵn sàng</h2>
          <p>Video sẽ xuất hiện khi bạn hoặc người tham gia bật camera.</p>
        </div>
      )}
    </div>
  );
}
