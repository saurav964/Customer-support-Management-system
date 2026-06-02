import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { LayoutDashboard, Ticket, BookOpen, LogOut, Users, BarChart2, User, Moon, Sun, Clock, Globe, MessageSquare } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../api/axios'

export default function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'
  const [dark, setDark] = useState(() => localStorage.getItem('darkMode') === 'true')
  const { data: openTickets = [] } = useQuery({
    queryKey: ['tickets', 'OPEN'],
    queryFn: () => api.get('/tickets', { params: { status: 'OPEN' } }).then(r => r.data),
    refetchInterval: 30000,
  })
  const openCount = openTickets.length

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('darkMode', dark)
  }, [dark])

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/tickets', label: 'Tickets', icon: Ticket },
    { to: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
    ...(isAdmin ? [
      { to: '/agents', label: 'Agents', icon: Users },
      { to: '/shifts', label: 'Shifts', icon: Clock },
      { to: '/templates', label: 'Templates', icon: MessageSquare },
      { to: '/analytics', label: 'Analytics', icon: BarChart2 },
      { to: '/portal', label: 'Customer Portal', icon: Globe },
    ] : []),
    { to: '/profile', label: 'My Profile', icon: User },
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className={`flex h-screen ${dark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <aside className={`w-56 border-r flex flex-col ${dark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className={`px-5 py-4 border-b ${dark ? 'border-slate-700' : 'border-slate-200'}`}>
          <h1 className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-800'}`}>Support Desk</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-400'}`}>{user?.name}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isAdmin ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                location.pathname === to
                  ? 'bg-blue-50 text-blue-700'
                  : dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50'
              }`}>
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {to === '/tickets' && openCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {openCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={`border-t ${dark ? 'border-slate-700' : 'border-slate-200'} px-3 py-3 space-y-1`}>
          <button onClick={() => setDark(!dark)}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition ${dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button onClick={handleLogout}
            className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition ${dark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className={`flex-1 overflow-y-auto p-6 ${dark ? 'text-white' : ''}`}>{children}</main>
    </div>
  )
}
