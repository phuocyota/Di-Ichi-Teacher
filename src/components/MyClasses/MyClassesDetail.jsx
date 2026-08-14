import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3 } from 'lucide-react'
import { Badge } from '../Common/Badge.jsx'
import { Card } from '../Common/Card.jsx'
import { MyClassesAfterLessonReport } from './MyClassesAfterLessonReport.jsx'
import { MyClassesAttendance } from './MyClassesAttendance.jsx'
import { MyClassesComments } from './MyClassesComments.jsx'
import { MyClassesDiscussion } from './MyClassesDiscussion.jsx'
import { MyClassesHomework } from './MyClassesHomework.jsx'
import { MyClassesInfo } from './MyClassesInfo.jsx'
import { MyClassesLearningProgress } from './MyClassesLearningProgress.jsx'
import { MyClassesMaterials } from './MyClassesMaterials.jsx'
import { MyClassesQuiz } from './MyClassesQuiz.jsx'
import { MyClassesScores } from './MyClassesScores.jsx'
import { MyClassesStudents } from './MyClassesStudents.jsx'
import { cn } from '../../utils/cn.js'

const classTabGroups = {
  'Học viên': ['Danh sách học viên', 'Điểm danh'],
  'Học tập': ['Homework', 'Quiz & Thi Online', 'Tài liệu', 'Thảo luận'],
  'Đánh giá': ['Điểm số', 'Nhận xét', 'Tiến độ học tập'],
}

const emptySubTabs = []

const attendanceStatuses = ['Có mặt', 'Muộn', 'Nghỉ phép', 'Vắng']

const buildSessionStudents = (students, sessionIndex) =>
  students.map((student, studentIndex) => ({
    ...student,
    attendanceStatus: attendanceStatuses[(studentIndex + sessionIndex) % attendanceStatuses.length],
    progress: Math.min(100, Math.max(10, student.progress + sessionIndex * 5)),
    homework: `${Math.max(0, 15 - studentIndex - sessionIndex)}/16`,
  }))

const buildClassSessions = (selectedClass) => {
  const topics = [
    selectedClass.nextLesson,
    selectedClass.level.includes('IELTS') ? 'Practice clinic & feedback' : 'Guided practice',
    selectedClass.level.includes('TOEIC') ? 'Mini test and correction' : 'Review and application',
  ]

  return topics.map((topic, index) => {
    const sessionNumber = index + 1
    const sessionStudents = buildSessionStudents(selectedClass.students, index)
    const total = selectedClass.size

    return {
      id: `${selectedClass.id}-session-${sessionNumber}`,
      title: `Buổi ${sessionNumber}`,
      topic,
      date: index === 0 ? selectedClass.time : `Buổi ${sessionNumber} - ${selectedClass.time}`,
      room: selectedClass.room,
      summary: index === 0 ? 'Buổi học sắp tới' : index === 1 ? 'Buổi luyện tập' : 'Buổi ôn tập',
      students: sessionStudents,
      homework:
        index === 0
          ? selectedClass.homework
          : [
              {
                title: `${topic} Assignment`,
                due: `${10 + index}/08/2026`,
                submitted: `${Math.max(total - 4 - index, 0)}/${total}`,
                status: index === 1 ? 'Đang giao' : 'Cần chấm',
                description: `Bài tập riêng cho ${topic.toLowerCase()}.`,
              },
            ],
      quizzes: [
        {
          id: `${selectedClass.id}-quiz-${sessionNumber}`,
          title: `${topic} Quiz`,
          questions: 8 + index * 2,
          duration: 12 + index * 3,
          status: index === 0 ? 'Sẵn sàng' : index === 1 ? 'Nháp' : 'Đã kết thúc',
          joined: Math.min(total, total - index * 3),
          submitted: Math.min(total, total - index * 4),
          total,
        },
      ],
      materials: [
        { id: `${selectedClass.id}-mat-${sessionNumber}-slide`, title: `${topic} Slides`, type: 'Slide', visibility: 'Hiện', access: 'Chỉ xem', shared: true },
        { id: `${selectedClass.id}-mat-${sessionNumber}-handout`, title: `${topic} Handout`, type: 'PDF', visibility: index === 2 ? 'Ẩn' : 'Hiện', access: 'Cho tải', shared: index !== 2 },
      ],
      discussions: [
        {
          id: `${selectedClass.id}-disc-${sessionNumber}`,
          author: selectedClass.teacher,
          role: 'Giáo viên',
          message: `Trao đổi nội dung ${topic.toLowerCase()} của ${selectedClass.name}.`,
          replies: 2 + index,
          attachment: index === 0 ? 'lesson-note.pdf' : null,
          time: index === 0 ? '09:12' : 'Vừa cập nhật',
        },
      ],
    }
  })
}

