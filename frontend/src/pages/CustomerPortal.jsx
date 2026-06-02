import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

export default function CustomerPortal() {
  const [email, setEmail] = useState('')
  const [search, setSearch] = useState('')

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['portal-tickets', search],
    queryFn: () => fetch(`http://localhost:8080/api/portal/tickets?email=${encodeURIComponent(search)}`).then(r => r.json()),
    enabled: false,
  })

  const handleSearch = e => {
    e.preventDefault()
    setSearch(email)
    setTimeout(() => refetch(), 100)
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <div className="bg-blue-600 text-white py-10 text-center">
        <h1 className="text-3xl font-bold">Customer Support Portal</h1>
        <p className="text-blue-200 mt-2">Track your support tickets</p>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search */}
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

        {/* Results */}
        {isLoading && <p className="text-slate-400 text-center">Loading...</p>}
        {tickets.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{tickets.length} ticket(s) found for {search}</p>
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
                {ticket.aiResponse && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Support Reply:</p>
                    <p className="text-sm text-slate-700 line-clamp-3">{ticket.aiResponse}</p>
                  </div>
                )}
                {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                  <p className="text-xs text-green-600 mt-2 font-medium">✓ Your issue has been resolved</p>
                ) : (
                  <p className="text-xs text-amber-600 mt-2">Our team is working on your issue</p>
                )}
              </div>
            ))}
          </div>
        )}
        {search && tickets.length === 0 && !isLoading && (
          <p className="text-center text-slate-400">No tickets found for {search}</p>
        )}
      </div>
    </div>
  )
}
