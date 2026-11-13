import { useState } from 'react';
import { ClassroomChat } from './ClassroomChat.jsx';

export function ClassroomPanels({ participants }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(participants ? 'participants' : 'chat');
  return <>
    <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="m-3 rounded-xl bg-slate-800 p-3 font-bold xl:hidden">{participants ? 'Trò chuyện / Học sinh' : 'Trò chuyện lớp học'}</button>
    <aside aria-label="Bảng lớp học" className={`${open ? 'fixed inset-0 z-40 flex' : 'hidden'} flex-col overflow-y-auto bg-slate-900 text-white xl:static xl:flex xl:w-80 xl:shrink-0 xl:border-l xl:border-white/10`}>
      <div className="flex flex-wrap gap-2 border-b border-white/10 p-3">
        {participants && <button type="button" aria-pressed={tab === 'participants'} onClick={() => setTab('participants')} className="rounded-lg bg-slate-800 p-2">Học sinh</button>}
        <button type="button" aria-pressed={tab === 'chat'} onClick={() => setTab('chat')} className="rounded-lg bg-slate-800 p-2">Trò chuyện</button>
        <button type="button" onClick={() => setOpen(false)} className="ml-auto rounded-lg bg-slate-700 p-2 xl:hidden">Đóng</button>
      </div>
      {participants && <div hidden={tab !== 'participants'}>{participants}</div>}
      <div hidden={tab !== 'chat'}><ClassroomChat /></div>
    </aside>
  </>;
}
