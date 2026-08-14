import { BookOpenCheck, CalendarCheck2, CalendarDays, DoorOpen, GraduationCap, Hash, Layers3, Percent, UserRound, UsersRound } from 'lucide-react'
import { myClassInfoById } from '../../datas/myClassInfo.js'
import { Badge } from '../Common/Badge.jsx'
import { Card } from '../Common/Card.jsx'

const fallbackClassInfo = {
  classCode: 'CLASS-001',
  course: 'General English',
  assistant: null,
  maxSize: 24,
  startDate: '01/08/2026',
  endDate: '30/10/2026',
  completedSessions: 0,
  totalSessions: 24,
  attendanceRate: '0%',
  description: 'Lớp học đang được cập nhật thông tin chi tiết.',
}

const getStatusTone = (status) => {
  if (status === 'Đang học') return 'green'
  if (status === 'Sắp khai giảng') return 'amber'
  return 'slate'
}

const DetailRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-orange-50/60 px-3 py-3">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-orange-700 ring-1 ring-orange-100">
      <Icon size={17} />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950">{value || 'Chưa cập nhật'}</p>
    </div>
  </div>
)

const StatCard = ({ icon: Icon, label, value, helper }) => (
  <Card className="p-4">
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-xs font-black uppercase text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        {helper && <p className="mt-1 text-xs font-semibold text-slate-500">{helper}</p>}
      </div>
    </div>
  </Card>
)

const DetailSection = ({ title, children }) => (
  <Card>
    <h3 className="text-base font-black text-slate-950">{title}</h3>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{children}</div>
  </Card>
)

export const MyClassesInfo = ({ selectedClass }) => {
  const classInfo = {
    ...fallbackClassInfo,
    ...(myClassInfoById[selectedClass.id] || {}),
    classCode: selectedClass.id,
    course: myClassInfoById[selectedClass.id]?.course || selectedClass.name,
  }
  const remainingSessions = Math.max(classInfo.totalSessions - classInfo.completedSessions, 0)
  const capacityRate = Math.round((selectedClass.size / classInfo.maxSize) * 100)

  return (
    <div className="space-y-5">
      <Card className="p-0">
        <div className="grid overflow-hidden rounded-2xl lg:grid-cols-[1fr_320px]">
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={getStatusTone(selectedClass.status)}>{selectedClass.status}</Badge>
              <Badge tone="slate">{classInfo.classCode}</Badge>
            </div>
            <h3 className="mt-4 text-2xl font-black text-slate-950 md:text-3xl">{selectedClass.name}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{classInfo.description}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge>{classInfo.course}</Badge>
              <Badge tone="amber">{selectedClass.level}</Badge>
              <Badge tone="green">{classInfo.attendanceRate} chuyên cần</Badge>
            </div>
          </div>

          <div className="border-t border-orange-100 bg-orange-50 p-5 md:p-6 lg:border-l lg:border-t-0">
            <p className="text-xs font-black uppercase text-orange-700">Sĩ số lớp</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-black text-slate-950">{selectedClass.size}/{classInfo.maxSize}</p>
                <p className="text-sm font-semibold text-slate-500">học viên hiện tại/tối đa</p>
              </div>
              <Badge tone={capacityRate >= 90 ? 'rose' : capacityRate >= 75 ? 'amber' : 'green'}>{capacityRate}%</Badge>
            </div>
            <div className="mt-4 h-3 rounded-full bg-white">
              <div className="h-3 rounded-full bg-orange-500" style={{ width: `${Math.min(capacityRate, 100)}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <DetailSection title="Thông tin lớp">
          <DetailRow icon={Hash} label="Mã lớp" value={classInfo.classCode} />
          <DetailRow icon={BookOpenCheck} label="Khóa học" value={classInfo.course} />
          <DetailRow icon={Layers3} label="Cấp độ" value={selectedClass.level} />
          <DetailRow icon={GraduationCap} label="Trạng thái lớp" value={selectedClass.status} />
        </DetailSection>

        <DetailSection title="Nhân sự & lịch học">
          <DetailRow icon={UserRound} label="Giáo viên phụ trách" value={selectedClass.teacher} />
          <DetailRow icon={UserRound} label="Trợ giảng" value={classInfo.assistant || 'Không có'} />
          <DetailRow icon={DoorOpen} label="Phòng học" value={selectedClass.room} />
          <DetailRow icon={CalendarDays} label="Lịch học" value={selectedClass.time} />
          <DetailRow icon={CalendarCheck2} label="Ngày khai giảng" value={classInfo.startDate} />
          <DetailRow icon={CalendarCheck2} label="Ngày kết thúc" value={classInfo.endDate} />
        </DetailSection>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={UsersRound} label="Tổng học viên" value={selectedClass.size} helper={`Tối đa ${classInfo.maxSize} học viên`} />
        <StatCard icon={CalendarCheck2} label="Số buổi đã học" value={classInfo.completedSessions} helper={`${classInfo.totalSessions} buổi toàn khóa`} />
        <StatCard icon={CalendarDays} label="Số buổi còn lại" value={remainingSessions} helper="Theo lịch học hiện tại" />
        <StatCard icon={Percent} label="Tỷ lệ chuyên cần" value={classInfo.attendanceRate} helper="Tính theo toàn lớp" />
      </div>
    </div>
  )
}
