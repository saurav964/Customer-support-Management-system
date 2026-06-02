import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'

function StatCard({ label, value, color, pulse }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color} ${pulse ? 'animate-pulse' : ''}`}>{value}</p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: myTickets = [] } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.get('/tickets').then(r => r.data),
    enabled: !isAdmin,
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
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isAdmin ? 'Admin Dashboard' : `My Dashboard — ${user?.name}`}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isAdmin ? 'Overview of all tickets and agents' : 'Your assigned tickets overview'}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
          Live — refreshes every 30s
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard label={isAdmin ? "Total Tickets" : "My Total Tickets"} value={stats?.totalTickets ?? 0} color="text-slate-800" />
        <StatCard label="Open" value={stats?.openTickets ?? 0} color="text-amber-600" />
        <StatCard label="In Progress" value={stats?.byStatus?.IN_PROGRESS ?? 0} color="text-blue-600" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Resolved" value={stats?.resolvedTickets ?? 0} color="text-green-600" />
        <StatCard label="Closed" value={stats?.closedTickets ?? 0} color="text-slate-500" />
        <StatCard
          label="Overdue (2h+)"
          value={stats?.overdueTickets ?? 0}
          color={stats?.overdueTickets > 0 ? 'text-red-600' : 'text-slate-400'}
          pulse={stats?.overdueTickets > 0}
        />
      </div>

      {/* Charts — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
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
      )}

      {/* Agent: show their tickets list */}
      {!isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-700">My Assigned Tickets</p>
          </div>
          {myTickets.length === 0 ? (
            <p className="text-slate-400 text-sm p-5">No tickets assigned to you yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">#</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Subject</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Priority</th>
                  <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {myTickets.slice(0, 10).map(ticket => (
                  <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-400">{ticket.id}</td>
                    <td className="px-4 py-3">
                      <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline font-medium">
                        {ticket.subject}
                      </Link>
                    </td>
                    <td className={`px-4 py-3 font-medium ${ticket.priority === 'URGENT' ? 'text-red-600' : ticket.priority === 'HIGH' ? 'text-orange-500' : 'text-slate-500'}`}>
                      {ticket.priority}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        ticket.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        ticket.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-600'}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </Layout>
  )
}
