import { useEffect, useState } from 'react';
import { CarouselLayout, FocusLayout, GridLayout, ParticipantTile, useSpeakingParticipants } from '@livekit/components-react';
import { Track } from 'livekit-client';

export function ClassroomStage({ tracks, hostIdentity }) {
  const speakers = useSpeakingParticipants();
  const [mobile, setMobile] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ?? false);
  const [page, setPage] = useState(0);
  useEffect(() => {
    const query = window.matchMedia?.('(max-width: 767px)');
    if (!query) return;
    const change = () => setMobile(query.matches);
    query.addEventListener('change', change);
    return () => query.removeEventListener('change', change);
  }, []);

  const share = tracks.find(track => track.source === Track.Source.ScreenShare && track.publication?.track);
  const priorityIdentity = share ? hostIdentity : speakers[0]?.identity;
  const others = tracks.filter(track => track !== share).sort((a, b) => {
    if (!priorityIdentity) return 0;
    return Number(b.participant?.identity === priorityIdentity) - Number(a.participant?.identity === priorityIdentity);
  });
  const host = share && mobile && others.find(track => hostIdentity && track.participant?.identity === hostIdentity);
  const paginated = host ? others.filter(track => track !== host) : others;
  // Count the focused share and floating teacher within the four mobile tiles.
  const pageSize = share ? (host ? 2 : 3) : 4;
  const pages = Math.max(1, Math.ceil(paginated.length / pageSize));
  const current = Math.min(page, pages - 1);
  const visible = mobile ? paginated.slice(current * pageSize, (current + 1) * pageSize) : others;
  const mobileFocus = !share && mobile ? visible[0] : null;

  return <div className="flex min-h-96 flex-1 flex-col gap-2 p-4">
    {share ? <div className="relative flex min-h-96 flex-1 flex-col gap-3 xl:flex-row">
      <FocusLayout trackRef={share} className="min-h-64 min-w-0 flex-1 xl:w-3/4" />
      {host && <div className="absolute right-2 top-2 h-24 w-32 overflow-hidden rounded-xl"><ParticipantTile trackRef={host} /></div>}
      <CarouselLayout tracks={visible} className="h-36 shrink-0 xl:h-auto xl:w-1/4"><ParticipantTile /></CarouselLayout>
    </div> : mobileFocus ? <>
      <FocusLayout trackRef={mobileFocus} className="min-h-64 flex-1" />
      <CarouselLayout tracks={visible.slice(1)} className="h-36"><ParticipantTile /></CarouselLayout>
    </> : <GridLayout tracks={visible} className="lk-grid-layout min-h-96 flex-1"><ParticipantTile /></GridLayout>}
    {mobile && pages > 1 && <nav aria-label="Video" className="flex items-center justify-center gap-4">
      <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Trước</button>
      <span>{current + 1} / {pages}</span>
      <button type="button" disabled={current === pages - 1} onClick={() => setPage(current + 1)}>Tiếp</button>
    </nav>}
  </div>;
}
