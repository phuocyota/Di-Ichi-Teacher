import { useEffect, useMemo, useState } from 'react'
import { Eye, MessageCirclePlus, Pencil, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const emptyForm = {
  scope: 'student',
  studentId: '',
  tone: 'green',
  content: '',
  nextGoal: '',
}

const toneLabels = {
  green: 'Tích cực',
  amber: 'Theo dõi',
  rose: 'Cần hỗ trợ',
}

export const MyClassesComments = ({ selectedClass, selectedSession }) => {
  const students = useMemo(() => selectedSession?.students || selectedClass.students, [selectedClass.students, selectedSession])
  const [comments, setComments] = useState([])
  const [form, setForm] = useState({ ...emptyForm, studentId: students[0]?.id || '' })
  const [viewingComment, setViewingComment] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    setForm({ ...emptyForm, studentId: students[0]?.id || '' })
    setViewingComment(null)
    setEditingId(null)
  }, [selectedSession?.id, students])

  const sessionComments = comments.filter((comment) => comment.sessionId === (selectedSession?.id || 'session'))
  const studentComments = sessionComments.filter((comment) => comment.scope === 'student')
  const classComments = sessionComments.filter((comment) => comment.scope === 'class')

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const buildComment = () => {
    const isClassScope = form.scope === 'class'
    const student = students.find((item) => item.id === form.studentId) || students[0]

    return {
      id: form.id || `comment-${Date.now()}`,
      scope: form.scope,
      studentId: isClassScope ? 'class' : student?.id,
      studentName: isClassScope ? 'Cả lớp' : student?.name,
      sessionId: selectedSession?.id || 'session',
      sessionTitle: selectedSession?.title || 'Buổi học',
      tone: form.tone,
      content: form.content.trim(),
      nextGoal: form.nextGoal.trim(),
      time: editingId ? 'Vừa cập nhật' : 'Vừa thêm',
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!form.content.trim()) {
      toast.error('Vui lòng nhập nội dung nhận xét')
      return
    }

    const comment = buildComment()
    setComments((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? comment : item))
      return [comment, ...current]
    })
    setViewingComment(comment)
    setEditingId(null)
    setForm({ ...emptyForm, studentId: students[0]?.id || '' })
    toast.success(editingId ? 'Đã cập nhật nhận xét' : 'Đã lưu nhận xét')
  }

  const handleEdit = (comment) => {
    setEditingId(comment.id)
    setViewingComment(comment)
    setForm({
      id: comment.id,
      scope: comment.scope,
      studentId: comment.scope === 'class' ? students[0]?.id || '' : comment.studentId,
      tone: comment.tone,
      content: comment.content,
      nextGoal: comment.nextGoal,
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
            <MessageCirclePlus size={22} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">{editingId ? 'Sửa nhận xét' : 'Thêm nhận xét'}</h3>
            <p className="text-sm text-slate-500">{selectedSession?.title || 'Buổi học'} - theo học viên hoặc cả lớp.</p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-orange-50 p-2">
            {[
              ['student', 'Học viên'],
              ['class', 'Cả lớp'],
            ].map(([scope, label]) => (
              <button className={`min-h-10 rounded-xl text-sm font-black transition ${form.scope === scope ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`} key={scope} onClick={() => handleChange('scope', scope)} type="button">
                {label}
              </button>
            ))}
          </div>

          {form.scope === 'student' && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Học viên</span>
              <select className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.studentId} onChange={(event) => handleChange('studentId', event.target.value)}>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Mức đánh giá</span>
            <select className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.tone} onChange={(event) => handleChange('tone', event.target.value)}>
              {Object.entries(toneLabels).map(([tone, label]) => (
                <option key={tone} value={tone}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Nội dung nhận xét</span>
            <textarea className="mt-2 min-h-28 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.content} onChange={(event) => handleChange('content', event.target.value)} placeholder="Nhập nhận xét về thái độ, kỹ năng, bài tập hoặc tương tác trong buổi..." />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-slate-700">Mục tiêu buổi sau</span>
            <textarea className="mt-2 min-h-20 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.nextGoal} onChange={(event) => handleChange('nextGoal', event.target.value)} placeholder="Nhập mục tiêu hoặc việc cần theo dõi..." />
          </label>

          <Button className="w-full" type="submit">
            <Save size={18} />
            {editingId ? 'Cập nhật nhận xét' : 'Lưu nhận xét'}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <p className="text-xs font-black uppercase text-slate-400">Nhận xét học viên</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{studentComments.length}</p>
          </Card>
          <Card>
            <p className="text-xs font-black uppercase text-slate-400">Nhận xét cả lớp</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{classComments.length}</p>
          </Card>
        </div>

        {viewingComment && (
          <Card>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <Badge tone={viewingComment.tone}>{toneLabels[viewingComment.tone]}</Badge>
                <h3 className="mt-3 text-xl font-black text-slate-950">{viewingComment.studentName}</h3>
                <p className="mt-1 text-sm text-slate-500">{viewingComment.sessionTitle}</p>
              </div>
              <span className="text-xs font-bold text-slate-400">{viewingComment.time}</span>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{viewingComment.content}</p>
            {viewingComment.nextGoal && <p className="mt-3 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-700">Mục tiêu: {viewingComment.nextGoal}</p>}
          </Card>
        )}

        {sessionComments.length === 0 ? (
          <Card>
            <p className="text-sm font-bold text-slate-500">Chưa có nhận xét cho buổi này.</p>
          </Card>
        ) : (
          sessionComments.map((comment) => (
            <Card key={comment.id}>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{comment.studentName}</h3>
                    <Badge tone={comment.tone}>{toneLabels[comment.tone]}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{comment.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button className="min-h-9 px-3" variant="secondary" onClick={() => setViewingComment(comment)}>
                    <Eye size={16} />
                    Xem
                  </Button>
                  <Button className="min-h-9 px-3" variant="secondary" onClick={() => handleEdit(comment)}>
                    <Pencil size={16} />
                    Sửa
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
