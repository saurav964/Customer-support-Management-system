import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from './store/authStore'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import TicketDetail from './pages/TicketDetail'
import KnowledgeBase from './pages/KnowledgeBase'
import Agents from './pages/Agents'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'
import ChatWidget from './pages/ChatWidget'
import CustomerPortal from './pages/CustomerPortal'
import Shifts from './pages/Shifts'
import Templates from './pages/Templates'

function PrivateRoute({ children }) {
  const token = useAuthStore(s => s.token)
  return token ? children : <Navigate to="/login" replace />
}

// Feature 11: SSE — subscribe once at app level and invalidate queries on ticket changes
function SseListener() {
  const queryClient = useQueryClient()
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    if (!token) return
    const es = new EventSource('/api/events')
    es.addEventListener('ticket-update', () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    })
    es.onerror = () => es.close()
    return () => es.close()
  }, [token, queryClient])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <SseListener />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/tickets" element={<PrivateRoute><Tickets /></PrivateRoute>} />
        <Route path="/tickets/:id" element={<PrivateRoute><TicketDetail /></PrivateRoute>} />
        <Route path="/knowledge" element={<PrivateRoute><KnowledgeBase /></PrivateRoute>} />
        <Route path="/agents" element={<PrivateRoute><Agents /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/chat" element={<ChatWidget />} />
        <Route path="/portal" element={<CustomerPortal />} />
        <Route path="/shifts" element={<PrivateRoute><Shifts /></PrivateRoute>} />
        <Route path="/templates" element={<PrivateRoute><Templates /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
