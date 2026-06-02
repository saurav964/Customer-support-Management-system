import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react'

const EMPTY_FORM = { title: '', content: '', category: '' }

export default function KnowledgeBase() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [showForm, setShowForm] = useState(false)

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
    setForm({ title: article.title, content: article.content, category: article.category ?? '' })
    setEditingId(article.id)
    setShowForm(true)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-slate-800">Knowledge Base</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setForm(EMPTY_FORM) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Add Article
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 mb-5 space-y-3">
          <p className="font-medium text-slate-700">{editingId ? 'Edit Article' : 'New Article'}</p>
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            required
            placeholder="Title"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            placeholder="Category (e.g. Billing, Technical)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            required
            rows={5}
            placeholder="Article content..."
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Check size={14} /> Save
            </button>
            <button type="button" onClick={resetForm} className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <div key={article.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-slate-800">{article.title}</h3>
                    {article.category && (
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {article.category}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3">{article.content}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => startEdit(article)} className="text-slate-400 hover:text-blue-500 transition">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteMutation.mutate(article.id)} className="text-slate-400 hover:text-red-500 transition">
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
