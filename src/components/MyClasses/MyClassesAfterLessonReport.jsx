import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Eye, FileText, Pencil, Save, UserRoundCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const emptyReport = {
  taughtContent: '',
  homework: '',
  classComment: '',
  studentsToWatch: [],
  watchNote: '',
  completed: false,
}

export const MyClassesAfterLessonReport = ({ reports, selectedClass, selectedSession, setReports }) => {
  const students = useMemo(() => selectedSession?.students || selectedClass.students, [selectedClass.students, selectedSession])
  const sessionId = selectedSession?.id || 'session'
  const [form, setForm] = useState(emptyReport)
  const [viewMode, setViewMode] = useState(false)

  const savedReport = reports[sessionId]
  const watchedStudents = students.filter((student) => form.studentsToWatch.includes(student.id))

  useEffect(() => {
    setForm(reports[sessionId] || emptyReport)
    setViewMode(Boolean(reports[sessionId]))
  }, [reports, sessionId])

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleStudentToggle = (studentId) => {
    setForm((current) => {
      const exists = current.studentsToWatch.includes(studentId)
      return {
        ...current,
        studentsToWatch: exists
          ? current.studentsToWatch.filter((id) => id !== studentId)
          : [...current.studentsToWatch, studentId],
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.taughtContent.trim()) {
      toast.error('Vui lòng nhập nội dung đã dạy')
      return
    }

    setReports((current) => ({
      ...current,
      [sessionId]: {
        ...form,
        savedAt: 'Vừa cập nhật',
        sessionId,
        sessionTitle: selectedSession?.title || 'Buổi học',
      },
    }))
    setViewMode(true)
    toast.success(form.completed ? 'Đã hoàn thành buổi học' : 'Đã lưu báo cáo sau buổi học')
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <FileText size={23} />
            </span>
            <div>
              <h3 className="text-lg font-black text-slate-950">Báo cáo sau buổi học</h3>
              <p className="text-sm text-slate-500">{selectedSession?.title || 'Buổi học'} - {selectedClass.name}</p>
            </div>
          </div>
          <Badge tone={form.completed ? 'green' : 'amber'}>{form.completed ? 'Hoàn thành' : 'Đang soạn'}</Badge>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nội dung đã dạy</span>
            <textarea className="mt-2 min-h-28 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.taughtContent} onChange={(event) => handleChange('taughtContent', event.target.value)} placeholder="Nhập các nội dung, kỹ năng, hoạt động đã triển khai trong buổi học..." />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Bài tập</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.homework} onChange={(event) => handleChange('homework', event.target.value)} placeholder="Nhập bài tập đã giao, hạn nộp hoặc tài liệu cần làm..." />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nhận xét lớp</span>
            <textarea className="mt-2 min-h-24 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.classComment} onChange={(event) => handleChange('classComment', event.target.value)} placeholder="Nhập nhận xét chung về mức độ tham gia, thái độ và kết quả của cả lớp..." />
          </label>

          <div>
            <span className="text-sm font-bold text-slate-700">Học viên cần lưu ý</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {students.map((student) => (
                <label key={student.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-orange-100 px-3 text-sm font-bold text-slate-700 hover:bg-orange-50">
                  <input className="h-4 w-4 accent-orange-600" type="checkbox" checked={form.studentsToWatch.includes(student.id)} onChange={() => handleStudentToggle(student.id)} />
                  <span className="min-w-0 truncate">{student.name}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Ghi chú học viên cần lưu ý</span>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.watchNote} onChange={(event) => handleChange('watchNote', event.target.value)} placeholder="Nhập lý do cần lưu ý hoặc hướng hỗ trợ ở buổi sau..." />
          </label>

          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-4">
            <span className="inline-flex items-center gap-2 text-sm font-black text-orange-700">
              <CheckCircle2 size={18} />
              Hoàn thành buổi học
            </span>
            <input className="h-5 w-5 accent-orange-600" type="checkbox" checked={form.completed} onChange={(event) => handleChange('completed', event.target.checked)} />
          </label>

          <Button className="w-full" type="submit">
            <Save size={18} />
            Lưu báo cáo
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <p className="text-xs font-black uppercase text-slate-400">Trạng thái</p>
            <p className="mt-2 font-black text-slate-950">{savedReport?.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}</p>
          </Card>
          <Card>
            <p className="text-xs font-black uppercase text-slate-400">Học viên lưu ý</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{watchedStudents.length}</p>
          </Card>
          <Card>
            <p className="text-xs font-black uppercase text-slate-400">Buổi học</p>
            <p className="mt-2 font-black text-slate-950">{selectedSession?.title || 'Buổi học'}</p>
          </Card>
        </div>

        <Card>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <Badge tone={savedReport?.completed ? 'green' : 'amber'}>{savedReport?.completed ? 'Hoàn thành' : 'Bản nháp'}</Badge>
              <h3 className="mt-3 text-xl font-black text-slate-950">{selectedSession?.title || 'Buổi học'}</h3>
              <p className="mt-1 text-sm text-slate-500">{savedReport?.savedAt || 'Chưa lưu báo cáo'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="min-h-9 px-3" variant="secondary" onClick={() => setViewMode(true)} disabled={!savedReport}>
                <Eye size={16} />
                Xem
              </Button>
              <Button className="min-h-9 px-3" variant="secondary" onClick={() => setViewMode(false)} disabled={!savedReport}>
                <Pencil size={16} />
                Sửa
              </Button>
            </div>
          </div>

          {viewMode && savedReport ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-sm font-black text-orange-700">Nội dung đã dạy</p>
                <p className="mt-2 text-sm text-slate-700">{savedReport.taughtContent}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-sm font-black text-orange-700">Bài tập</p>
                <p className="mt-2 text-sm text-slate-700">{savedReport.homework || 'Chưa nhập'}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="text-sm font-black text-orange-700">Nhận xét lớp</p>
                <p className="mt-2 text-sm text-slate-700">{savedReport.classComment || 'Chưa nhập'}</p>
              </div>
              <div className="rounded-xl bg-orange-50 p-4">
                <p className="inline-flex items-center gap-2 text-sm font-black text-orange-700">
                  <UserRoundCheck size={16} />
                  Học viên cần lưu ý
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {watchedStudents.length > 0 ? watchedStudents.map((student) => <Badge key={student.id}>{student.name}</Badge>) : <span className="text-sm font-semibold text-slate-500">Không có</span>}
                </div>
                {savedReport.watchNote && <p className="mt-3 text-sm text-slate-700">{savedReport.watchNote}</p>}
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              {savedReport ? 'Đang mở form sửa báo cáo ở bên trái.' : 'Chưa có báo cáo cho buổi này.'}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
