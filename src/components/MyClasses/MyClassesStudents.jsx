import { DataTable } from '../Common/DataTable.jsx'
import { Badge } from '../Common/Badge.jsx'

export const MyClassesStudents = ({ selectedClass, selectedSession }) => {
  const students = selectedSession?.students || selectedClass.students
  const columns = [
    {
      accessorKey: 'name',
      header: 'Học viên',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <img className="h-10 w-10 rounded-xl object-cover" src={row.original.avatar} alt={row.original.name} />
          <div>
            <p className="font-black text-slate-900">{row.original.name}</p>
            <p className="text-xs text-slate-500">{row.original.id}</p>
          </div>
        </div>
      ),
    },
    { accessorKey: 'attendanceRate', header: 'Điểm danh' },
    { accessorKey: 'averageScore', header: 'Điểm TB' },
    {
      accessorKey: 'progress',
      header: 'Tiến độ',
      cell: ({ getValue }) => (
        <div className="min-w-32">
          <div className="h-2 rounded-full bg-orange-100">
            <div className="h-2 rounded-full bg-orange-500" style={{ width: `${getValue()}%` }} />
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">{getValue()}%</p>
        </div>
      ),
    },
    { accessorKey: 'homework', header: 'Homework' },
    {
      accessorKey: 'attendanceStatus',
      header: 'Trạng thái',
      cell: ({ getValue }) => <Badge>{getValue()}</Badge>,
    },
  ]

  return <DataTable columns={columns} data={students} />
}
