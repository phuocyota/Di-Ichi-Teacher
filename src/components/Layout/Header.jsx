import React from 'react'
import { Bell, Menu } from 'lucide-react'
import { usePortal } from '../../portal/portalStore.js'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../Common/LanguageSwitcher.jsx'

export const Header = ({ onMenu }) => {
  const { data } = usePortal()
  const teacherName = data.profile.name

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

      </div>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher compact />

        <Link to="/dashboard" className="relative grid h-11 w-11 place-items-center rounded-2xl border border-orange-100 bg-white text-slate-600 shadow-sm transition hover:bg-orange-50 hover:text-orange-700" aria-label="Thông báo">
          <Bell size={19} />
          {data.notifications.some(n => !n.readAt) && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-orange-500 ring-2 ring-white" />}
        </Link>

        <Link to="/ho-so-ca-nhan" className="flex min-h-12 items-center gap-3 rounded-2xl border border-orange-100 bg-white px-2 py-1.5 shadow-sm transition hover:bg-orange-50">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100">{teacherName?.slice(0, 1)}</span>
          <div className="hidden max-w-40 text-left sm:block">
            <p className="truncate text-sm font-black text-slate-900">{teacherName}</p>
            <p className="truncate text-xs font-medium text-slate-500">Giáo viên</p>
          </div>
        </Link>
      </div>
    </div>
  </header>
  )
}
