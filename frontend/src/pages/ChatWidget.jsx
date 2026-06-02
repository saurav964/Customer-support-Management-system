import { useState } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState('form') // form | sent
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    try {
      await fetch('http://localhost:8080/api/chat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setStep('sent')
    } catch {
      setStep('sent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">Support Chat</p>
              <p className="text-blue-200 text-xs">We reply within minutes</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-white hover:text-blue-200">
              <X size={16} />
            </button>
          </div>
          <div className="p-4">
            {step === 'sent' ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Send size={20} className="text-green-600" />
                </div>
                <p className="font-semibold text-slate-800">Message Sent!</p>
                <p className="text-sm text-slate-500 mt-1">We will reply to your email shortly.</p>
                <button onClick={() => { setStep('form'); setForm({ name: '', email: '', subject: '', message: '' }) }}
                  className="mt-4 text-sm text-blue-600 hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required placeholder="Your name"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required type="email" placeholder="Your email"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                  required placeholder="Subject"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  required rows={3} placeholder="How can we help you?"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50">
                  {loading ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition">
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  )
}
