import { Hand, Mic, MonitorUp, MousePointer2, Video } from 'lucide-react'

const permissionItems = [
  ['canUseMic', Mic, 'Mic'],
  ['canUseCamera', Video, 'Camera'],
  ['canShareScreen', MonitorUp, 'Chia sẻ'],
  ['canWriteBoard', Hand, 'Viết bảng'],
  ['canControlBoard', MousePointer2, 'Điều khiển'],
]

export const ParticipantPanel = ({ participants, raisedHands, saving, onPermission }) => (
  <aside className="w-full shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900 p-4 xl:w-80">
    <h2 className="text-lg font-black">Học sinh ({participants.length})</h2>
    <div className="mt-4 space-y-3">
      {participants.map((participant) => (
        <article key={participant.studentId} className="rounded-2xl bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-bold">{participant.displayName}</p>
              <p className={`text-xs font-semibold ${participant.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
                {participant.connected ? 'Đang trong lớp' : 'Chưa vào lớp'}
              </p>
            </div>
            {raisedHands.has(participant.studentId) && <Hand className="h-5 w-5 text-orange-400" />}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {permissionItems.map(([key, Icon, label]) => (
              <button
                key={key}
                type="button"
                disabled={!participant.identity || saving === `${participant.studentId}:${key}`}
                onClick={() => onPermission(participant, key, !participant.permissions[key])}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold disabled:opacity-40 ${participant.permissions[key] ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'}`}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  </aside>
)
