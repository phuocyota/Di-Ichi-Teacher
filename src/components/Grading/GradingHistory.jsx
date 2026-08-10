import { Edit3, Eye } from 'lucide-react'
import { gradingHistoryData } from '../../datas/gradingHistoryData.js'

export const GradingHistory = ({ data = gradingHistoryData, onReview, onEdit }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <h2 className="text-lg font-black text-slate-950">Đã chấm</h2>
        <p className="text-sm text-slate-500">Danh sách bài đã trả điểm, có thể xem lại, sửa điểm và sửa nhận xét.</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{data.length} bài gần nhất</span>
    </div>

    <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
      <div className="overflow-x-auto">
        <table className="min-w-[860px] divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">Tên bài</th>
              <th className="px-4 py-3 font-black">Học viên</th>
              <th className="px-4 py-3 font-black">Điểm</th>
              <th className="px-4 py-3 font-black">Ngày chấm</th>
              <th className="px-4 py-3 font-black">Người chấm</th>
              <th className="px-4 py-3 text-right font-black">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-orange-50/50">
                <td className="px-4 py-4">
                  <p className="font-black text-slate-900">{item.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-slate-500">{item.comment}</p>
                </td>
                <td className="px-4 py-4 text-slate-700">{item.student}</td>
                <td className="px-4 py-4">
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">{item.score}</span>
                </td>
                <td className="px-4 py-4 text-slate-600">{item.gradedDate}</td>
                <td className="px-4 py-4 text-slate-600">{item.grader}</td>
                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => onReview?.(item)} className="inline-flex h-9 items-center gap-2 rounded-xl border border-gray-200 px-3 text-xs font-black text-slate-700 hover:bg-gray-50">
                      <Eye size={15} /> Xem lại
                    </button>
                    <button type="button" onClick={() => onEdit?.(item)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-orange-600 px-3 text-xs font-black text-white hover:bg-orange-700">
                      <Edit3 size={15} /> Sửa điểm
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
)
