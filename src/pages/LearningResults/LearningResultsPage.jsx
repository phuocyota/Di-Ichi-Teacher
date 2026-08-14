import { useEffect, useMemo, useState } from 'react'
import { Download, Filter, GraduationCap, Search, UsersRound } from 'lucide-react'
import { PageHeader } from '../../components/Common/PageHeader.jsx'
import { Button } from '../../components/Common/Button.jsx'

const allCourses = 'Tất cả khóa'
const allClasses = 'Tất cả lớp'
const allStatuses = 'Tất cả trạng thái'

const scoreRows = [
  { id: 'LR-001', course: 'IELTS', className: 'IELTS Foundation A', studentId: 'IELTS-F01-1', student: 'Nguyễn Minh Anh', listening: 7.5, speaking: 7.2, reading: 8.1, writing: 7.8, target: 8.0, status: 'Đạt mục tiêu' },
  { id: 'LR-002', course: 'IELTS', className: 'IELTS Foundation A', studentId: 'IELTS-F01-2', student: 'Trần Bảo Lâm', listening: 7.0, speaking: 6.8, reading: 7.4, writing: 7.1, target: 7.5, status: 'Cần theo dõi' },
  { id: 'LR-003', course: 'IELTS', className: 'IELTS Foundation A', studentId: 'IELTS-F01-3', student: 'Lê Gia Hân', listening: 8.0, speaking: 7.6, reading: 8.3, writing: 8.0, target: 8.0, status: 'Đạt mục tiêu' },
  { id: 'LR-004', course: 'IELTS', className: 'IELTS Writing Boost', studentId: 'IELTS-W02-1', student: 'Phan Hà My', listening: 6.8, speaking: 7.0, reading: 7.2, writing: 7.6, target: 7.5, status: 'Đạt mục tiêu' },
  { id: 'LR-005', course: 'TOEIC', className: 'TOEIC Compact C', studentId: 'TOEIC-550-1', student: 'Nguyễn Quốc Huy', listening: 8.4, speaking: 7.2, reading: 8.6, writing: 7.4, target: 8.0, status: 'Đạt mục tiêu' },
  { id: 'LR-006', course: 'TOEIC', className: 'TOEIC Compact C', studentId: 'TOEIC-550-2', student: 'Bùi Khánh Vy', listening: 7.6, speaking: 6.9, reading: 7.9, writing: 7.0, target: 8.0, status: 'Cần theo dõi' },
  { id: 'LR-007', course: 'Communication', className: 'Communication Plus', studentId: 'SPK-CLUB-1', student: 'Hoàng Tú Anh', listening: 7.3, speaking: 8.0, reading: 7.0, writing: 7.1, target: 7.5, status: 'Đạt mục tiêu' },
  { id: 'LR-008', course: 'Kids', className: 'Kids Starter B', studentId: 'KIDS-E01-1', student: 'Đỗ An Nhiên', listening: 9.0, speaking: 8.8, reading: 8.6, writing: 8.4, target: 8.5, status: 'Vượt mục tiêu' },
  { id: 'LR-009', course: 'Kids', className: 'Kids Starter B', studentId: 'KIDS-E01-2', student: 'Phạm Minh Khang', listening: 7.4, speaking: 7.1, reading: 7.0, writing: 6.8, target: 7.5, status: 'Cần theo dõi' },
]

const uniqueValues = (values) => [...new Set(values)]

const getAverage = (row) => Number(((row.listening + row.speaking + row.reading + row.writing) / 4).toFixed(1))

const getStatusTone = (status) => {
  if (status === 'Vượt mục tiêu') return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  if (status === 'Đạt mục tiêu') return 'bg-orange-50 text-orange-700 ring-orange-100'
  return 'bg-rose-50 text-rose-700 ring-rose-100'
}

const SelectFilter = ({ icon: Icon, label, value, options, onChange }) => (
  <label className="block">
    <span className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400">
      <Icon size={14} />
      {label}
    </span>
    <select
      className="mt-2 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </label>
)

