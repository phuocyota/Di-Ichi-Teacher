import { CheckCircle2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '../../components/Common/PageHeader.jsx'
import { GradingDashboard } from '../../components/Grading/GradingDashboard.jsx'
import { GradingDetail } from '../../components/Grading/GradingDetail.jsx'
import { GradingHistory } from '../../components/Grading/GradingHistory.jsx'
import { GradingStatistics } from '../../components/Grading/GradingStatistics.jsx'
import { GradingTable } from '../../components/Grading/GradingTable.jsx'
import { GradingTabs } from '../../components/Grading/GradingTabs.jsx'
import { gradingHistoryData } from '../../datas/gradingHistoryData.js'
import { gradingListData } from '../../datas/gradingListData.js'

const gradingFlow = [
  'Học viên nộp bài',
  'Bài vào hàng đợi',
  'Giáo viên mở bài',
  'Xem nội dung',
  'Nhập điểm',
  'Nhập nhận xét',
  'Lưu',
  'Trả bài',
  'Thông báo LMS',
  'Cập nhật kết quả',
]

const fallbackReviewedSubmission = {
  id: 'SUB-1001',
  className: 'IELTS Foundation A',
  type: 'Writing',
  submittedDate: '07/08/2026',
  submittedTime: '08:20',
  maxScore: 10,
  teacher: 'Cô Linh Trần',
  fileType: 'text',
}

const formatToday = () => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

const buildReviewedSubmission = (historyItem) => ({
  ...fallbackReviewedSubmission,
  ...(historyItem.submission || {}),
  id: historyItem.submissionId || historyItem.submission?.id || fallbackReviewedSubmission.id,
  title: historyItem.title,
  student: historyItem.student,
  teacher: historyItem.grader || historyItem.submission?.teacher || fallbackReviewedSubmission.teacher,
  status: 'Đã chấm',
})

export const GradingPage = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [detailMode, setDetailMode] = useState('view')
  const [selectedSubmission, setSelectedSubmission] = useState(gradingListData[0])
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null)
  const [queueItems, setQueueItems] = useState(gradingListData)
  const [historyItems, setHistoryItems] = useState(gradingHistoryData)
  const [draftGrades, setDraftGrades] = useState({})

  const currentSubmission = useMemo(
    () => queueItems.find((item) => item.id === selectedSubmission.id) || selectedSubmission,
    [queueItems, selectedSubmission],
  )

  const openDetail = (submission, mode) => {
    setSelectedHistoryItem(null)
    setSelectedSubmission(submission)
    setDetailMode(mode)
    setActiveTab('detail')
  }

  const openHistoryDetail = (historyItem, mode) => {
    setSelectedHistoryItem(historyItem)
    setSelectedSubmission(buildReviewedSubmission(historyItem))
    setDetailMode(mode)
    setActiveTab('detail')
  }

  const handleSaveDraft = (submission, grade) => {
    setDraftGrades((current) => ({
      ...current,
      [submission.id]: {
        ...grade,
        savedAt: new Date().toISOString(),
      },
    }))
    setQueueItems((items) => items.map((item) => (item.id === submission.id ? { ...item, status: 'Đã lưu điểm' } : item)))
    setSelectedSubmission((current) => (current.id === submission.id ? { ...current, status: 'Đã lưu điểm' } : current))
    toast.success('Đã lưu điểm nháp', {
      description: `${submission.student} - ${submission.title}`,
    })
  }

  const handleReturnSubmission = (submission) => {
    const draft = draftGrades[submission.id]
    if (!draft) {
      toast.error('Chưa thể trả bài', {
        description: 'Vui lòng lưu điểm và nhận xét trước khi trả bài.',
      })
      return
    }

    const historyItem = {
      id: `HIS-${submission.id}`,
      submissionId: submission.id,
      submission: { ...submission, status: 'Đã chấm' },
      title: submission.title,
      student: submission.student,
      score: Number(draft.score),
      gradedDate: formatToday(),
      grader: submission.teacher,
      comment: draft.comment,
    }

    setQueueItems((items) => items.filter((item) => item.id !== submission.id))
    setHistoryItems((items) => [historyItem, ...items])
    setSelectedHistoryItem(historyItem)
    setSelectedSubmission(buildReviewedSubmission(historyItem))
    setDetailMode('review')
    setActiveTab('history')
    toast.success('Đã trả bài cho học viên', {
      description: 'Bài đã chuyển sang danh sách Đã chấm và có thể xem lại hoặc sửa điểm.',
    })
  }

  const handleUpdateHistoryGrade = (submission, grade) => {
    if (!selectedHistoryItem) return

    const updatedItem = {
      ...selectedHistoryItem,
      score: Number(grade.score),
      comment: grade.comment,
      gradedDate: formatToday(),
      submission: { ...(selectedHistoryItem.submission || submission), status: 'Đã chấm' },
    }

    setHistoryItems((items) => items.map((item) => (item.id === selectedHistoryItem.id ? updatedItem : item)))
    setSelectedHistoryItem(updatedItem)
    setDetailMode('review')
    toast.success('Đã cập nhật điểm', {
      description: `${updatedItem.student} - ${updatedItem.title}`,
    })
  }

  const reviewedGrade = selectedHistoryItem
    ? { score: selectedHistoryItem.score, comment: selectedHistoryItem.comment }
    : null

  return (
    <div className="space-y-5">
      <PageHeader
        title="Chấm điểm"
        description="Trung tâm chấm bài kiểu LMS cho Homework, Quiz, Writing, Speaking, Midterm, Final và bài upload file."
        action="Chấm nhanh"
        icon={CheckCircle2}
      />

      <GradingTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'dashboard' && (
        <>
          <GradingDashboard />
          <GradingWorkflow />
        </>
      )}
      {activeTab === 'queue' && <GradingTable submissions={queueItems} onViewSubmission={(submission) => openDetail(submission, 'view')} onGradeSubmission={(submission) => openDetail(submission, 'grade')} />}
      {activeTab === 'detail' && (
        <GradingDetail
          mode={detailMode}
          submission={currentSubmission}
          savedDraft={reviewedGrade || draftGrades[currentSubmission.id]}
          onStartGrading={() => setDetailMode(selectedHistoryItem ? 'edit' : 'grade')}
          onSaveDraft={selectedHistoryItem ? handleUpdateHistoryGrade : handleSaveDraft}
          onReturnSubmission={handleReturnSubmission}
        />
      )}
      {activeTab === 'history' && <GradingHistory data={historyItems} onReview={(item) => openHistoryDetail(item, 'review')} onEdit={(item) => openHistoryDetail(item, 'edit')} />}
      {activeTab === 'statistics' && <GradingStatistics />}
    </div>
  )
}

const GradingWorkflow = () => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-lg font-black text-slate-950">Luồng hoạt động</h2>
        <p className="text-sm text-slate-500">Từ lúc học viên nộp bài đến khi điểm hiển thị trong mục Kết quả học tập.</p>
      </div>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {gradingFlow.map((step, index) => (
        <div key={step} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-xs font-black text-orange-700 shadow-sm">{index + 1}</span>
          <p className="mt-3 text-sm font-black text-slate-800">{step}</p>
        </div>
      ))}
    </div>
  </section>
)
