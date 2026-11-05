import { Link } from '../../routes/localizedRouter.jsx'
import { ArrowRight, CalendarDays, FileCheck2, NotebookPen } from 'lucide-react'
import { dashboardStats } from '../../datas/portalData.js'

const cardStyles = [
  {
    href: '/lich-giang-day',
    icon: CalendarDays,
    gradient: 'from-orange-200 via-amber-100 to-yellow-100',
    glow: 'shadow-orange-100',
    chip: 'bg-white/70 text-orange-700 ring-orange-200',
    text: 'text-orange-950',
    muted: 'text-orange-800/75',
    arrow: 'bg-orange-600 text-white',
  },
  {
    href: '/cham-diem',
    icon: NotebookPen,
    gradient: 'from-amber-200 via-orange-100 to-red-100',
    glow: 'shadow-amber-100',
    chip: 'bg-white/70 text-amber-700 ring-amber-200',
    text: 'text-amber-950',
    muted: 'text-amber-800/75',
    arrow: 'bg-amber-600 text-white',
  },
  {
    href: '/cham-diem',
    icon: FileCheck2,
    gradient: 'from-rose-200 via-orange-100 to-amber-100',
    glow: 'shadow-rose-100',
    chip: 'bg-white/70 text-rose-700 ring-rose-200',
    text: 'text-rose-950',
    muted: 'text-rose-800/75',
    arrow: 'bg-rose-600 text-white',
  },
]

export const DashboardOverview = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {dashboardStats.map((item, index) => {
      const style = cardStyles[index]
      const Icon = style.icon

      return (
        <Link
          key={item.label}
          to={style.href}
          className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br ${style.gradient} p-5 shadow-lg ${style.glow} transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
        >
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/30" />
          <div className="absolute -bottom-10 left-6 h-24 w-24 rounded-full bg-white/25" />

          <div className="relative flex items-start justify-between gap-4">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white/70 ring-1 ring-white/80 ${style.text}`}>
              <Icon size={24} />
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${style.chip}`}>
              {item.note}
            </span>
          </div>

          <div className="relative mt-6">
            <p className={`text-sm font-bold ${style.muted}`}>{item.label}</p>
            <p className={`mt-2 text-4xl font-black tracking-tight ${style.text}`}>{item.value}</p>
          </div>

          <div className="relative mt-5 flex items-center justify-between border-t border-white/50 pt-4">
            <span className={`text-sm font-black ${style.text}`}>Xem chi tiết</span>
            <span className={`grid h-9 w-9 place-items-center rounded-full transition group-hover:translate-x-1 ${style.arrow}`}>
              <ArrowRight size={18} />
            </span>
          </div>
        </Link>
      )
    })}
  </div>
)
