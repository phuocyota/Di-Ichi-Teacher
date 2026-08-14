import { useEffect, useState } from 'react'
import { BellRing, PlayCircle, Plus, Radio, Timer, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { quizTemplates } from '../../datas/myClassExtras.js'
import { Badge } from '../Common/Badge.jsx'
import { Button } from '../Common/Button.jsx'
import { Card } from '../Common/Card.jsx'

export const MyClassesQuiz = ({ selectedClass, selectedSession }) => {
  const sessionQuizzes = selectedSession?.quizzes || quizTemplates
  const [quizzes, setQuizzes] = useState(sessionQuizzes)
  const [form, setForm] = useState({ title: 'Quiz Vocabulary', questions: 10, duration: 15 })
  const activeQuiz = quizzes[0]

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  useEffect(() => {
    setQuizzes(sessionQuizzes)
  }, [sessionQuizzes])

  const handleCreateQuiz = (event) => {
    event.preventDefault()
    const newQuiz = {
      id: `quiz-${Date.now()}`,
      title: form.title,
      questions: Number(form.questions),
      duration: Number(form.duration),
      status: 'Sẵn sàng',
      joined: 0,
      submitted: 0,
      total: selectedClass.size,
    }
    setQuizzes((current) => [newQuiz, ...current])
    toast.success('Đã tạo Quiz nhanh', {
      description: `${newQuiz.title} đã sẵn sàng để bắt đầu.`,
    })
  }

  const handleStartQuiz = () => {
    setQuizzes((current) =>
      current.map((quiz, index) =>
        index === 0
          ? { ...quiz, status: 'Đang diễn ra', joined: Math.min(25, selectedClass.size), submitted: Math.min(20, selectedClass.size), total: selectedClass.size }
          : quiz,
      ),
    )
    toast.success('Đã bắt đầu Quiz', {
      description: `Toàn bộ học viên lớp ${selectedClass.name} đã nhận thông báo. LMS học viên tự động mở bài Quiz.`,
    })
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <Card>
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-100 text-orange-700">
            <Plus size={22} />
          </span>
          <div>
            <h3 className="text-lg font-black text-slate-950">Tạo nhanh Quiz</h3>
            <p className="text-sm text-slate-500">Tạo quiz để học viên làm ngay trên LMS.</p>
          </div>
        </div>

        <form className="mt-5 space-y-4" onSubmit={handleCreateQuiz}>
          <label className="block">
            <span className="text-sm font-bold text-slate-700">Tên Quiz</span>
            <input className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" value={form.title} onChange={(event) => handleChange('title', event.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Số câu</span>
              <input className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" type="number" min="1" value={form.questions} onChange={(event) => handleChange('questions', event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Thời lượng phút</span>
              <input className="mt-2 h-11 w-full rounded-xl border border-orange-100 px-3 text-sm outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100" type="number" min="1" value={form.duration} onChange={(event) => handleChange('duration', event.target.value)} />
            </label>
          </div>
          <Button className="w-full" type="submit">
            <Plus size={18} />
            Tạo Quiz
          </Button>
        </form>
      </Card>

      <div className="space-y-5">
        <Card>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <Badge tone={activeQuiz.status === 'Đang diễn ra' ? 'green' : 'orange'}>{activeQuiz.status}</Badge>
              <h3 className="mt-3 text-2xl font-black text-slate-950">{activeQuiz.title}</h3>
              <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                <span className="inline-flex items-center gap-2"><Radio size={16} className="text-orange-600" /> {activeQuiz.questions} câu</span>
                <span className="inline-flex items-center gap-2"><Timer size={16} className="text-orange-600" /> {activeQuiz.duration} phút</span>
              </div>
            </div>
            <Button className="min-h-12" onClick={handleStartQuiz}>
              <PlayCircle size={20} />
              Bắt đầu Quiz
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-black text-slate-700"><UsersRound size={18} className="text-orange-600" /> Đã vào làm</span>
              <Badge tone="green">{activeQuiz.joined}/{activeQuiz.total}</Badge>
            </div>
            <div className="mt-4 h-3 rounded-full bg-orange-100">
              <div className="h-3 rounded-full bg-orange-500" style={{ width: `${(activeQuiz.joined / activeQuiz.total) * 100}%` }} />
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-sm font-black text-slate-700"><BellRing size={18} className="text-orange-600" /> Đã nộp bài</span>
              <Badge tone="amber">{activeQuiz.submitted}/{activeQuiz.total}</Badge>
            </div>
            <div className="mt-4 h-3 rounded-full bg-orange-100">
              <div className="h-3 rounded-full bg-amber-400" style={{ width: `${(activeQuiz.submitted / activeQuiz.total) * 100}%` }} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
