import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import api from '../api/axios'
import Layout from '../components/Layout'
import { useAuthStore } from '../store/authStore'
import { Check } from 'lucide-react'

export default function Profile() {
  const { user, login, token } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)

  const updateMutation = useMutation({
    mutationFn: data => api.put('/auth/profile', data),
    onSuccess: res => {
      login(token, { ...user, name: res.data.name, email: res.data.email })
      setSaved(true)
      setPassword('')
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const handleSubmit = e => {
    e.preventDefault()
    const data = {}
    if (name.trim()) data.name = name
    if (email.trim()) data.email = email
    if (password.trim()) data.password = password
    updateMutation.mutate(data)
  }

  return (
    <Layout>
      <div className="max-w-md">
        <h2 className="text-xl font-bold text-slate-800 mb-5">My Profile</h2>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-400">{user?.email}</p>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {user?.role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Use your real Gmail so you receive reminder and mention notifications.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 rounded-lg px-3 py-2">
                <Check size={14} /> Profile updated successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2 text-sm transition disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  )
}
