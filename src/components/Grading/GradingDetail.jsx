import { CheckCircle2, PenLine, RotateCcw, Save, Send } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { studentSubmissionData } from '../../datas/studentSubmissionData.js'
import { Button } from '../Common/Button.jsx'
import { SubmissionViewer } from './SubmissionViewer.jsx'

const InfoRow = ({ label, value }) => (
  <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
    <p className="text-xs font-black uppercase text-slate-400">{label}</p>
    <p className="mt-1 font-bold text-slate-900">{value}</p>
  </div>
)

export const GradingDetail = ({ mode = 'view', submission, savedDraft, onStartGrading, onSaveDraft, onReturnSubmission }) => {
  const [score, setScore] = useState(savedDraft?.score || '')
  const [comment, setComment] = useState(savedDraft?.comment || '')
  const content = studentSubmissionData[submission.id] || studentSubmissionData['SUB-1001']
  const gradingMode = mode === 'grade' || mode === 'edit'
  const reviewMode = mode === 'review'
  const reviewedSubmission = reviewMode || mode === 'edit'

  useEffect(() => {
    setScore(savedDraft?.score || '')
    setComment(savedDraft?.comment || '')
  }, [savedDraft, submission.id])

  const validateGrade = () => {
    const numericScore = Number(score)

    if (score === '' || Number.isNaN(numericScore)) {
      toast.error('Vui lòng nhập điểm hợp lệ.')
      return false
    }

    if (numericScore < 0 || numericScore > Number(submission.maxScore)) {
      toast.error(`Điểm phải nằm trong khoảng 0 - ${submission.maxScore}.`)
      return false
    }

    if (!comment.trim()) {
      toast.error('Vui lòng nhập nhận xét trước khi lưu.')
      return false
    }

    return true
  }

  const handleSave = () => {
    if (!validateGrade()) return
    onSaveDraft(submission, { score, comment: comment.trim() })
  }

  const handleReturn = () => {
    if (!savedDraft) {
      toast.error('Vui lòng lưu điểm trước khi trả bài.')
      return
    }

    onReturnSubmission(submission)
  }

  return (
    <div className={gradingMode || reviewMode ? 'grid gap-5 xl:grid-cols-[280px_1fr_320px]' : 'grid gap-5 xl:grid-cols-[280px_1fr]'}>
      <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950">Thông tin bài</h2>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">{submission.type}</span>
        </div>
        <div className="mt-4 space-y-3">
          <InfoRow label="Tên bài" value={submission.title} />
          <InfoRow label="Loại bài" value={submission.type} />
          <InfoRow label="Lớp" value={submission.className} />
          <InfoRow label="Học viên" value={submission.student} />
          <InfoRow label="Giáo viên" value={submission.teacher} />
          <InfoRow label="Điểm tối đa" value={submission.maxScore} />
          <InfoRow label="Ngày nộp" value={submission.submittedDate} />
          <InfoRow label="Thời gian nộp" value={submission.submittedTime} />
        </div>
      </aside>

      <main className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-950">Bài học viên đã nộp</h2>
            <p className="text-sm text-slate-500">Viewer tự thay đổi theo Writing, Speaking, PDF, Word, ảnh hoặc upload file.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{submission.fileType.toUpperCase()}</span>
            {!gradingMode && !reviewedSubmission && (
              <Button className="min-h-9 px-3 py-1 text-xs" onClick={onStartGrading}>
                <PenLine size={15} /> Chấm bài
              </Button>
            )}
            {reviewMode && (
              <Button className="min-h-9 px-3 py-1 text-xs" onClick={onStartGrading}>
                <PenLine size={15} /> Sửa điểm
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5">
          <SubmissionViewer submission={submission} content={content} />
        </div>
      </main>

      {reviewMode && (
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">Kết quả đã chấm</h2>
              <p className="mt-1 text-sm text-slate-500">Điểm và nhận xét đã trả cho học viên.</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
              <CheckCircle2 size={14} /> Đã trả
            </span>
          </div>
          <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
            <p className="text-sm font-bold text-white/70">Điểm</p>
            <p className="mt-2 text-4xl font-black">{savedDraft?.score}</p>
          </div>
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-black uppercase text-slate-400">Nhận xét</p>
            <p className="mt-2 leading-6 text-slate-700">{savedDraft?.comment}</p>
          </div>
        </aside>
      )}

      {gradingMode && (
        <aside className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">{mode === 'edit' ? 'Sửa điểm' : 'Khung chấm điểm'}</h2>
              <p className="mt-1 text-sm text-slate-500">{mode === 'edit' ? 'Cập nhật điểm và nhận xét đã trả.' : 'Lưu điểm trước, sau đó trả bài cho học viên.'}</p>
            </div>
            {savedDraft && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                <CheckCircle2 size={14} /> Đã lưu
              </span>
            )}
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-black text-slate-700">Điểm</span>
            <input
              value={score}
              onChange={(event) => setScore(event.target.value)}
              placeholder={`0 - ${submission.maxScore}`}
              className="mt-2 h-12 w-full rounded-xl border border-gray-200 px-3 text-lg font-black text-slate-950 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-black text-slate-700">Nhận xét</span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Nhập nhận xét chi tiết cho học viên..."
              className="mt-2 min-h-40 w-full rounded-xl border border-gray-200 p-3 text-sm leading-6 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </label>
          <div className="mt-4 grid gap-3">
            <Button onClick={handleSave}><Save size={17} /> {mode === 'edit' ? 'Cập nhật điểm' : 'Lưu'}</Button>
            {mode !== 'edit' && <Button variant="secondary" onClick={handleReturn} disabled={!savedDraft} className={!savedDraft ? 'cursor-not-allowed opacity-60' : ''}><Send size={17} /> Trả bài</Button>}
          </div>
          <button
            type="button"
            onClick={() => {
              setScore(savedDraft?.score || '')
              setComment(savedDraft?.comment || '')
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900"
          >
            <RotateCcw size={16} /> Đặt lại chấm điểm
          </button>
        </aside>
      )}
    </div>
  )
}
