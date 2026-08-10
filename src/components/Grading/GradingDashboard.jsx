import { AlertTriangle, CheckCircle2, Clock3, FileStack, Gauge } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gradingDashboardData } from '../../datas/gradingDashboardData.js'

const icons = [FileStack, CheckCircle2, Clock3, AlertTriangle, Gauge]
const tones = {
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  rose: 'bg-rose-50 text-rose-700 ring-rose-100',
  sky: 'bg-sky-50 text-sky-700 ring-sky-100',
}

export const GradingDashboard = () => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {gradingDashboardData.summaryCards.map((item, index) => {
        const Icon = icons[index]

        return (
          <section key={item.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
              </div>
              <span className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ${tones[item.tone]}`}>
                <Icon size={20} />
              </span>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-500">{item.change}</p>
          </section>
        )
      })}
    </div>

    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-black text-slate-950">Số bài đã chấm theo ngày</h2>
            <p className="text-sm text-slate-500">Theo dõi tốc độ xử lý bài nộp trong tuần.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">+14% tuần này</span>
        </div>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gradingDashboardData.gradedByDay}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="graded" name="Đã chấm" radius={[12, 12, 0, 0]} fill="#ea580c" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Hàng đợi ưu tiên</h2>
        <div className="mt-4 space-y-3">
          {gradingDashboardData.priorityQueue.map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-black text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{item.className}</p>
                </div>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700">{item.count}</span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-500">{item.due}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </div>
)
