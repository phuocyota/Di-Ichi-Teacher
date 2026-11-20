import { Hand, Mic, MicOff, MonitorUp, MousePointer2, PenLine, Video } from 'lucide-react'

// Điều khiển bảng bao hàm viết bảng; backend giữ ràng buộc này.
const permissionItems = [
  ['canUseMic', Mic, 'Mic'],
  ['canUseCamera', Video, 'Camera'],
  ['canShareScreen', MonitorUp, 'Chia sẻ màn hình'],
  ['canWriteBoard', PenLine, 'Viết bảng'],
  ['canControlBoard', MousePointer2, 'Điều khiển bảng'],
]

export const ParticipantPanel = ({ participants, raisedHands, saving, onPermission, onGrantMic, onMuteAll, mutingAll, kicking, onKick, kickBan, onReadmit, readmitting }) => (
  <section className="w-full shrink-0 overflow-y-auto border-l border-white/10 bg-slate-900 p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-black">Học sinh ({participants.length})</h2>
      {onMuteAll && (
        <button
          type="button"
          disabled={mutingAll || !participants.some((item) => item.identity && item.admissionStatus !== 'removed' && item.permissions?.canUseMic !== false)}
          onClick={onMuteAll}
          className="flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-xs font-bold disabled:opacity-40"
        >
          <MicOff className="h-3.5 w-3.5" aria-hidden="true" /> {mutingAll ? 'Đang tắt mic...' : 'Tắt mic cả lớp'}
        </button>
      )}
    </div>
    <div className="mt-4 space-y-3">
      {participants.map((participant) => {
        const removed = participant.admissionStatus === 'removed'
        const permissions = participant.permissions ?? {}
        const raised = raisedHands.has(participant.studentId)
        return (
          <article key={participant.studentId} className="rounded-2xl bg-white/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-bold">{participant.displayName}</p>
                <p className={`text-xs font-semibold ${participant.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {kickBan && removed ? 'Đã mời ra' : participant.connected ? 'Đang trong lớp' : 'Chưa vào lớp'}
                </p>
              </div>
              {raised && <Hand className="h-5 w-5 text-orange-400" aria-label="Đang giơ tay" />}
            </div>
            {raised && participant.identity && !removed && !permissions.canUseMic && onGrantMic && (
              <button
                type="button"
                disabled={saving.has(`${participant.studentId}:canUseMic`)}
                onClick={() => onGrantMic(participant)}
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl bg-orange-500 px-2 py-2 text-xs font-bold text-white disabled:opacity-40"
              >
                <Mic className="h-3.5 w-3.5" aria-hidden="true" /> Cho phát biểu
              </button>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label={`Quyền của ${participant.displayName}`}>
              {permissionItems.map(([key, Icon, label]) => {
                const enabled = Boolean(permissions[key])
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={enabled}
                    title={`${label}: ${enabled ? 'đang cho phép' : 'đang chặn'}`}
                    disabled={!participant.identity || removed || saving.has(`${participant.studentId}:${key}`)}
                    onClick={() => onPermission(participant, key, !enabled)}
                    className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-bold disabled:opacity-40 ${enabled ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 line-through decoration-slate-400'}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {label}
                  </button>
                )
              })}
            </div>
            {kickBan && removed && <button type="button" disabled={Boolean(readmitting)} onClick={() => onReadmit(participant)} className="mt-3 rounded-xl bg-orange-600 px-3 py-2 text-sm font-bold disabled:opacity-50">Cho vào lại</button>}
            {participant.identity && participant.connected && (
              <button type="button" disabled={kicking.has(participant.identity)} onClick={() => onKick(participant)} className="mt-3 w-full rounded-xl bg-red-500/15 px-2 py-2 text-xs font-bold text-red-300 disabled:opacity-40">
                {kicking.has(participant.identity) ? 'Đang mời ra...' : 'Mời ra khỏi lớp'}
              </button>
            )}
          </article>
        )
      })}
    </div>
  </section>
)
