import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { Plus, Pencil, Trash2, X, Check, Search, ChevronDown, ChevronUp } from 'lucide-react'

const CATEGORIES = ['Billing', 'Account', 'Technical', 'Shipping', 'Returns', 'General']
const EMPTY_FORM = { title: '', content: '', category: 'General' }

export default function KnowledgeBase() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ['knowledge'],
    queryFn: () => api.get('/knowledge').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/knowledge', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['knowledge'] }); resetForm() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/knowledge/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['knowledge'] }); resetForm() },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/knowledge/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['knowledge'] }),
  })

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null); setShowForm(false) }

  const handleSubmit = e => {
    e.preventDefault()
    if (editingId) updateMutation.mutate({ id: editingId, data: form })
    else createMutation.mutate(form)
  }

  const startEdit = article => {
    setForm({ title: article.title, content: article.content, category: article.category ?? 'General' })
    setEditingId(article.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = useMemo(() => {
    return articles.filter(a => {
      const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase()) || a.content?.toLowerCase().includes(search.toLowerCase())
      const matchCategory = !categoryFilter || a.category === categoryFilter
      return matchSearch && matchCategory
    })
  }, [articles, search, categoryFilter])

  const CATEGORY_COLORS = {
    Billing: 'bg-yellow-100 text-yellow-700',
    Account: 'bg-purple-100 text-purple-700',
    Technical: 'bg-blue-100 text-blue-700',
    Shipping: 'bg-green-100 text-green-700',
    Returns: 'bg-orange-100 text-orange-700',
    General: 'bg-slate-100 text-slate-600',
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Knowledge Base</h2>
          <p className="text-xs text-slate-400 mt-0.5">{articles.length} articles — AI uses these to answer customers</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Add Article
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 p-5 mb-5 space-y-3">
          <p className="font-semibold text-slate-700">{editingId ? 'Edit Article' : 'New Article'}</p>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            placeholder="Title (e.g. How to reset your password)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            required
            rows={5}
            placeholder="Write the answer or solution here. AI will use this to help customers..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Check size={14} /> {editingId ? 'Update' : 'Save Article'}
            </button>
            <button type="button" onClick={resetForm} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search + category filter */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          {search || categoryFilter ? 'No articles found' : 'No articles yet. Add your first article!'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(article => (
            <div key={article.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{article.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[article.category] ?? 'bg-slate-100 text-slate-500'}`}>
                      {article.category ?? 'General'}
                    </span>
                  </div>
                  <p className={`text-sm text-slate-600 ${expandedId === article.id ? '' : 'line-clamp-2'}`}>
                    {article.content}
                  </p>
                  {article.content?.length > 120 && (
                    <button
                      onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                      className="flex items-center gap-1 text-xs text-blue-500 hover:underline mt-1"
                    >
                      {expandedId === article.id ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <button onClick={() => startEdit(article)} className="text-slate-400 hover:text-blue-500 transition">
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm('Delete this article?')) deleteMutation.mutate(article.id) }}
                    className="text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
