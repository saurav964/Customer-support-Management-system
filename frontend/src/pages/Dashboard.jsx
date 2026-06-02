import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/axios'
import Layout from '../components/Layout'

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 30000,
  })

  if (isLoading) return <Layout><p className="text-slate-400">Loading...</p></Layout>

  const categoryData = stats?.byCategory
    ? Object.entries(stats.byCategory).map(([name, count]) => ({ name, count }))
    : []

  const statusData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([name, count]) => ({ name, count }))
    : []

  return (
    <Layout>
      <h2 className="text-xl font-bold text-slate-800 mb-5">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tickets" value={stats?.totalTickets ?? 0} color="text-slate-800" />
        <StatCard label="Open" value={stats?.openTickets ?? 0} color="text-amber-600" />
        <StatCard label="Resolved" value={stats?.resolvedTickets ?? 0} color="text-green-600" />
        <StatCard label="AI Resolved" value={stats?.aiResolvedTickets ?? 0} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-4">Tickets by Status</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-4">Tickets by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={categoryData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Layout>
  )
}
