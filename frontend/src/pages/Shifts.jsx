import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { Plus, Trash2, Clock } from 'lucide-react'

const SHIFTS = ['Morning (9AM-5PM)', 'Evening (5PM-1AM)', 'Night (1AM-9AM)']
const EMPTY = { agentEmail: '', agentName: '', shiftName: 'Morning (9AM-5PM)', startTime: '09:00', endTime: '17:00' }

export default function Shifts() {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts'],
    queryFn: () => api.get('/shifts').then(r => r.data),
  })

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.get('/agents').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: data => api.post('/shifts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shifts'] }); setShowForm(false); setForm(EMPTY) },
  })

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/shifts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const handleAgentChange = email => {
    const agent = agents.find(a => a.email === email)
    setForm(f => ({ ...f, agentEmail: email, agentName: agent?.name ?? '' }))
  }

  const SHIFT_COLORS = {
    'Morning (9AM-5PM)': 'bg-yellow-100 text-yellow-700',
    'Evening (5PM-1AM)': 'bg-blue-100 text-blue-700',
    'Night (1AM-9AM)': 'bg-slate-100 text-slate-600',
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Shift Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">Assign agents to work shifts</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          <Plus size={14} /> Add Shift
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5 space-y-3">
          <p className="font-semibold text-slate-700">Assign Shift</p>
          <select value={form.agentEmail} onChange={e => handleAgentChange(e.target.value)} required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select Agent</option>
            {agents.map(a => <option key={a.email} value={a.email}>{a.name}</option>)}
          </select>
          <select value={form.shiftName} onChange={e => setForm(f => ({ ...f, shiftName: e.target.value }))}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Start Time</label>
              <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">End Time</label>
              <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(form)} disabled={!form.agentEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
              Save Shift
            </button>
            <button onClick={() => setShowForm(false)}
              className="text-sm px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50">
              Cancel
            </button>
          </div>
        </div>
      )}

      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <Clock size={32} className="mx-auto mb-2 opacity-30" />
          <p>No shifts assigned yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Agent</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Shift</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">Start</th>
                <th className="text-left px-4 py-3 text-slate-500 font-medium">End</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {shifts.map(shift => (
                <tr key={shift.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-700">{shift.agentName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SHIFT_COLORS[shift.shiftName] ?? 'bg-slate-100 text-slate-600'}`}>
                      {shift.shiftName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{shift.startTime}</td>
                  <td className="px-4 py-3 text-slate-600">{shift.endTime}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => deleteMutation.mutate(shift.id)} className="text-slate-300 hover:text-red-500">
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
