import { BarChart3, CheckCircle2, ClipboardCheck, FileSearch } from 'lucide-react'
import { cn } from '../../utils/cn.js'

const tabs = [
  { id: 'queue', label: 'Bài cần chấm', icon: ClipboardCheck },
  { id: 'detail', label: 'Chi tiết chấm bài', icon: FileSearch },
  { id: 'history', label: 'Đã chấm', icon: CheckCircle2 },
  { id: 'statistics', label: 'Thống kê', icon: BarChart3 },
]

export const GradingTabs = ({ activeTab, onChange }) => (
  <div className="overflow-x-auto rounded-2xl border border-orange-100 bg-white p-2 shadow-sm">
    <div className="flex min-w-max gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = activeTab === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold transition',
              active ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-500 hover:bg-orange-50 hover:text-orange-700',
            )}
          >
            <Icon size={17} />
            {tab.label}
          </button>
        )
      })}
    </div>
  </div>
)
