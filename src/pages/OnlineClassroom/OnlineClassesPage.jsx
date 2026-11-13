import { useOnlineScheduleWatcher } from '../../hooks/useOnlineScheduleWatcher.js';
import { useResourceUpdates } from '../../services/realtime.js';
import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock3, GraduationCap, RefreshCw, Video } from 'lucide-react'
import { useNavigate } from '../../routes/localizedRouter.jsx'
import { toast } from 'sonner'
import { PageHeader } from '../../components/Common/PageHeader.jsx'
import { Card } from '../../components/Common/Card.jsx'
import { getOnlineSchedules, joinClassroom, getOnlineSession, isFeatureDisabledError } from '../../services/classroomApi.js'

export const OnlineClassesPage = () => {
  const navigate = useNavigate()
  const loadVersion = useRef(0)
  const startPending = useRef(false)
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState('')
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    const version = ++loadVersion.current
    try {
      const schedules = await getOnlineSchedules()
      const next = []
      // Bound the A1 fan-out while a batch endpoint is unavailable.
      for (let offset = 0; offset < schedules.length; offset += 4) {
        const batch = await Promise.all(schedules.slice(offset, offset + 4).map(async item => {
          try { return { ...item, onlineSession: await getOnlineSession(item.scheduleId) } }
          catch (failure) { return { ...item, sessionError: isFeatureDisabledError(failure) ? null : failure.message } }
        }))
        if (version !== loadVersion.current) return
        next.push(...batch)
      }
      if (version === loadVersion.current) { setClasses(next); setError('') }
    } catch (requestError) {
      if (version === loadVersion.current) setError(requestError.message)
    } finally {
      if (version === loadVersion.current) setLoading(false)
    }
  }, [])
  useOnlineScheduleWatcher(classes.map(item => item.scheduleId), load, load)
  useResourceUpdates(load, ['schedule','class','class-staff','workspace','portal'], !starting)
  const invalidateLoad = useCallback(() => { loadVersion.current++ }, [])
  useEffect(() => {
    void load()
    const refresh = () => { if (!document.hidden) void load() }
    // Availability also changes when the clock reaches the lesson window.
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); invalidateLoad() }
  }, [load, invalidateLoad])

  const start = async (item) => {
    if (startPending.current) return
    startPending.current = true
    setStarting(item.scheduleId)
    try {
      if (item.onlineSession) {
        navigate(`/lop-hoc-online/${item.scheduleId}`)
        return
      }
      const data = await joinClassroom(item.scheduleId)
      navigate(`/lop-hoc-online/${item.scheduleId}`, { state: { joinData: data } })
    } catch (requestError) {
      toast.error('Không thể mở lớp', { description: requestError.message })
      void load()
    } finally { startPending.current = false; setStarting('') }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Lớp học Online" description="Mở phòng trực tuyến theo lịch được phân công." />
      {loading && <Card><p className="py-8 text-center font-bold text-slate-500">Đang tải lịch dạy...</p></Card>}
      {error && <Card><div className="text-center"><p className="font-bold text-red-600">{error}</p><button type="button" onClick={load} className="mt-4 inline-flex items-center gap-2 font-bold text-orange-600"><RefreshCw size={17} />Thử lại</button></div></Card>}
      {!loading && !error && !classes.length && <Card><p className="py-8 text-center font-bold text-slate-500">Chưa có lớp online trong thời gian này.</p></Card>}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {classes.map((item) => (
          <Card key={item.scheduleId}>
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Video size={28} /></div>
            <h2 className="mt-4 text-xl font-black text-slate-950">{item.className}</h2>
            <p className="font-bold text-orange-600">{item.courseName}</p>
            <div className="mt-4 space-y-2 text-sm font-semibold text-slate-600">
              <p className="flex gap-2"><Clock3 size={18} />{formatTime(item.startAt, item.endAt)}</p>
              <p className="flex gap-2"><GraduationCap size={18} />{item.physicalRoom || 'Phòng trực tuyến'}</p>
            </div>
            <button type="button" disabled={Boolean(item.sessionError) || (item.onlineSession ? !(item.onlineSession.me?.canStart || item.onlineSession.me?.canJoin) : !item.canStart) || Boolean(starting)} onClick={() => start(item)} className="mt-5 w-full rounded-2xl bg-orange-600 px-4 py-3 font-black text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500">
              {item.sessionError || (item.onlineSession?.features?.lifecycle && item.onlineSession.session?.status === 'ended' ? 'Đã kết thúc' : item.onlineSession && !item.onlineSession.me?.canStart && !item.onlineSession.me?.canJoin ? item.onlineSession.me?.joinReason : null) || (starting === item.scheduleId ? 'Đang mở lớp...' : (item.onlineSession?.session?.status === 'active' || item.meetingStarted) ? 'Vào lại lớp' : (item.onlineSession?.me?.canStart ?? item.canStart) ? 'Bắt đầu lớp' : item.startReason || 'Chưa thể bắt đầu')}
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

const formatTime = (startAt, endAt) => {
  const formatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  const end = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${formatter.format(new Date(startAt))} - ${end.format(new Date(endAt))}`
}
