import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Layout from '../components/Layout'

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

const PRIORITY_COLORS = {
  LOW: 'text-slate-400',
  MEDIUM: 'text-blue-500',
  HIGH: 'text-orange-500',
  URGENT: 'text-red-600 font-bold',
}

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () =>
      api.get('/tickets', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
    refetchInterval: 30000,
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">Tickets</h2>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          No tickets found
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">#</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Subject</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">From</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">AI Sent</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="px-4 py-3 text-slate-400">{ticket.id}</td>
                  <td className="px-4 py-3">
                    <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline font-medium">
                      {ticket.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ticket.fromEmail}</td>
                  <td className="px-4 py-3 text-slate-600">{ticket.category ?? '—'}</td>
                  <td className={`px-4 py-3 ${PRIORITY_COLORS[ticket.priority] ?? ''}`}>
                    {ticket.priority}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={ticket.status}
                      onChange={e => updateStatus.mutate({ id: ticket.id, status: e.target.value })}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[ticket.status]}`}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs ${ticket.aiSent ? 'text-green-600' : 'text-slate-400'}`}>
                      {ticket.aiSent ? '✓ Yes' : 'No'}
                    </span>
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
