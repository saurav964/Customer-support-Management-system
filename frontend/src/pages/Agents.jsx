import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { Plus, Trash2, X, Check, Users } from 'lucide-react'

const EMPTY_FORM = { name: '', email: '', password: 'agent123' }

export default function Agents() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/agents', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] })
      setForm(EMPTY_FORM)
      setShowForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/agents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  // Feature 2: Update agent skills for smart auto-assignment
  const skillsMutation = useMutation({
    mutationFn: ({ id, skills }) => api.patch(`/agents/${id}/skills`, { skills }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents'] }),
  })

  const CATEGORIES = ['Billing', 'Account', 'Technical', 'Shipping', 'Returns', 'General']

  const toggleSkill = (agent, category) => {
    const current = agent.skills ? agent.skills.split(',').map(s => s.trim()).filter(Boolean) : []
    const updated = current.includes(category)
      ? current.filter(s => s !== category)
      : [...current, category]
    skillsMutation.mutate({ id: agent.id, skills: updated.join(',') })
  }

  const handleSubmit = e => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Agents</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage your support team</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Plus size={14} /> Add Agent
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-blue-200 p-5 mb-5 space-y-3">
          <p className="font-semibold text-slate-700">New Agent</p>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            placeholder="Full Name (e.g. Ravi Sharma)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
            type="email"
            placeholder="Email (e.g. ravi@support.com)"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
            placeholder="Password"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {createMutation.isError && (
            <p className="text-red-500 text-sm">{createMutation.error?.response?.data?.message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg"
            >
              <Check size={14} /> Add Agent
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50"
            >
              <X size={14} /> Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="text-slate-400">Loading...</p>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <Users size={32} className="mx-auto mb-2 opacity-30" />
          <p>No agents yet. Add your first agent!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Skills (click to toggle)</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{agent.name}</td>
                  <td className="px-4 py-3 text-slate-500">{agent.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {CATEGORIES.map(cat => {
                        const has = agent.skills?.split(',').map(s => s.trim()).includes(cat)
                        return (
                          <button key={cat} onClick={() => toggleSkill(agent, cat)}
                            className={`text-xs px-2 py-0.5 rounded-full border transition ${has
                              ? 'bg-green-100 text-green-700 border-green-300 font-medium'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                            {cat}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete agent ${agent.name}?`)) {
                          deleteMutation.mutate(agent.id)
                        }
                      }}
                      className="text-slate-300 hover:text-red-500 transition"
                    >
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
