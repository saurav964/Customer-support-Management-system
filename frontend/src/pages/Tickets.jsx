import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Download, Trash2, Search, CheckSquare, Square, Bookmark, X } from 'lucide-react'
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

const SENTIMENT_EMOJI = {
  ANGRY: '😡',
  FRUSTRATED: '😤',
  NEUTRAL: '😐',
  HAPPY: '😊',
  SATISFIED: '😄',
}

export default function Tickets() {
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [showSaveFilter, setShowSaveFilter] = useState(false)
  const [filterName, setFilterName] = useState('')
  const queryClient = useQueryClient()
  const prevCountRef = useRef(null)

  // Feature 8: Saved filters — personal named views
  const { data: savedFilters = [] } = useQuery({
    queryKey: ['saved-filters'],
    queryFn: () => api.get('/saved-filters').then(r => r.data),
  })

  const saveFilterMutation = useMutation({
    mutationFn: () => api.post('/saved-filters', {
      name: filterName,
      statusFilter: statusFilter || null,
      searchQuery: search || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] })
      setFilterName('')
      setShowSaveFilter(false)
    },
  })

  const deleteFilterMutation = useMutation({
    mutationFn: id => api.delete(`/saved-filters/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['saved-filters'] }),
  })

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
  }, [])

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () =>
      api.get('/tickets', { params: statusFilter ? { status: statusFilter } : {} }).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then(r => r.data),
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const deleteTicket = useMutation({
    mutationFn: (id) => api.delete(`/tickets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })

  const bulkMutation = useMutation({
    mutationFn: ({ action, value }) => {
      if (action === 'delete') return api.post('/tickets/bulk-delete', { ids: selected })
      if (action === 'assign') return api.post('/tickets/bulk-assign', { ids: selected, agentEmail: value })
      return api.post('/tickets/bulk-status', { ids: selected, status: action })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setSelected([])
      setBulkAction('')
    },
  })

  const handleExport = async () => {
    const response = await api.get('/tickets/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'tickets.csv')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (prevCountRef.current !== null && tickets.length > prevCountRef.current) {
      const newCount = tickets.length - prevCountRef.current
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880; gain.gain.value = 0.1
        osc.start(); osc.stop(ctx.currentTime + 0.2)
      } catch {}
      if (Notification.permission === 'granted') {
        new Notification('New Ticket!', { body: `${newCount} new ticket(s) arrived`, icon: '/favicon.svg' })
      }
    }
    prevCountRef.current = tickets.length
  }, [tickets.length])

  const filteredTickets = useMemo(() => {
    let result = tickets
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(t =>
        t.subject?.toLowerCase().includes(q) ||
        t.fromEmail?.toLowerCase().includes(q) ||
        t.fromName?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.tags?.toLowerCase().includes(q)
      )
    }
    // Feature 4: Priority inbox — URGENT always on top, then HIGH, then rest
    return [...result].sort((a, b) => {
      const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
      const aOpen = a.status === 'OPEN' || a.status === 'IN_PROGRESS'
      const bOpen = b.status === 'OPEN' || b.status === 'IN_PROGRESS'
      if (aOpen && !bOpen) return -1
      if (!aOpen && bOpen) return 1
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2)
    })
  }, [tickets, search])

  const overdueCount = tickets.filter(t => t.overdue && t.status === 'OPEN').length
  const urgentCount = tickets.filter(t => t.priority === 'URGENT' && (t.status === 'OPEN' || t.status === 'IN_PROGRESS')).length
  const allSelected = filteredTickets.length > 0 && filteredTickets.every(t => selected.includes(t.id))

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleAll = () => setSelected(allSelected ? [] : filteredTickets.map(t => t.id))

  return (
    <Layout>
      {/* Feature 4: Priority inbox — urgent alert banner */}
      {urgentCount > 0 && (
        <div className="mb-4 bg-red-50 border border-red-300 rounded-xl px-4 py-3 flex items-center gap-2">
          <span className="text-red-600 font-bold text-sm animate-pulse">🚨 {urgentCount} URGENT ticket{urgentCount > 1 ? 's' : ''} need immediate attention!</span>
          <span className="text-red-400 text-xs">Sorted to top automatically.</span>
        </div>
      )}

      {/* Feature 8: Saved Filters bar */}
      {savedFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-slate-400 font-medium">Saved views:</span>
          {savedFilters.map(f => (
            <div key={f.id} className="flex items-center gap-0.5">
              <button
                onClick={() => { setStatusFilter(f.statusFilter || ''); setSearch(f.searchQuery || '') }}
                className="text-xs bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-2.5 py-1 rounded-l-full border border-slate-200 transition">
                {f.name}
              </button>
              <button onClick={() => deleteFilterMutation.mutate(f.id)}
                className="text-xs bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 px-1.5 py-1 rounded-r-full border border-l-0 border-slate-200 transition">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-800">Tickets</h2>
          {overdueCount > 0 && (
            <span className="text-xs font-semibold bg-red-100 text-red-600 px-2.5 py-1 rounded-full animate-pulse">
              {overdueCount} Overdue
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-green-600">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block animate-pulse" />
            Live
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
          </div>
          <div className="relative">
            <button onClick={() => setShowSaveFilter(!showSaveFilter)}
              className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition">
              <Bookmark size={14} /> Save View
            </button>
            {showSaveFilter && (
              <div className="absolute right-0 top-10 z-10 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-48">
                <p className="text-xs font-medium text-slate-600 mb-2">Save current filters as:</p>
                <input value={filterName} onChange={e => setFilterName(e.target.value)}
                  placeholder="View name..."
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button onClick={() => saveFilterMutation.mutate()} disabled={!filterName.trim()}
                  className="w-full text-xs bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
                  Save
                </button>
              </div>
            )}
          </div>
          <button onClick={handleExport}
            className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition">
            <Download size={14} /> Export CSV
          </button>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
          <span className="text-sm font-medium text-blue-700">{selected.length} selected</span>
          <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
            className="text-sm border border-blue-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none">
            <option value="">Choose action...</option>
            <option value="RESOLVED">Mark Resolved</option>
            <option value="CLOSED">Mark Closed</option>
            <option value="OPEN">Mark Open</option>
            {agents.map(a => <option key={a.email} value={`assign:${a.email}`}>Assign to {a.name}</option>)}
            <option value="delete">Delete Selected</option>
          </select>
          <button
            onClick={() => {
              if (!bulkAction) return
              if (bulkAction === 'delete') { if (!window.confirm(`Delete ${selected.length} tickets?`)) return; bulkMutation.mutate({ action: 'delete' }) }
              else if (bulkAction.startsWith('assign:')) bulkMutation.mutate({ action: 'assign', value: bulkAction.split(':')[1] })
              else bulkMutation.mutate({ action: bulkAction })
            }}
            disabled={!bulkAction || bulkMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-1.5 rounded-lg disabled:opacity-50">
            Apply
          </button>
          <button onClick={() => setSelected([])} className="text-sm text-slate-500 hover:text-slate-700">Cancel</button>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          {search ? `No tickets found for "${search}"` : 'No tickets found'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">
                  <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                    {allSelected ? <CheckSquare size={15} /> : <Square size={15} />}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">#</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Subject</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">From</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Priority</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">AI Sent</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map(ticket => (
                <tr key={ticket.id}
                  className={`border-b border-slate-100 hover:bg-slate-50 transition ${ticket.overdue && ticket.status === 'OPEN' ? 'bg-red-50' : ''} ${selected.includes(ticket.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleSelect(ticket.id)} className="text-slate-400 hover:text-blue-500">
                      {selected.includes(ticket.id) ? <CheckSquare size={15} className="text-blue-500" /> : <Square size={15} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{ticket.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {ticket.sentiment && <span title={ticket.sentiment}>{SENTIMENT_EMOJI[ticket.sentiment]}</span>}
                      <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline font-medium">
                        {ticket.subject}
                      </Link>
                      {ticket.overdue && ticket.status === 'OPEN' && (
                        <span className="text-xs bg-red-100 text-red-600 font-semibold px-1.5 py-0.5 rounded">OVERDUE</span>
                      )}
                      {ticket.tags && ticket.tags.split(',').map(tag => (
                        <span key={tag} className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">#{tag.trim()}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ticket.fromEmail}</td>
                  <td className="px-4 py-3 text-slate-600">{ticket.category ?? '—'}</td>
                  <td className={`px-4 py-3 ${PRIORITY_COLORS[ticket.priority] ?? ''}`}>{ticket.priority}</td>
                  <td className="px-4 py-3">
                    <select value={ticket.status}
                      onChange={e => updateStatus.mutate({ id: ticket.id, status: e.target.value })}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[ticket.status]}`}>
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
                  <td className="px-4 py-3">
                    <button onClick={() => { if (window.confirm('Delete this ticket?')) deleteTicket.mutate(ticket.id) }}
                      className="text-slate-300 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
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
