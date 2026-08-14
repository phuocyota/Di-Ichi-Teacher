import { BookOpen, Eye, Filter, GraduationCap, PenLine, Search, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { gradingFilterOptions, gradingListData } from '../../datas/gradingListData.js'
import { cn } from '../../utils/cn.js'
import { GradingPagination } from './GradingPagination.jsx'

const allCourses = 'Tất cả khóa'
const allClasses = 'Tất cả lớp'
const allTypes = 'Tất cả loại bài'
const allStatuses = 'Tất cả trạng thái'

const statusStyles = {
  'Chờ chấm': 'bg-amber-50 text-amber-700 ring-amber-100',
  'Ưu tiên': 'bg-orange-50 text-orange-700 ring-orange-100',
  'Quá hạn chấm': 'bg-rose-50 text-rose-700 ring-rose-100',
  'Đã lưu điểm': 'bg-emerald-50 text-emerald-700 ring-emerald-100',
}

const getCourseName = (className) => {
  if (className.includes('IELTS')) return 'IELTS'
  if (className.includes('TOEIC')) return 'TOEIC'
  if (className.includes('Kids')) return 'Kids'
  if (className.includes('Communication')) return 'Communication'
  return 'Khóa khác'
}

const uniqueValues = (values) => [...new Set(values)]

const SelectFilter = ({ icon: Icon, label, value, options, onChange }) => (
  <label className="block">
    <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
      <Icon size={14} />
      {label}
    </span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
)

export const GradingTable = ({ submissions = gradingListData, onViewSubmission, onGradeSubmission }) => {
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState(allCourses)
  const [className, setClassName] = useState(allClasses)
  const [type, setType] = useState(allTypes)
  const [status, setStatus] = useState(allStatuses)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filterOptions = useMemo(() => {
    const classes = uniqueValues(submissions.map((item) => item.className))
    const courseClasses = course === allCourses
      ? classes
      : classes.filter((item) => getCourseName(item) === course)

    return {
      courses: [allCourses, ...uniqueValues(submissions.map((item) => getCourseName(item.className)))],
      classes: [allClasses, ...courseClasses],
      types: gradingFilterOptions.types.includes(allTypes) ? gradingFilterOptions.types : [allTypes, ...uniqueValues(submissions.map((item) => item.type))],
      statuses: gradingFilterOptions.statuses.includes(allStatuses) ? gradingFilterOptions.statuses : [allStatuses, ...uniqueValues(submissions.map((item) => item.status))],
    }
  }, [course, submissions])

  useEffect(() => {
    if (!filterOptions.classes.includes(className)) {
      setClassName(allClasses)
    }
  }, [className, filterOptions.classes])

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return submissions.filter((item) => {
      const matchesSearch = !normalizedSearch || `${item.title} ${item.student} ${item.className}`.toLowerCase().includes(normalizedSearch)
      const matchesCourse = course === allCourses || getCourseName(item.className) === course
      const matchesClass = className === allClasses || item.className === className
      const matchesType = type === allTypes || item.type === type
      const matchesStatus = status === allStatuses || item.status === status

      return matchesSearch && matchesCourse && matchesClass && matchesType && matchesStatus
    })
  }, [className, course, search, status, submissions, type])

  useEffect(() => {
    setPage(1)
  }, [className, course, search, status, type])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, page, pageSize])

  const groupedStudents = useMemo(
    () =>
      Object.values(
        paginatedData.reduce((groups, item) => {
          if (!groups[item.student]) {
            groups[item.student] = {
              name: item.student,
              className: item.className,
              course: getCourseName(item.className),
              submissions: [],
            }
          }

          groups[item.student].submissions.push(item)
          return groups
        }, {}),
      ),
    [paginatedData],
  )

  const handlePageSizeChange = (value) => {
    setPageSize(value)
    setPage(1)
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-lg font-black text-slate-950">Bài cần chấm</h2>
            <p className="text-sm text-slate-500">Lọc bài theo khóa, lớp, loại bài và trạng thái, sau đó chọn học viên để xem hoặc chấm bài.</p>
          </div>
          <label className="relative block w-full lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm học viên, lớp hoặc tên bài"
              className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SelectFilter icon={GraduationCap} label="Khóa" value={course} options={filterOptions.courses} onChange={setCourse} />
          <SelectFilter icon={UsersRound} label="Lớp" value={className} options={filterOptions.classes} onChange={setClassName} />
          <SelectFilter icon={BookOpen} label="Loại bài" value={type} options={filterOptions.types} onChange={setType} />
          <SelectFilter icon={Filter} label="Trạng thái" value={status} options={filterOptions.statuses} onChange={setStatus} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1120px] divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-black">Học viên</th>
                <th className="px-4 py-3 font-black">Khóa</th>
                <th className="px-4 py-3 font-black">Lớp</th>
                <th className="px-4 py-3 font-black">Tên bài</th>
                <th className="px-4 py-3 font-black">Loại bài</th>
                <th className="px-4 py-3 font-black">Ngày nộp</th>
                <th className="px-4 py-3 font-black">Trạng thái</th>
                <th className="px-4 py-3 text-right font-black">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupedStudents.flatMap((studentGroup) =>
                studentGroup.submissions.map((item, index) => (
                  <tr key={item.id} className="hover:bg-orange-50/50">
                    {index === 0 && (
                      <>
                        <td className="px-4 py-4 align-top font-black text-slate-900" rowSpan={studentGroup.submissions.length}>
                          {studentGroup.name}
                          <p className="mt-1 text-xs font-bold text-slate-400">{studentGroup.submissions.length} bài</p>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600" rowSpan={studentGroup.submissions.length}>{studentGroup.course}</td>
                        <td className="px-4 py-4 align-top text-slate-600" rowSpan={studentGroup.submissions.length}>{studentGroup.className}</td>
                      </>
                    )}
                    <td className="px-4 py-4 font-black text-slate-900">{item.title}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">{item.type}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.submittedDate} - {item.submittedTime}</td>
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
                )),
              )}
              {groupedStudents.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-bold text-slate-500" colSpan={8}>Không còn học viên hoặc bài phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <GradingPagination
          page={page}
          pageSize={pageSize}
          totalItems={filteredData.length}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>
    </section>
  )
}
