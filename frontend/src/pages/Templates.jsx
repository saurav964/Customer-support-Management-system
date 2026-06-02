import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { Plus, Trash2, X, Check, Search, Copy } from 'lucide-react'

const CATEGORIES = ['Billing', 'Account', 'Technical', 'Shipping', 'Returns', 'General']
const EMPTY_FORM = { title: '', content: '', category: 'General' }

const CATEGORY_COLORS = {
  Billing:   'bg-yellow-100 text-yellow-700',
  Account:   'bg-purple-100 text-purple-700',
  Technical: 'bg-blue-100 text-blue-700',
  Shipping:  'bg-green-100 text-green-700',
  Returns:   'bg-orange-100 text-orange-700',
  General:   'bg-slate-100 text-slate-600',
}

const DEFAULT_TEMPLATES = [
  { title: 'Refund Initiated', category: 'Billing', content: 'Your refund has been successfully initiated and will be credited to your account within 5-7 business days. We apologize for any inconvenience caused.\n\nBest regards,\nCustomer Support Team' },
  { title: 'Password Reset Steps', category: 'Account', content: 'To reset your password, please follow these steps:\n1. Go to the login page\n2. Click "Forgot Password"\n3. Enter your registered email address\n4. Check your inbox for the reset link (valid for 30 minutes)\n\nBest regards,\nCustomer Support Team' },
  { title: 'Order Dispatched', category: 'Shipping', content: 'Great news! Your order has been dispatched and is on its way. You can track your order using the tracking number sent to your email. Expected delivery is within 3-5 business days.\n\nBest regards,\nCustomer Support Team' },
  { title: 'Return Approved', category: 'Returns', content: 'Your return request has been approved. Please pack the item securely and drop it at the nearest courier center. Once we receive the item, your refund will be processed within 3-5 business days.\n\nBest regards,\nCustomer Support Team' },
  { title: 'Issue Under Investigation', category: 'Technical', content: 'We have received your complaint and our technical team is currently investigating the issue. We will update you within 24 hours with a resolution. We apologize for the inconvenience.\n\nBest regards,\nCustomer Support Team' },
]

export default function Templates() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [copied, setCopied] = useState(null)

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get('/templates').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/templates', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['templates'] }); setForm(EMPTY_FORM); setShowForm(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  })

  const addDefaultTemplates = async () => {
    for (const t of DEFAULT_TEMPLATES) {
      await api.post('/templates', t)
    }
    queryClient.invalidateQueries({ queryKey: ['templates'] })
  }

  const handleCopy = (content, id) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.content?.toLowerCase().includes(search.toLowerCase())
      const matchCat = !categoryFilter || t.category === categoryFilter
      return matchSearch && matchCat
    })
  }, [templates, search, categoryFilter])

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Canned Responses</h2>
          <p className="text-xs text-slate-400 mt-0.5">Pre-written replies agents can use with one click</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <button onClick={addDefaultTemplates}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Add Sample Templates
            </button>
          )}
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            <Plus size={14} /> Add Template
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}
          className="bg-white rounded-xl border border-blue-200 p-5 mb-5 space-y-3">
          <p className="font-semibold text-slate-700">New Canned Response</p>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required placeholder="Template name (e.g. Refund Reply)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            required rows={5} placeholder="Write the reply message here..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex gap-2">
            <button type="submit" disabled={createMutation.isPending}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg">
              <Check size={14} /> Save Template
            </button>
            <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search + filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-slate-400">Loading...</p> :
       filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          {templates.length === 0 ? (
            <div>
              <p className="mb-3">No templates yet.</p>
              <button onClick={addDefaultTemplates} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
                Add Sample Templates
              </button>
            </div>
          ) : 'No templates found'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{t.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category] ?? 'bg-slate-100 text-slate-500'}`}>
                    {t.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCopy(t.content, t.id)}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 transition">
                    <Copy size={13} />
                    {copied === t.id ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => { if (window.confirm('Delete this template?')) deleteMutation.mutate(t.id) }}
                    className="text-slate-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{t.content}</p>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
