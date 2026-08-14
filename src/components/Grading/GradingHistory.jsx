import { useEffect, useMemo, useState } from 'react'
import { Edit3, Eye, Filter, GraduationCap, Search, UsersRound } from 'lucide-react'
import { GradingPagination } from './GradingPagination.jsx'

const allCourses = 'Tất cả khóa'
const allClasses = 'Tất cả lớp'

const historyClassByStudent = {
  'Nguyễn Minh Anh': 'IELTS Foundation A',
  'Đỗ An Nhiên': 'Kids Starter B',
  'Nguyễn Quốc Huy': 'TOEIC Compact C',
  'Hoàng Tú Anh': 'Communication Plus',
  'Lê Gia Hân': 'IELTS Foundation A',
}

const getCourseName = (className) => {
  if (className.includes('IELTS')) return 'IELTS'
  if (className.includes('TOEIC')) return 'TOEIC'
  if (className.includes('Kids')) return 'Kids'
  if (className.includes('Communication')) return 'Communication'
  return 'Khóa khác'
}

const getHistoryClassName = (item) => item.submission?.className || historyClassByStudent[item.student] || 'Chưa xác định'

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

export const GradingHistory = ({ data = [], onReview, onEdit }) => {
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState(allCourses)
  const [className, setClassName] = useState(allClasses)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const preparedData = useMemo(
    () =>
      data.map((item) => {
        const resolvedClassName = getHistoryClassName(item)
        return {
          ...item,
          className: resolvedClassName,
          course: getCourseName(resolvedClassName),
        }
      }),
    [data],
  )

  const filterOptions = useMemo(() => {
    const classes = uniqueValues(preparedData.map((item) => item.className))
    const courseClasses = course === allCourses ? classes : classes.filter((item) => getCourseName(item) === course)

    return {
      courses: [allCourses, ...uniqueValues(preparedData.map((item) => item.course))],
      classes: [allClasses, ...courseClasses],
    }
  }, [course, preparedData])

  useEffect(() => {
    if (!filterOptions.classes.includes(className)) {
      setClassName(allClasses)
    }
  }, [className, filterOptions.classes])

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return preparedData.filter((item) => {
      const matchesSearch = !normalizedSearch || `${item.title} ${item.student} ${item.className}`.toLowerCase().includes(normalizedSearch)
      const matchesCourse = course === allCourses || item.course === course
      const matchesClass = className === allClasses || item.className === className

      return matchesSearch && matchesCourse && matchesClass
    })
  }, [className, course, preparedData, search])

  useEffect(() => {
    setPage(1)
  }, [className, course, search])

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

  const handlePageSizeChange = (value) => {
    setPageSize(value)
    setPage(1)
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
        <div>
          <h2 className="text-lg font-black text-slate-950">Đã chấm</h2>
          <p className="text-sm text-slate-500">Danh sách bài đã trả điểm, có thể xem lại, sửa điểm và sửa nhận xét.</p>
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

      <div className="grid gap-3 md:grid-cols-3">
        <SelectFilter icon={GraduationCap} label="Khóa" value={course} options={filterOptions.courses} onChange={setCourse} />
        <SelectFilter icon={UsersRound} label="Lớp" value={className} options={filterOptions.classes} onChange={setClassName} />
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
            <Filter size={14} />
            Kết quả
          </span>
          <p className="mt-2 font-black text-slate-950">{filteredData.length} bài đã chấm</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-[24%] px-4 py-3 font-black">Tên bài</th>
                <th className="w-[16%] px-4 py-3 font-black">Học viên</th>
                <th className="w-[16%] px-4 py-3 font-black">Lớp</th>
                <th className="w-[10%] px-4 py-3 font-black">Khóa</th>
                <th className="w-[9%] px-4 py-3 font-black">Điểm</th>
                <th className="w-[12%] px-4 py-3 font-black">Ngày chấm</th>
                <th className="w-[13%] px-4 py-3 text-right font-black">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((item) => (
                <tr key={item.id} className="hover:bg-orange-50/50">
                  <td className="px-4 py-4">
                    <p className="truncate font-black text-slate-900">{item.title}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.comment}</p>
                  </td>
                  <td className="px-4 py-4 font-semibold text-slate-700">{item.student}</td>
                  <td className="px-4 py-4 text-slate-600">{item.className}</td>
                  <td className="px-4 py-4 text-slate-600">{item.course}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">{item.score}</span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{item.gradedDate}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => onReview?.(item)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-black text-slate-700 hover:bg-gray-50">
                        <Eye size={15} /> Xem
                      </button>
                      <button type="button" onClick={() => onEdit?.(item)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-700">
                        <Edit3 size={15} /> Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-bold text-slate-500" colSpan={7}>Không có bài đã chấm phù hợp với bộ lọc.</td>
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
