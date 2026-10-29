import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronRight, Headphones, LogOut } from 'lucide-react'
import logo from '../../assets/logo/LOGO_Diichi.webp'
import { cn } from '../../utils/cn.js'
import { menuItems } from './menu.js'
import { clearAuthSession } from '../../services/authSession.js'
import { usePortal } from '../../portal/portalStore.js'

export const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate()
  const { data } = usePortal()
  const today = new Date().toLocaleDateString('en-CA')
  const todayClasses = data.schedules.filter(s => new Date(s.startAt).toLocaleDateString('en-CA') === today && s.status !== 'cancelled').length

  const handleLogout = () => {
    clearAuthSession()
    onClose()
    toast.success('Đăng xuất thành công', {
      description: 'Bạn đã quay về màn hình đăng nhập.',
    })
    navigate('/login')
  }

  return (
    <>
      <button
        className={cn('fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm transition lg:hidden', open ? 'opacity-100' : 'pointer-events-none opacity-0')}
        onClick={onClose}
        aria-label="Đóng menu"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-orange-100 bg-white shadow-2xl shadow-orange-950/10 transition lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="relative border-b border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-5">
          <div className="absolute right-4 top-4 rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-orange-700">
            Teacher
          </div>
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-3xl bg-white shadow-sm ring-1 ring-orange-100">
              <img className="h-11 w-11 object-contain" src={logo} alt="Di-Ichi" />
            </div>
            <div>
              <p className="text-xl font-black leading-tight text-slate-950">Di-Ichi</p>
              <p className="text-xs font-bold text-orange-600">Teacher Portal</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-orange-100 bg-white/80 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Hôm nay</p>
            <p className="mt-1 text-sm font-black text-slate-900">{todayClasses} buổi học · {data.students.length} học sinh</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group relative flex min-h-12 items-center gap-3 rounded-2xl px-3 text-sm font-bold transition',
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-200'
                      : 'text-slate-600 hover:bg-orange-50 hover:text-orange-700',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={cn('grid h-9 w-9 place-items-center rounded-xl transition', isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-orange-600')}>
                      <Icon size={18} />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.badge && (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-black', isActive ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700')}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight size={16} className="shrink-0 text-white/90" />}
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>

        <div className="border-t border-orange-100 p-3">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-100 text-orange-700">
                <Headphones size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-slate-900">Hỗ trợ giáo viên</p>
                <p className="truncate text-xs text-slate-500">Academic Office</p>
              </div>
            </div>
          </div>
          <button
            className="mt-3 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 px-3 text-sm font-black text-white shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:from-orange-700 hover:to-amber-600 hover:shadow-xl active:translate-y-0"
            onClick={handleLogout}
            type="button"
          >
            <span className="inline-flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                <LogOut size={18} />
              </span>
              Đăng xuất
            </span>
            <span className="h-2 w-2 rounded-full bg-white/80" />
          </button>
        </div>
      </aside>
    </>
  )
}
