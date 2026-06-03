import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Hash } from 'lucide-react'
import ChatWidget from './ChatWidget'

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

const STATUS_STEPS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

export default function CustomerPortal() {
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')
  const [ticketId, setTicketId] = useState('')
  const [trackId, setTrackId] = useState(null)
  const [mode, setMode] = useState('email') // email | track

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['portal-tickets', search],
    queryFn: () => fetch(`/api/portal/tickets?email=${encodeURIComponent(search)}`).then(r => r.json()),
    enabled: false,
  })

  const { data: trackedTicket, isLoading: trackLoading } = useQuery({
    queryKey: ['track-ticket', trackId],
    queryFn: () => fetch(`/api/portal/track/${trackId}`).then(r => r.json()),
    enabled: !!trackId,
  })

  const handleSearch = e => {
    e.preventDefault()
    setSearch(email)
    setTimeout(() => refetch(), 100)
  }

  const handleTrack = e => {
    e.preventDefault()
    setTrackId(ticketId)
  }

  const getStepIndex = status => STATUS_STEPS.indexOf(status)

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-blue-600 text-white py-10 text-center">
        <h1 className="text-3xl font-bold">Customer Support Portal</h1>
        <p className="text-blue-200 mt-2">Track your support tickets</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setMode('email')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'email' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Search by Email
          </button>
          <button onClick={() => setMode('track')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${mode === 'track' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
            Track by Ticket ID
          </button>
        </div>

        {/* Search by Email */}
        {mode === 'email' && (
          <>
            <form onSubmit={handleSearch} className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">Enter your email to view your tickets</p>
              <div className="flex gap-2">
                <input value={email} onChange={e => setEmail(e.target.value)}
                  type="email" required placeholder="your@email.com"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  <Search size={14} /> Find Tickets
                </button>
              </div>
            </form>
            {isLoading && <p className="text-slate-400 text-center">Loading...</p>}
            {tickets.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{tickets.length} ticket(s) found</p>
                {tickets.map(ticket => (
                  <div key={ticket.id} className="bg-white rounded-xl border border-slate-200 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-slate-800">{ticket.subject}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          #{ticket.id} · {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2">{ticket.body}</p>
                    {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
                      ? <p className="text-xs text-green-600 mt-2 font-medium">✓ Your issue has been resolved</p>
                      : <p className="text-xs text-amber-600 mt-2">Our team is working on your issue</p>}
                  </div>
                ))}
              </div>
            )}
            {search && tickets.length === 0 && !isLoading && (
              <p className="text-center text-slate-400">No tickets found</p>
            )}
          </>
        )}

        {/* Feature 8: Track by Ticket ID */}
        {mode === 'track' && (
          <>
            <form onSubmit={handleTrack} className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-3">Enter your ticket number to track status</p>
              <div className="flex gap-2">
                <input value={ticketId} onChange={e => setTicketId(e.target.value)}
                  type="number" required placeholder="e.g. 67"
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
                  <Hash size={14} /> Track
                </button>
              </div>
            </form>

            {trackLoading && <p className="text-slate-400 text-center">Loading...</p>}

            {trackedTicket && !trackedTicket.error && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-slate-800 text-lg">{trackedTicket.subject}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ticket #{trackedTicket.id} · {trackedTicket.category}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[trackedTicket.status]}`}>
                    {trackedTicket.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between mb-2">
                    {STATUS_STEPS.map((step, i) => (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= getStepIndex(trackedTicket.status) ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {i <= getStepIndex(trackedTicket.status) ? '✓' : i + 1}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{step.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                    <div className="bg-blue-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(getStepIndex(trackedTicket.status) / (STATUS_STEPS.length - 1)) * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-1 text-sm text-slate-600">
                  <p>Priority: <span className="font-medium">{trackedTicket.priority}</span></p>
                  <p>Created: <span className="font-medium">{trackedTicket.createdAt ? new Date(trackedTicket.createdAt).toLocaleString() : '—'}</span></p>
                  {trackedTicket.slaDeadline && (
                    <p>Response deadline: <span className="font-medium">{new Date(trackedTicket.slaDeadline).toLocaleString()}</span></p>
                  )}
                  {trackedTicket.resolvedAt && (
                    <p>Resolved: <span className="font-medium text-green-600">{new Date(trackedTicket.resolvedAt).toLocaleString()}</span></p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <ChatWidget />
    </div>
  )
}
