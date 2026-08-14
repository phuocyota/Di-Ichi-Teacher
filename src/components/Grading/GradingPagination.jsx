import { ChevronLeft, ChevronRight } from 'lucide-react'

export const pageSizeOptions = [10, 20, 30]

export const GradingPagination = ({ page, pageSize, totalItems, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const firstItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const lastItem = Math.min(totalItems, page * pageSize)

  return (
    <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center">
      <p className="text-sm font-semibold text-slate-500">
        Hiển thị {firstItem}-{lastItem} / {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-sm font-bold text-slate-600">
          Số dòng
          <select
            className="h-9 rounded-xl border border-gray-200 bg-white px-2 text-sm font-bold outline-none focus:border-orange-300 focus:ring-4 focus:ring-orange-100"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center gap-2">
          <button
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-gray-200 px-3 text-sm font-black text-slate-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            type="button"
          >
            <ChevronLeft size={16} />
            Trước
          </button>
          <span className="text-sm font-black text-slate-700">{page}/{totalPages}</span>
          <button
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-gray-200 px-3 text-sm font-black text-slate-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            type="button"
          >
            Sau
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
