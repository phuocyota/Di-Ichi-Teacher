import { Bell, Menu, Search } from 'lucide-react'
import { teacher } from '../../datas/portalData.js'
import { getAuthSession } from '../../services/authSession.js'
import { LanguageSwitcher } from '../Common/LanguageSwitcher.jsx'

export const Header = ({ onMenu }) => {
  const session = getAuthSession()
  const teacherName = session?.fullName || teacher.name

  return (
  <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/85 px-4 py-3 shadow-sm shadow-orange-950/5 backdrop-blur-xl lg:px-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <button
          className="group relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-200 ring-1 ring-orange-300 transition hover:-translate-y-0.5 hover:from-orange-700 hover:to-amber-600 hover:shadow-xl active:translate-y-0 lg:hidden"
          onClick={onMenu}
          type="button"
          aria-label="Mở menu"
        >
          <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white ring-2 ring-orange-500" />
          <Menu size={23} strokeWidth={2.6} />
        </button>

        <div className="hidden lg:block">
          <p className="text-xs font-black uppercase tracking-wide text-orange-600">Di-Ichi Teacher</p>
          <h1 className="text-xl font-black text-slate-950">Chào mừng quay lại, {teacherName}</h1>
        </div>

        <label className="relative hidden w-full max-w-xl md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" size={18} />
          <input
            className="h-12 w-full rounded-2xl border border-orange-100 bg-orange-50/70 pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100"
            placeholder="Tìm lớp học, học viên, bài tập, đề thi..."
          />
        </label>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher compact />

        <button className="relative grid h-11 w-11 place-items-center rounded-2xl border border-orange-100 bg-white text-slate-600 shadow-sm transition hover:bg-orange-50 hover:text-orange-700" aria-label="Thông báo">
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
        </button>

        <button className="flex min-h-12 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-2 py-1.5 shadow-sm transition hover:bg-orange-50">
          <img className="h-9 w-9 rounded-xl object-cover ring-2 ring-orange-100" src={teacher.avatar} alt={teacherName} />
          <div className="hidden max-w-40 text-left sm:block">
            <p className="truncate text-sm font-black text-slate-900">{teacherName}</p>
            <p className="truncate text-xs font-medium text-slate-500">{teacher.role}</p>
          </div>
        </button>
      </div>
    </div>
  </header>
  )
}
