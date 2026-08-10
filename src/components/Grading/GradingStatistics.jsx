import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { gradingStatisticsData } from '../../datas/gradingStatisticsData.js'

const ChartCard = ({ title, children }) => (
  <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-black text-slate-950">{title}</h2>
    <div className="mt-5 h-72">{children}</div>
  </section>
)

export const GradingStatistics = () => (
  <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {gradingStatisticsData.overview.map((item) => (
        <section key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-500">{item.label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
        </section>
      ))}
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <ChartCard title="Phân bố điểm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={gradingStatisticsData.scoreDistribution}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="range" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="count" name="Số bài" radius={[12, 12, 0, 0]} fill="#0f172a" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Điểm theo lớp">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={gradingStatisticsData.scoreByClass}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="className" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
            <Tooltip />
            <Line type="monotone" dataKey="score" name="Điểm TB" stroke="#ea580c" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>

    <ChartCard title="Điểm theo loại bài">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={gradingStatisticsData.scoreByType}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis dataKey="type" tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: '#f8fafc' }} />
          <Bar dataKey="score" name="Điểm TB" radius={[12, 12, 0, 0]} fill="#0284c7" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  </div>
)