export const MyClassesDetail = ({ selectedClass, activeTab }) => {
  const sessions = useMemo(() => selectedClass.sessions || buildClassSessions(selectedClass), [selectedClass])
  const subTabs = classTabGroups[activeTab] || emptySubTabs
  const [activeSessionId, setActiveSessionId] = useState(sessions[0]?.id)
  const [activeSubTab, setActiveSubTab] = useState(subTabs[0] || '')
  const [afterLessonReports, setAfterLessonReports] = useState({})
  const selectedSession = sessions.find((session) => session.id === activeSessionId) || sessions[0]
  const isInfoTab = activeTab === 'Thông tin'
  const isReportTab = activeTab === 'Báo cáo sau buổi học'

  useEffect(() => {
    setActiveSessionId(sessions[0]?.id)
  }, [selectedClass.id, sessions])

  useEffect(() => {
    setActiveSubTab(subTabs[0] || '')
  }, [activeTab, subTabs])

  const renderContent = () => {
    if (isInfoTab) return <MyClassesInfo selectedClass={selectedClass} />
    if (isReportTab) {
      return (
        <MyClassesAfterLessonReport
          key={selectedSession?.id}
          reports={afterLessonReports}
          selectedClass={selectedClass}
          selectedSession={selectedSession}
          setReports={setAfterLessonReports}
        />
      )
    }
    if (activeSubTab === 'Danh sách học viên') return <MyClassesStudents selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Điểm danh') return <MyClassesAttendance selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Homework') return <MyClassesHomework selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Quiz & Thi Online') return <MyClassesQuiz selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Tài liệu') return <MyClassesMaterials selectedSession={selectedSession} />
    if (activeSubTab === 'Thảo luận') return <MyClassesDiscussion selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Điểm số') return <MyClassesScores selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Nhận xét') return <MyClassesComments selectedClass={selectedClass} selectedSession={selectedSession} />
    if (activeSubTab === 'Tiến độ học tập') return <MyClassesLearningProgress selectedClass={selectedClass} selectedSession={selectedSession} />
    return null
  }

  if (isInfoTab) {
    return renderContent()
  }

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <Badge>{activeTab}</Badge>
            <h2 className="mt-3 text-2xl font-black text-slate-950">{selectedClass.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{activeSubTab ? `${activeSubTab} - ` : ''}{selectedClass.nextLesson}</p>
          </div>
          <div className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-black text-orange-700">
            {selectedClass.size} học viên
          </div>
        </div>

        {subTabs.length > 0 && (
          <div className="mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-orange-100 bg-orange-50 p-2">
            {subTabs.map((subTab) => (
              <button
                key={subTab}
                className={cn(
                  'min-h-10 shrink-0 rounded-xl px-3 text-sm font-black transition',
                  activeSubTab === subTab ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-100' : 'text-slate-600 hover:bg-white/70 hover:text-orange-700',
                )}
                onClick={() => setActiveSubTab(subTab)}
                type="button"
              >
                {subTab}
              </button>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {sessions.map((session) => {
            const isActive = session.id === selectedSession.id

            return (
              <button
                key={session.id}
                className={cn(
                  'rounded-2xl border p-4 text-left transition',
                  isActive ? 'border-orange-300 bg-orange-50 ring-2 ring-orange-100' : 'border-orange-100 bg-white hover:border-orange-200 hover:bg-orange-50/60',
                )}
                onClick={() => setActiveSessionId(session.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2 text-sm font-black text-slate-950">
                    {isActive ? <CheckCircle2 size={17} className="text-orange-600" /> : <CalendarDays size={17} className="text-orange-500" />}
                    {session.title}
                  </span>
                  <Badge tone={isActive ? 'orange' : 'slate'}>{session.summary}</Badge>
                </div>
                <p className="mt-3 text-sm font-bold text-slate-700">{session.topic}</p>
                <p className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <Clock3 size={14} className="text-orange-500" />
                  {session.date}
                </p>
              </button>
            )
          })}
        </div>
      </Card>
      {renderContent()}
    </div>
  )
}