const escapeExcelText = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const downloadExcel = (rows, course) => {
  const tableRows = rows.map((row) => {
    const average = getAverage(row)

    return `
      <tr>
        <td>${escapeExcelText(row.course)}</td>
        <td>${escapeExcelText(row.className)}</td>
        <td>${escapeExcelText(row.studentId)}</td>
        <td>${escapeExcelText(row.student)}</td>
        <td>${row.listening}</td>
        <td>${row.speaking}</td>
        <td>${row.reading}</td>
        <td>${row.writing}</td>
        <td>${average}</td>
        <td>${row.target}</td>
        <td>${escapeExcelText(row.status)}</td>
      </tr>
    `
  }).join('')

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"></head>
      <body>
        <table>
          <thead>
            <tr>
              <th>Khóa</th>
              <th>Lớp</th>
              <th>Mã học viên</th>
              <th>Học viên</th>
              <th>Listening</th>
              <th>Speaking</th>
              <th>Reading</th>
              <th>Writing</th>
              <th>Điểm TB</th>
              <th>Mục tiêu</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([workbook], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `bang-diem-${course === allCourses ? 'tat-ca-khoa' : course.toLowerCase()}.xls`
  link.click()
  URL.revokeObjectURL(url)
}

export const LearningResultsPage = () => {
  const [search, setSearch] = useState('')
  const [course, setCourse] = useState(allCourses)
  const [className, setClassName] = useState(allClasses)
  const [status, setStatus] = useState(allStatuses)

  const filterOptions = useMemo(() => {
    const classes = uniqueValues(scoreRows.map((row) => row.className))
    const courseClasses = course === allCourses ? classes : classes.filter((item) => scoreRows.some((row) => row.course === course && row.className === item))

    return {
      courses: [allCourses, ...uniqueValues(scoreRows.map((row) => row.course))],
      classes: [allClasses, ...courseClasses],
      statuses: [allStatuses, ...uniqueValues(scoreRows.map((row) => row.status))],
    }
  }, [course])

  useEffect(() => {
    if (!filterOptions.classes.includes(className)) {
      setClassName(allClasses)
    }
  }, [className, filterOptions.classes])

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return scoreRows.filter((row) => {
      const matchesSearch = !normalizedSearch || `${row.student} ${row.studentId} ${row.className}`.toLowerCase().includes(normalizedSearch)
      const matchesCourse = course === allCourses || row.course === course
      const matchesClass = className === allClasses || row.className === className
      const matchesStatus = status === allStatuses || row.status === status

      return matchesSearch && matchesCourse && matchesClass && matchesStatus
    })
  }, [className, course, search, status])

  return (
    <div className="space-y-5">
      <PageHeader title="Kết quả học tập" description="Theo dõi bảng điểm học viên theo khóa, lớp và trạng thái đạt mục tiêu." />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-lg font-black text-slate-950">Bảng điểm học viên</h2>
            <p className="text-sm text-slate-500">Lọc dữ liệu theo khóa/lớp rồi xuất Excel bảng điểm của khóa đang chọn.</p>
          </div>
          <Button onClick={() => downloadExcel(filteredRows, course)} disabled={filteredRows.length === 0} className={filteredRows.length === 0 ? 'cursor-not-allowed opacity-60' : ''}>
            <Download size={18} />
            Xuất Excel
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <label className="relative block">
            <span className="text-xs font-black uppercase text-slate-400">Tìm kiếm</span>
            <Search className="pointer-events-none absolute left-3 top-[38px] text-slate-400" size={18} />
            <input
              className="mt-2 h-11 w-full rounded-xl border border-gray-200 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
              placeholder="Tên, mã học viên, lớp"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <SelectFilter icon={GraduationCap} label="Khóa" value={course} options={filterOptions.courses} onChange={setCourse} />
          <SelectFilter icon={UsersRound} label="Lớp" value={className} options={filterOptions.classes} onChange={setClassName} />
          <SelectFilter icon={Filter} label="Trạng thái" value={status} options={filterOptions.statuses} onChange={setStatus} />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="w-[10%] px-4 py-3 font-black">Khóa</th>
                <th className="w-[15%] px-4 py-3 font-black">Lớp</th>
                <th className="w-[10%] px-4 py-3 font-black">Mã HV</th>
                <th className="w-[15%] px-4 py-3 font-black">Học viên</th>
                <th className="w-[8%] px-4 py-3 font-black">Listening</th>
                <th className="w-[8%] px-4 py-3 font-black">Speaking</th>
                <th className="w-[8%] px-4 py-3 font-black">Reading</th>
                <th className="w-[8%] px-4 py-3 font-black">Writing</th>
                <th className="w-[8%] px-4 py-3 font-black">TB</th>
                <th className="w-[10%] px-4 py-3 font-black">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-orange-50/50">
                  <td className="px-4 py-4 font-bold text-slate-700">{row.course}</td>
                  <td className="px-4 py-4 text-slate-600">{row.className}</td>
                  <td className="px-4 py-4 text-slate-600">{row.studentId}</td>
                  <td className="px-4 py-4 font-black text-slate-900">{row.student}</td>
                  <td className="px-4 py-4 text-slate-700">{row.listening}</td>
                  <td className="px-4 py-4 text-slate-700">{row.speaking}</td>
                  <td className="px-4 py-4 text-slate-700">{row.reading}</td>
                  <td className="px-4 py-4 text-slate-700">{row.writing}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">{getAverage(row)}</span>
                    <p className="mt-1 text-xs font-bold text-slate-400">Mục tiêu {row.target}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getStatusTone(row.status)}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-bold text-slate-500" colSpan={10}>Không có bảng điểm phù hợp với bộ lọc.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
