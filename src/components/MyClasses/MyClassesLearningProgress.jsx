import { useEffect, useMemo, useState } from 'react'
import { Activity, Eye, Pencil, Save, Target, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

const emptyForm = {
  scope: 'student',
  studentId: '',
  progress: 70,
  status: 'on-track',
  target: '',
  evidence: '',
}

const statusMeta = {
  excellent: { label: 'Vượt mục tiêu', tone: 'green' },
  'on-track': { label: 'Đúng tiến độ', tone: 'amber' },
  support: { label: 'Cần hỗ trợ', tone: 'rose' },
}

const clampProgress = (value) => Math.min(100, Math.max(0, Number(value) || 0))

export const MyClassesLearningProgress = ({ selectedClass, selectedSession }) => {
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
  const averageProgress = studentRecords.length ? Math.round(studentRecords.reduce((sum, record) => sum + record.progress, 0) / studentRecords.length) : 0
  const needSupport = studentRecords.filter((record) => record.status === 'support').length

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const buildRecord = () => {
    const isClassScope = form.scope === 'class'
    const student = students.find((item) => item.id === form.studentId) || students[0]

    return {
      id: form.id || `progress-${Date.now()}`,
      scope: form.scope,
      studentId: isClassScope ? 'class' : student?.id,
      studentName: isClassScope ? 'Cả lớp' : student?.name,
      sessionId: selectedSession?.id || 'session',
      sessionTitle: selectedSession?.title || 'Buổi học',
      progress: clampProgress(form.progress),
      status: form.status,
      target: form.target.trim(),
      evidence: form.evidence.trim(),
      time: editingId ? 'Vừa cập nhật' : 'Vừa thêm',
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const record = buildRecord()
    setRecords((current) => {
      if (editingId) return current.map((item) => (item.id === editingId ? record : item))
      return [record, ...current]
    })
    setViewingRecord(record)
    setEditingId(null)
    setForm({ ...emptyForm, studentId: students[0]?.id || '' })
    toast.success(editingId ? 'Đã cập nhật tiến độ' : 'Đã lưu tiến độ')
  }

  const handleEdit = (record) => {
    setEditingId(record.id)
    setViewingRecord(record)
    setForm({
      id: record.id,
      scope: record.scope,
      studentId: record.scope === 'class' ? students[0]?.id || '' : record.studentId,
      progress: record.progress,
      status: record.status,
      target: record.target,
      evidence: record.evidence,
    })
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <TrendingUp size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Tiến độ TB học viên</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{averageProgress}%</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <Target size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Cần hỗ trợ</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{needSupport}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700">
              <Activity size={20} />
            </span>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Cả lớp</p>
              <p className="mt-1 font-black text-slate-950">{classRecord ? `${classRecord.progress}%` : 'Chưa có'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
        <Card>
          <div>
            <h3 className="text-lg font-black text-slate-950">{editingId ? 'Sửa tiến độ' : 'Nhập tiến độ'}</h3>
            <p className="text-sm text-slate-500">{selectedSession?.title || 'Buổi học'} - {selectedClass.name}</p>
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
              <span className="text-sm font-bold text-slate-700">Tiến độ buổi học</span>
              <div className="mt-2 flex items-center gap-3">
                <input className="h-2 flex-1 accent-orange-600" max="100" min="0" type="range" value={form.progress} onChange={(event) => handleChange('progress', event.target.value)} />
                <input className="h-11 w-20 rounded-xl border border-orange-100 px-3 text-sm font-bold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" max="100" min="0" type="number" value={form.progress} onChange={(event) => handleChange('progress', event.target.value)} />
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Trạng thái</span>
              <select className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.status} onChange={(event) => handleChange('status', event.target.value)}>
                {Object.entries(statusMeta).map(([status, meta]) => (
                  <option key={status} value={status}>{meta.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Mục tiêu cần đạt</span>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.target} onChange={(event) => handleChange('target', event.target.value)} placeholder="Nhập mục tiêu cho học viên hoặc cả lớp..." />
            </label>

            <label className="block">
              <span className="text-sm font-bold text-slate-700">Minh chứng / ghi chú</span>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-orange-100 p-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.evidence} onChange={(event) => handleChange('evidence', event.target.value)} placeholder="Nhập nội dung đã làm được, điểm cần theo dõi..." />
            </label>

            <Button className="w-full" type="submit">
              <Save size={18} />
              {editingId ? 'Cập nhật tiến độ' : 'Lưu tiến độ'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {viewingRecord && (
            <Card>
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <Badge tone={statusMeta[viewingRecord.status].tone}>{statusMeta[viewingRecord.status].label}</Badge>
                  <h3 className="mt-3 text-xl font-black text-slate-950">{viewingRecord.studentName}</h3>
                  <p className="mt-1 text-sm text-slate-500">{viewingRecord.sessionTitle}</p>
                </div>
                <p className="text-3xl font-black text-orange-700">{viewingRecord.progress}%</p>
              </div>
              <div className="mt-4 h-3 rounded-full bg-orange-100">
                <div className="h-3 rounded-full bg-orange-500" style={{ width: `${viewingRecord.progress}%` }} />
              </div>
              {viewingRecord.target && <p className="mt-4 rounded-xl bg-orange-50 p-3 text-sm font-semibold text-orange-700">Mục tiêu: {viewingRecord.target}</p>}
              {viewingRecord.evidence && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{viewingRecord.evidence}</p>}
            </Card>
          )}

          {sessionRecords.length === 0 ? (
            <Card>
              <p className="text-sm font-bold text-slate-500">Chưa có đánh giá tiến độ cho buổi này.</p>
            </Card>
          ) : (
            sessionRecords.map((record) => (
              <Card key={record.id}>
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-950">{record.studentName}</h3>
                      <Badge tone={statusMeta[record.status].tone}>{statusMeta[record.status].label}</Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-3 flex-1 rounded-full bg-orange-100">
                        <div className="h-3 rounded-full bg-orange-500" style={{ width: `${record.progress}%` }} />
                      </div>
                      <span className="w-12 text-right text-sm font-black text-orange-700">{record.progress}%</span>
                    </div>
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
