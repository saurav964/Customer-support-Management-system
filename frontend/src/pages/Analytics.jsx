import { useQuery } from '@tanstack/react-query'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../api/axios'
import Layout from '../components/Layout'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.get('/analytics').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: agentData = {} } = useQuery({
    queryKey: ['agent-performance'],
    queryFn: () => api.get('/analytics/agents').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: satisfaction = {} } = useQuery({
    queryKey: ['satisfaction'],
    queryFn: () => api.get('/analytics/satisfaction').then(r => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <Layout><p className="text-slate-400">Loading...</p></Layout>

  const perDayData = data?.ticketsPerDay
    ? Object.entries(data.ticketsPerDay).map(([date, count]) => ({ date: date.slice(5), count }))
    : []

  const categoryData = data?.byCategory
    ? Object.entries(data.byCategory).map(([name, value]) => ({ name, value }))
    : []

  const agentPerformanceData = Object.entries(agentData).map(([name, stats]) => ({
    name, total: stats.total, resolved: stats.resolved
  }))

  const score = satisfaction?.score ?? 0
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-500' : 'text-red-600'

  return (
    <Layout>
      <div className="mb-5">
        <h2 className="text-xl font-bold text-slate-800">Analytics</h2>
        <p className="text-xs text-slate-400 mt-0.5">Support performance overview</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Avg Resolution Time</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{data?.avgResolutionHours ?? 'N/A'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Avg First Response</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{data?.avgFirstResponse ?? 'N/A'}</p>
          <p className="text-xs text-slate-400 mt-1">time to first agent reply</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Resolved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{data?.totalResolved ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">waiting to close</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Closed</p>
          <p className="text-3xl font-bold text-slate-500 mt-1">{data?.totalClosed ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">auto-closed after 24h</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Total Done</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{(data?.totalResolved ?? 0) + (data?.totalClosed ?? 0)}</p>
          <p className="text-xs text-slate-400 mt-1">resolved + closed</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">AI Handled</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{data?.aiHandled ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm text-slate-500">Human Handled</p>
          <p className="text-3xl font-bold text-orange-500 mt-1">{data?.humanHandled ?? 0}</p>
        </div>
        {/* Resolution-based satisfaction */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <p className="text-sm text-slate-500">Resolution Rate</p>
          <div className="flex items-end gap-2 mt-1">
            <p className={`text-3xl font-bold ${scoreColor}`}>{score}%</p>
            <p className="text-xs text-slate-400 mb-1">{satisfaction?.satisfied ?? 0} of {satisfaction?.total ?? 0} tickets resolved</p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
            <div className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
              style={{ width: `${score}%` }} />
          </div>
        </div>

        {/* Feature 4: CSAT star rating score */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 col-span-2">
          <p className="text-sm text-slate-500">CSAT Score (Customer Ratings)</p>
          <div className="flex items-end gap-2 mt-1">
            <p className={`text-3xl font-bold ${data?.avgCsatScore >= 4 ? 'text-green-600' : data?.avgCsatScore >= 3 ? 'text-amber-500' : 'text-red-600'}`}>
              {data?.avgCsatScore > 0 ? `${data.avgCsatScore} / 5` : 'No ratings yet'}
            </p>
            <p className="text-xs text-slate-400 mb-1">from {data?.csatCount ?? 0} responses</p>
          </div>
          {data?.avgCsatScore > 0 && (
            <p className="text-xl mt-1">{'⭐'.repeat(Math.round(data.avgCsatScore))}</p>
          )}
        </div>
      </div>

      {/* Tickets per day */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4">
        <p className="text-sm font-semibold text-slate-600 mb-4">Tickets Per Day (Last 7 Days)</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={perDayData}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Category breakdown */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-4">Tickets by Category</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* AI vs Human */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-4">AI vs Human Resolution</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: 'AI Handled', count: data?.aiHandled ?? 0 },
              { name: 'Human Handled', count: data?.humanHandled ?? 0 }
            ]}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature 5: Agent Performance */}
      {agentPerformanceData.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-sm font-semibold text-slate-600 mb-4">Agent Performance</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Agent</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Total Assigned</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Resolved</th>
                <th className="text-left px-4 py-2 text-slate-500 font-medium">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformanceData.map(agent => (
                <tr key={agent.name} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-700">{agent.name}</td>
                  <td className="px-4 py-3 text-slate-600">{agent.total}</td>
                  <td className="px-4 py-3 text-green-600 font-medium">{agent.resolved}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-slate-100 rounded-full h-1.5">
                        <div className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: agent.total > 0 ? `${(agent.resolved / agent.total) * 100}%` : '0%' }} />
                      </div>
                      <span className="text-xs text-slate-500">
                        {agent.total > 0 ? Math.round((agent.resolved / agent.total) * 100) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  )
}
