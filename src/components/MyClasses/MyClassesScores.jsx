import { useEffect, useMemo, useState } from 'react'
import { Award, BookOpenCheck, Eye, Pencil, Save, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const emptyForm = {
  scope: 'student',
  studentId: '',
  quizScore: 8,
  homeworkScore: 8,
  participationScore: 8,
  note: '',
}

const getScoreStatus = (score) => {
  if (score >= 8) return 'Tốt'
  if (score >= 6.5) return 'Ổn định'
  return 'Cần hỗ trợ'
}

const getScoreTone = (status) => {
  if (status === 'Tốt') return 'green'
  if (status === 'Ổn định') return 'amber'
  return 'rose'
}

const normalizeScore = (value) => Math.min(10, Math.max(0, Number(value) || 0))

const buildRecord = (form, students, selectedSession) => {
  const isClassScope = form.scope === 'class'
  const student = students.find((item) => item.id === form.studentId) || students[0]
  const quizScore = normalizeScore(form.quizScore)
  const homeworkScore = normalizeScore(form.homeworkScore)
  const participationScore = normalizeScore(form.participationScore)
  const finalScore = Number(((quizScore + homeworkScore + participationScore) / 3).toFixed(1))

  return {
    id: form.id || `score-${Date.now()}`,
    scope: form.scope,
    studentId: isClassScope ? 'class' : student?.id,
    studentName: isClassScope ? 'Cả lớp' : student?.name,
    sessionId: selectedSession?.id || 'session',
    sessionTitle: selectedSession?.title || 'Buổi học',
    quizScore,
    homeworkScore,
    participationScore,
    finalScore,
    note: form.note.trim(),
    status: getScoreStatus(finalScore),
  }
}

export const MyClassesScores = ({ selectedClass, selectedSession }) => {
  const students = useMemo(() => selectedSession?.students || selectedClass.students, [selectedClass.students, selectedSession])
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ ...emptyForm, studentId: students[0]?.id || '' })
  const [viewingRecord, setViewingRecord] = useState(null)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    setForm({ ...emptyForm, studentId: students[0]?.id || '' })
    setViewingRecord(null)
    setEditingId(null)
  }, [selectedSession?.id, students])

  const sessionRecords = records.filter((record) => record.sessionId === (selectedSession?.id || 'session'))
  const studentRecords = sessionRecords.filter((record) => record.scope === 'student')
  const classRecord = sessionRecords.find((record) => record.scope === 'class')
  const averageScore = studentRecords.length ? (studentRecords.reduce((sum, record) => sum + record.finalScore, 0) / studentRecords.length).toFixed(1) : '0.0'

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const record = buildRecord(form, students, selectedSession)

    setRecords((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? record : item))
      return [record, ...current]
    })
    setViewingRecord(record)
    setEditingId(null)
    setForm({ ...emptyForm, studentId: students[0]?.id || '' })
    toast.success(editingId ? 'Đã cập nhật điểm số' : 'Đã lưu điểm số')
  }

  const handleEdit = (record) => {
    setEditingId(record.id)
    setViewingRecord(record)
    setForm({
      id: record.id,
      scope: record.scope,
      studentId: record.scope === 'class' ? students[0]?.id || '' : record.studentId,
      quizScore: record.quizScore,
      homeworkScore: record.homeworkScore,
      participationScore: record.participationScore,
      note: record.note,
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <Award size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Điểm TB học viên</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{averageScore}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <UsersRound size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Đã đánh giá</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{studentRecords.length}/{students.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <BookOpenCheck size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Đánh giá cả lớp</p>
              <p className="mt-1 font-black text-slate-950">{classRecord ? classRecord.finalScore : 'Chưa có'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">{editingId ? 'Sửa điểm số' : 'Nhập điểm số'}</h3>
              <p className="text-sm text-slate-500">{selectedSession?.title || 'Buổi học'} - {selectedClass.name}</p>
            </div>
            <Badge tone={form.scope === 'class' ? 'orange' : 'slate'}>{form.scope === 'class' ? 'Cả lớp' : 'Học viên'}</Badge>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-orange-50 p-2">
              {[
                ['student', 'Học viên'],
                ['class', 'Cả lớp'],
              ].map(([scope, label]) => (
                <button
                  className={`min-h-10 rounded-xl text-sm font-black transition ${form.scope === scope ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
                  key={scope}
                  onClick={() => handleChange('scope', scope)}
                  type="button"
                >
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

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['quizScore', 'Quiz'],
                ['homeworkScore', 'Homework'],
                ['participationScore', 'Tương tác'],
              ].map(([field, label]) => (
                <label className="block" key={field}>
                  <span className="text-sm font-bold text-slate-700">{label}</span>
                  <input className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" max="10" min="0" step="0.1" type="number" value={form[field]} onChange={(event) => handleChange(field, event.target.value)} />
                </label>
              ))}
            </div>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Ghi chú đánh giá</span>
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.note} onChange={(event) => handleChange('note', event.target.value)} placeholder="Nhập nhận định về kết quả buổi học..." />
            </label>

            <Button className="w-full" type="submit">
              <Save size={18} />
              {editingId ? 'Cập nhật điểm số' : 'Lưu điểm số'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {viewingRecord && (
            <Card>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone={getScoreTone(viewingRecord.status)}>{viewingRecord.status}</Badge>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{viewingRecord.studentName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{viewingRecord.sessionTitle}</p>
                </div>
                <p className="text-3xl font-black text-orange-700">{viewingRecord.finalScore}</p>
              </div>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <p className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-slate-700">Quiz: {viewingRecord.quizScore}</p>
                <p className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-slate-700">Homework: {viewingRecord.homeworkScore}</p>
                <p className="rounded-xl bg-orange-50 px-3 py-2 font-bold text-slate-700">Tương tác: {viewingRecord.participationScore}</p>
              </div>
              {viewingRecord.note && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{viewingRecord.note}</p>}
            </Card>
          )}

          {sessionRecords.length === 0 ? (
            <Card>
              <p className="text-sm font-bold text-slate-500">Chưa có điểm số cho buổi này.</p>
            </Card>
          ) : (
            sessionRecords.map((record) => (
              <Card key={record.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{record.studentName}</h3>
                      <Badge tone={getScoreTone(record.status)}>{record.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Điểm buổi: <span className="font-black text-orange-700">{record.finalScore}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="min-h-9 px-3" variant="secondary" onClick={() => setViewingRecord(record)}>
                      <Eye size={16} />
                      Xem
                    </Button>
                    <Button className="min-h-9 px-3" variant="secondary" onClick={() => handleEdit(record)}>
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
    </div>
  )
}
