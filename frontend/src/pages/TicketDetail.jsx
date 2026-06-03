import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { ArrowLeft, Send, Bot, RefreshCw, History, MessageSquare, Clock, FileText, Trash2, Printer, Bell, GitMerge, Users } from 'lucide-react'

const STATUS_COLORS = {
  OPEN: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
}

const AUDIT_COLORS = {
  TICKET_CREATED: 'bg-slate-400',
  STATUS_CHANGED: 'bg-blue-500',
  ASSIGNED: 'bg-purple-500',
  AI_RESPONDED: 'bg-cyan-500',
  AGENT_REPLIED: 'bg-green-500',
  TAGS_UPDATED: 'bg-yellow-500',
  PRIORITY_CHANGED: 'bg-orange-500',
  TICKET_MERGED: 'bg-pink-500',
  OVERDUE_MARKED: 'bg-red-500',
  FOLLOW_UP_SENT: 'bg-teal-500',
  SLA_WARNING: 'bg-rose-500',
  CATEGORY_CORRECTED: 'bg-indigo-500',
}

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [reply, setReply] = useState('')
  const [replySent, setReplySent] = useState(false)
  const [comment, setComment] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [tags, setTags] = useState('')
  const [tagsSaved, setTagsSaved] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [reminderNote, setReminderNote] = useState('')
  const [reminderAt, setReminderAt] = useState('')
  const [showReminderForm, setShowReminderForm] = useState(false)
  const presenceInterval = useRef(null)

  const { data: ticket, isLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get(`/tickets/${id}`).then(r => r.data),
  })

  // Feature 10: Collision detection — heartbeat every 5s so others see we're here quickly
  const { data: viewers = [] } = useQuery({
    queryKey: ['presence', id],
    queryFn: () => api.get(`/tickets/${id}/presence`).then(r => r.data),
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  })

  useEffect(() => {
    const beat = () => api.post(`/tickets/${id}/presence`).catch(() => {})
    beat()
    presenceInterval.current = setInterval(beat, 8000)
    return () => clearInterval(presenceInterval.current)
  }, [id])

  const aiMutation = useMutation({
    mutationFn: () => api.post(`/tickets/${id}/ai-respond`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then(r => r.data),
  })

  const assignMutation = useMutation({
    mutationFn: agentEmail => api.patch(`/tickets/${id}/assign`, { agentEmail }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const { data: history = [] } = useQuery({
    queryKey: ['customer-history', ticket?.fromEmail],
    queryFn: () => api.get('/tickets/customer', { params: { email: ticket.fromEmail } }).then(r => r.data),
    enabled: !!ticket?.fromEmail,
  })

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', id],
    queryFn: () => api.get(`/tickets/${id}/comments`).then(r => r.data),
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  // Feature 6: Related knowledge base articles based on ticket category
  const { data: relatedArticles = [] } = useQuery({
    queryKey: ['knowledge', ticket?.category],
    queryFn: () => api.get('/knowledge').then(r => {
      const matching = r.data.filter(a => a.category === ticket?.category)
      // Remove duplicate titles so the same article never shows twice
      const seen = new Set()
      const unique = matching.filter(a => {
        if (seen.has(a.title)) return false
        seen.add(a.title)
        return true
      })
      return unique.slice(0, 3)
    }),
    enabled: !!ticket?.category,
  })

  // Feature 2: Audit log — full history of who did what
  const { data: auditLog = [] } = useQuery({
    queryKey: ['audit-log', id],
    queryFn: () => api.get(`/tickets/${id}/audit-log`).then(r => r.data),
    refetchInterval: 30000,
  })

  // Feature 7: Reminders for this ticket
  const { data: reminders = [] } = useQuery({
    queryKey: ['reminders', id],
    queryFn: () => api.get(`/tickets/${id}/reminders`).then(r => r.data),
  })

  const replyMutation = useMutation({
    mutationFn: message => api.post(`/tickets/${id}/reply`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['audit-log', id] })
      setReplySent(true)
      setReply('')
    },
  })

  const commentMutation = useMutation({
    mutationFn: message => api.post(`/tickets/${id}/comments`, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] })
      setComment('')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: cid => api.delete(`/tickets/${id}/comments/${cid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', id] }),
  })

  const { data: duplicates = [] } = useQuery({
    queryKey: ['duplicates', id],
    queryFn: () => api.get(`/tickets/${id}/duplicates`).then(r => r.data),
    enabled: !!ticket,
  })

  const categoryMutation = useMutation({
    mutationFn: category => api.patch(`/tickets/${id}/category`, { category }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ticket', id] }),
  })

  const tagsMutation = useMutation({
    mutationFn: tags => api.patch(`/tickets/${id}/tags`, { tags }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] })
      setTagsSaved(true)
      setTimeout(() => setTagsSaved(false), 2000)
    },
  })

  // Feature 9: Merge duplicate ticket into this one
  const mergeMutation = useMutation({
    mutationFn: secondaryId => api.post(`/tickets/${id}/merge/${secondaryId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['duplicates', id] })
      queryClient.invalidateQueries({ queryKey: ['audit-log', id] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  // Feature 7: Create a follow-up reminder
  const reminderMutation = useMutation({
    mutationFn: ({ note, remindAt }) => api.post(`/tickets/${id}/reminders`, { note, remindAt }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders', id] })
      setReminderNote('')
      setReminderAt('')
      setShowReminderForm(false)
    },
  })

  const deleteReminderMutation = useMutation({
    mutationFn: rid => api.delete(`/reminders/${rid}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', id] }),
  })

  const handleSuggest = async () => {
    if (!reply.trim()) return
    setSuggesting(true)
    try {
      const res = await api.post(`/tickets/${id}/suggest-reply`, { draft: reply })
      setReply(res.data.suggestion)
    } finally { setSuggesting(false) }
  }

  const SENTIMENT_EMOJI = { ANGRY: '😡', FRUSTRATED: '😤', NEUTRAL: '😐', HAPPY: '😊', SATISFIED: '😄' }
  const PRIORITY_STYLES = {
    LOW: 'bg-slate-100 text-slate-600',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700 animate-pulse',
  }

  if (isLoading) return <Layout><p className="text-slate-400 p-4">Loading...</p></Layout>
  if (!ticket) return <Layout><p className="text-red-400 p-4">Ticket not found</p></Layout>

  const isClosedOrResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED'
  const slaExpired = ticket.slaDeadline && new Date(ticket.slaDeadline) < new Date()

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <button onClick={() => navigate('/tickets')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft size={14} /> Back to tickets
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50">
          <Printer size={14} /> Print
        </button>
      </div>

      {/* Feature 10: Collision warning — other agents viewing this ticket */}
      {viewers.length > 0 && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700">
          <Users size={14} />
          <span className="font-medium">Also viewing:</span>
          {viewers.map(v => (
            <span key={v.email} className="bg-amber-100 px-2 py-0.5 rounded-full text-xs font-semibold">{v.name}</span>
          ))}
          <span className="text-amber-500 text-xs ml-1">Be careful not to send duplicate replies.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* ── Left ── */}
        <div className="col-span-2 space-y-4">

          {/* Customer email */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">{ticket.subject}</h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  From: <span className="text-slate-600">{ticket.fromName}</span> &lt;{ticket.fromEmail}&gt;
                  {ticket.sentiment && <span className="ml-2" title={ticket.sentiment}>{SENTIMENT_EMOJI[ticket.sentiment]}</span>}
                </p>
                {ticket.slaDeadline && (
                  <p className={`text-xs mt-1 ${slaExpired ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                    SLA: {slaExpired ? '⚠️ BREACHED' : `Due by ${new Date(ticket.slaDeadline).toLocaleString()}`}
                  </p>
                )}
                {/* Feature 4: Show CSAT score if customer rated */}
                {ticket.csatScore != null && (
                  <p className="text-xs mt-1 text-amber-600 font-medium">
                    CSAT: {'⭐'.repeat(ticket.csatScore)} ({ticket.csatScore}/5)
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PRIORITY_STYLES[ticket.priority]}`}>
                  {ticket.priority}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-4 leading-relaxed">
              {ticket.body}
            </div>
          </div>

          {/* AI Response */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-slate-700">AI Response</span>
                {ticket.aiSent && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Sent to customer</span>}
              </div>
              {!isClosedOrResolved && (
                <button onClick={() => aiMutation.mutate()} disabled={aiMutation.isPending}
                  className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                  <RefreshCw size={13} className={aiMutation.isPending ? 'animate-spin' : ''} />
                  {aiMutation.isPending ? 'Generating...' : ticket.aiResponse ? 'Re-generate & Resend' : 'Generate AI Response'}
                </button>
              )}
            </div>
            {aiMutation.isError && (
              <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 mb-3">
                Failed: {aiMutation.error?.response?.data?.message || aiMutation.error?.message}
              </div>
            )}
            {ticket.aiResponse ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {ticket.aiResponse}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No AI response yet.</p>
            )}
          </div>

          {/* Manual Reply */}
          {!isClosedOrResolved && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-slate-700">Send Manual Reply</p>
                {templates.length > 0 && (
                  <button onClick={() => setShowTemplates(!showTemplates)}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <FileText size={12} /> Use Template
                  </button>
                )}
              </div>
              {showTemplates && (
                <div className="mb-3 border border-slate-200 rounded-lg overflow-hidden">
                  {templates.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3">No templates yet. Add them in the Templates page.</p>
                  ) : templates.map(t => (
                    <div key={t.id} className="border-b border-slate-100 last:border-0">
                      <button onClick={() => { setReply(t.content); setShowTemplates(false) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-700">{t.title}</span>
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{t.category}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{t.content}</p>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {replySent && (
                <div className="text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2 mb-3">
                  Reply sent!
                </div>
              )}
              {ticket.aiResponse && (
                <button type="button" onClick={() => setReply(ticket.aiResponse)}
                  className="text-xs text-blue-600 hover:underline mb-2 block">
                  Use AI response as template
                </button>
              )}
              <textarea value={reply} onChange={e => setReply(e.target.value)} rows={5}
                placeholder="Type your reply... Use @name to mention a colleague in internal notes"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="flex justify-between mt-2">
                <button onClick={handleSuggest} disabled={!reply.trim() || suggesting}
                  className="flex items-center gap-1.5 text-sm border border-purple-300 text-purple-600 hover:bg-purple-50 px-3 py-2 rounded-lg disabled:opacity-50">
                  {suggesting ? 'Improving...' : '✨ AI Improve'}
                </button>
                <button onClick={() => replyMutation.mutate(reply)}
                  disabled={!reply.trim() || replyMutation.isPending}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:opacity-50">
                  <Send size={13} />
                  {replyMutation.isPending ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          )}

          {/* Internal Comments — Feature 6: @mention support */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={15} className="text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Internal Notes</p>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Only agents see this</span>
              <span className="text-xs text-slate-400">Use @name to notify a colleague</span>
            </div>
            <div className="space-y-3 mb-3">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-400 italic">No internal notes yet.</p>
              ) : comments.map(c => (
                <div key={c.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-yellow-700">{c.agentName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}</span>
                      {c.agentEmail === user?.email && (
                        <button onClick={() => deleteCommentMutation.mutate(c.id)} className="text-slate-300 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-700">
                    {c.message.split(/(@\w+)/g).map((part, i) =>
                      part.startsWith('@')
                        ? <span key={i} className="text-blue-600 font-medium">{part}</span>
                        : part
                    )}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Add an internal note... @mention a colleague"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
              <button onClick={() => commentMutation.mutate(comment)} disabled={!comment.trim()}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        </div>

        {/* ── Right ── */}
        <div className="space-y-4">
          {/* Ticket Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ticket Info</p>
            <InfoRow label="Status" value={ticket.status.replace('_', ' ')} />
            <InfoRow label="Priority" value={ticket.priority} />
            <div>
              <p className="text-xs text-slate-400">Category</p>
              {isClosedOrResolved ? (
                <p className="text-sm font-medium text-slate-700">{ticket.category ?? '—'}</p>
              ) : (
                <select value={ticket.category ?? ''} onChange={e => categoryMutation.mutate(e.target.value)}
                  className="mt-0.5 w-full text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select category</option>
                  {['Billing','Account','Technical','Shipping','Returns','General'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <p className="text-xs text-slate-400">Assigned To</p>
              {isClosedOrResolved ? (
                <p className="text-sm font-medium text-slate-700">{ticket.assignedTo ?? 'Unassigned'}</p>
              ) : (
                <select value={ticket.assignedTo ?? ''} onChange={e => assignMutation.mutate(e.target.value)}
                  className="mt-0.5 w-full text-sm border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
                </select>
              )}
            </div>
            <InfoRow label="AI Sent" value={ticket.aiSent ? 'Yes' : 'No'} />
            {/* Feature 3: First response time */}
            {ticket.firstResponseAt && (
              <InfoRow label="First Response" value={new Date(ticket.firstResponseAt).toLocaleString()} />
            )}
            {/* Feature 4: CSAT */}
            {ticket.csatScore != null && (
              <InfoRow label="CSAT Rating" value={`${'⭐'.repeat(ticket.csatScore)} (${ticket.csatScore}/5)`} />
            )}
            {ticket.csatSent && !ticket.csatScore && (
              <p className="text-xs text-slate-400">CSAT survey sent, awaiting response</p>
            )}
            <div>
              <p className="text-xs text-slate-400">Tags</p>
              <div className="flex gap-1 flex-wrap mt-0.5 mb-1">
                {ticket.tags && ticket.tags.split(',').map(tag => (
                  <span key={tag} className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">#{tag.trim()}</span>
                ))}
              </div>
              {!isClosedOrResolved && (
                <div className="flex gap-1">
                  <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tag1, tag2"
                    className="flex-1 text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400" />
                  <button onClick={() => tagsMutation.mutate(tags)}
                    className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600">
                    {tagsSaved ? '✓' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            <InfoRow label="Created" value={ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'} />
            {ticket.resolvedAt && <InfoRow label="Resolved" value={new Date(ticket.resolvedAt).toLocaleString()} />}
            {ticket.mergedIntoId && (
              <div>
                <p className="text-xs text-slate-400">Merged Into</p>
                <Link to={`/tickets/${ticket.mergedIntoId}`} className="text-sm text-blue-600 hover:underline">
                  Ticket #{ticket.mergedIntoId}
                </Link>
              </div>
            )}
          </div>

          {/* Feature 7: Follow-up reminders */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-slate-500" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reminders</p>
              </div>
              <button onClick={() => setShowReminderForm(!showReminderForm)}
                className="text-xs text-blue-600 hover:underline">
                + Add
              </button>
            </div>
            {showReminderForm && (
              <div className="mb-3 space-y-2">
                <input value={reminderNote} onChange={e => setReminderNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <input type="datetime-local" value={reminderAt} onChange={e => setReminderAt(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                <button
                  onClick={() => reminderMutation.mutate({ note: reminderNote, remindAt: reminderAt })}
                  disabled={!reminderAt}
                  className="w-full text-xs bg-blue-600 text-white py-1.5 rounded hover:bg-blue-700 disabled:opacity-50">
                  Set Reminder
                </button>
              </div>
            )}
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No reminders set.</p>
            ) : reminders.map(r => (
              <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-xs font-medium text-slate-700">{new Date(r.remindAt).toLocaleString()}</p>
                  {r.note && <p className="text-xs text-slate-400">{r.note}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {r.sent && <span className="text-xs text-green-600">Sent</span>}
                  <button onClick={() => deleteReminderMutation.mutate(r.id)} className="text-slate-300 hover:text-red-500">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Feature 2: Audit Log timeline */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-slate-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Activity Log</p>
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {auditLog.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No activity yet.</p>
              ) : auditLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${AUDIT_COLORS[entry.action] ?? 'bg-slate-400'}`} />
                  <div>
                    <p className="text-xs font-medium text-slate-700">{entry.details}</p>
                    <p className="text-xs text-slate-400">
                      {entry.performedBy} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 9: Duplicate tickets with Merge button */}
          {duplicates.length > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-4">
              <p className="text-xs font-semibold text-orange-600 mb-2">⚠️ Possible Duplicates ({duplicates.length})</p>
              <div className="space-y-2">
                {duplicates.map(d => (
                  <div key={d.id} className="flex items-center justify-between gap-2">
                    <Link to={`/tickets/${d.id}`}
                      className="text-xs text-orange-700 hover:underline truncate flex-1">
                      #{d.id} — {d.subject}
                    </Link>
                    <button
                      onClick={() => { if (window.confirm(`Merge ticket #${d.id} into this one? It will be closed.`)) mergeMutation.mutate(d.id) }}
                      disabled={mergeMutation.isPending}
                      className="flex items-center gap-1 text-xs bg-orange-500 text-white px-2 py-0.5 rounded hover:bg-orange-600 disabled:opacity-50 shrink-0">
                      <GitMerge size={10} /> Merge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feature 6: Related Knowledge Base Articles */}
          {relatedArticles.length > 0 && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                📚 Related Articles ({ticket?.category})
              </p>
              <div className="space-y-2">
                {relatedArticles.map(a => (
                  <div key={a.id} className="bg-white rounded-lg border border-blue-100 p-2">
                    <p className="text-xs font-medium text-slate-700">{a.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{a.content?.slice(0, 80)}...</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer History */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-slate-500" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Customer History ({history.length})
              </p>
            </div>
            {history.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No previous tickets</p>
            ) : (
              <div className="space-y-2">
                {history.map(t => (
                  <Link key={t.id} to={`/tickets/${t.id}`}
                    className={`block text-xs p-2 rounded-lg border transition hover:bg-slate-50 ${t.id === ticket.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-slate-700 truncate">{t.subject}</span>
                      <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-semibold
                        ${t.status === 'OPEN' ? 'bg-amber-100 text-amber-700' :
                          t.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                          'bg-slate-100 text-slate-500'}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-400 mt-0.5">{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '—'}</p>
                  </Link>
                ))}
              </div>
            )}
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
