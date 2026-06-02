import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { ArrowLeft, Send, Bot, RefreshCw } from 'lucide-react'

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [reply, setReply] = useState('')
  const [replySent, setReplySent] = useState(false)

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data),
  })

  // Trigger AI response
  const aiMutation = useMutation({
    mutationFn: () => api.post(`/tickets/${id}/ai-respond`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  // Human reply
  const replyMutation = useMutation({
    mutationFn: message => api.post(`/tickets/${id}/reply`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setReplySent(true)
      setReply('')
    },
  })

  if (isLoading) return <Layout><p className="text-slate-400 p-4">Loading...</p></Layout>
  if (!ticket) return <Layout><p className="text-red-400 p-4">Ticket not found</p></Layout>

  const isClosedOrResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'

  return (
    <Layout>
      <button
        onClick={() => navigate('/tickets')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-5"
      >
        <ArrowLeft size={14} /> Back to tickets
      </button>

      <div className="grid grid-cols-3 gap-4">

        {/* ── Left: ticket + AI + reply ── */}
        <div className="col-span-2 space-y-4">

          {/* Customer email */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{ticket.subject}</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  From: <span className="text-slate-600">{ticket.fromName}</span>{' '}
                  &lt;{ticket.fromEmail}&gt;
                </p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                {ticket.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 leading-relaxed">
              {ticket.body}
            </div>
          </div>

          {/* ── AI Response Section ── */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-slate-700">AI Response</span>
                {ticket.aiSent && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Sent to customer
                  </span>
                )}
              </div>

              {/* Generate / Re-generate button */}
              {!isClosedOrResolved && (
                <button
                  onClick={() => aiMutation.mutate()}
                  disabled={aiMutation.isPending}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw size={13} className={aiMutation.isPending ? 'animate-spin' : ''} />
                  {aiMutation.isPending
                    ? 'Generating...'
                    : ticket.aiResponse
                    ? 'Re-generate & Resend'
                    : 'Generate AI Response'}
                </button>
              )}
            </div>

            {aiMutation.isError && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">
                Failed (status {aiMutation.error?.response?.status}): {aiMutation.error?.response?.data?.message || aiMutation.error?.message || 'Unknown error'}
              </div>
            )}

            {ticket.aiResponse ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {ticket.aiResponse}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No AI response yet. Click "Generate AI Response" to have Claude reply to this customer automatically.
              </p>
            )}
          </div>

          {/* ── Human Reply ── */}
          {!isClosedOrResolved && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm font-semibold text-slate-700 mb-3">Send Manual Reply</p>

              {replySent && (
                <div className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2 mb-3">
                  Reply sent! Ticket will resolve when customer confirms.
                </div>
              )}

              {ticket.aiResponse && (
                <button
                  type="button"
                  onClick={() => setReply(ticket.aiResponse)}
                  className="text-xs text-blue-600 hover:underline mb-2 block"
                >
                  Use AI response as template
                </button>
              )}

              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                rows={5}
                placeholder="Type your reply to the customer..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => replyMutation.mutate(reply)}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Send size={13} />
                  {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: ticket info ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket Info</p>
            <InfoRow label="Status"     value={ticket.status.replace('_', ' ')} />
            <InfoRow label="Priority"   value={ticket.priority} />
            <InfoRow label="Category"   value={ticket.category ?? '—'} />
            <InfoRow label="Assigned To" value={ticket.assignedTo ?? 'Unassigned'} />
            <InfoRow label="AI Sent"    value={ticket.aiSent ? 'Yes' : 'No'} />
            <InfoRow label="Created"    value={new Date(ticket.createdAt).toLocaleString()} />
            {ticket.resolvedAt && (
              <InfoRow label="Resolved" value={new Date(ticket.resolvedAt).toLocaleString()} />
            )}
          </div>

          {/* How AI works note */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">How AI Response Works</p>
            <ol className="text-xs text-slate-500 space-y-1 list-decimal list-inside">
              <li>Claude reads the customer email</li>
              <li>Searches your Knowledge Base</li>
              <li>Writes a professional reply</li>
              <li>Sends it directly to the customer</li>
            </ol>
          </div>
        </div>

      </div>
    </Layout>
  )
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  )
}
