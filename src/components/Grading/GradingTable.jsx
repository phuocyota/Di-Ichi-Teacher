import { Eye, PenLine, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { gradingFilterOptions, gradingListData } from '../../datas/gradingListData.js'
import { cn } from '../../utils/cn.js'

const statusStyles = {
  'Chờ chấm': 'bg-amber-50 text-amber-700 ring-amber-100',
  'Ưu tiên': 'bg-orange-50 text-orange-700 ring-orange-100',
  'Quá hạn chấm': 'bg-rose-50 text-rose-700 ring-rose-100',
  'Đã lưu điểm': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

const SelectFilter = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
)

export const GradingTable = ({ submissions = gradingListData, onViewSubmission, onGradeSubmission }) => {
  const [search, setSearch] = useState('')
  const [className, setClassName] = useState('Tất cả lớp')
  const [student, setStudent] = useState('Tất cả học viên')
  const [type, setType] = useState('Tất cả loại bài')
  const [status, setStatus] = useState('Tất cả trạng thái')

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return submissions.filter((item) => {
      const matchesSearch = !normalizedSearch || `${item.title} ${item.student}`.toLowerCase().includes(normalizedSearch)
      const matchesClass = className === 'Tất cả lớp' || item.className === className
      const matchesStudent = student === 'Tất cả học viên' || item.student === student
      const matchesType = type === 'Tất cả loại bài' || item.type === type
      const matchesStatus = status === 'Tất cả trạng thái' || item.status === status

      return matchesSearch && matchesClass && matchesStudent && matchesType && matchesStatus
    })
  }, [className, search, status, student, submissions, type])

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-black text-slate-950">Bài cần chấm</h2>
          <p className="text-sm text-slate-500">Tập trung toàn bộ Homework, Quiz, Writing, Speaking và bài kiểm tra.</p>
        </div>
        <label className="relative block w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm học viên hoặc tên bài"
            className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SelectFilter label="Lớp học" value={className} options={gradingFilterOptions.classes} onChange={setClassName} />
        <SelectFilter label="Học viên" value={student} options={gradingFilterOptions.students} onChange={setStudent} />
        <SelectFilter label="Loại bài" value={type} options={gradingFilterOptions.types} onChange={setType} />
        <SelectFilter label="Trạng thái" value={status} options={gradingFilterOptions.statuses} onChange={setStatus} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-black">Tên bài</th>
                <th className="px-4 py-3 font-black">Lớp</th>
                <th className="px-4 py-3 font-black">Loại bài</th>
                <th className="px-4 py-3 font-black">Học viên</th>
                <th className="px-4 py-3 font-black">Ngày nộp</th>
                <th className="px-4 py-3 font-black">Trạng thái</th>
                <th className="px-4 py-3 text-right font-black">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/50">
                  <td className="px-4 py-4 font-black text-slate-900">{item.title}</td>
                  <td className="px-4 py-4 text-slate-600">{item.className}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{item.type}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{item.student}</td>
                  <td className="px-4 py-4 text-slate-600">{item.submittedDate}</td>
                  <td className="px-4 py-4">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-black ring-1', statusStyles[item.status] || 'bg-slate-100 text-slate-700 ring-slate-200')}>{item.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onViewSubmission(item)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-black text-slate-700 hover:bg-gray-50">
                        <Eye size={15} /> Xem bài
                      </button>
                      <button type="button" onClick={() => onGradeSubmission(item)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-700">
                        <PenLine size={15} /> Chấm bài
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-bold text-slate-500" colSpan={7}>Không còn bài phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
