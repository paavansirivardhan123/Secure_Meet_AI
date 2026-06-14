'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export default function AdminPage() {
  const { role, token, logout } = useAuthStore()
  const router = useRouter()

  const [tab, setTab] = useState<'users' | 'sessions' | 'reports'>('reports')
  const [users, setUsers] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteResult, setInviteResult] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const stompRef = useRef<Client | null>(null)

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    if (role !== 'ADMIN') { router.push('/dashboard'); return }
    fetchAll()
    connectWebSocket()
    return () => { stompRef.current?.deactivate() }
  }, [token])

  function fetchAll() {
    api.get('/api/admin/users').then(r => setUsers(r.data)).catch(() => {})
    api.get('/api/sessions/active').then(r => setSessions(r.data)).catch(() => {})
    api.get('/api/admin/reports').then(r => setReports(r.data)).catch(() => {})
  }

  function connectWebSocket() {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe('/topic/admin/reports', (msg) => {
          const data = JSON.parse(msg.body)
          setNotifications(prev => [data, ...prev].slice(0, 10))
          fetchAll()
        })
      },
    })
    client.activate()
    stompRef.current = client
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    try {
      const { data } = await api.post('/api/admin/invite/email', { email: inviteEmail })
      setInviteResult(data)
      setInviteEmail('')
    } catch {
      alert('Failed to create invite')
    }
  }

  async function toggleUser(userId: number, active: boolean) {
    await api.put(`/api/admin/users/${userId}/${active ? 'deactivate' : 'activate'}`)
    fetchAll()
  }

  async function endSession(sessionId: string) {
    await api.post(`/api/sessions/end/${sessionId}`)
    fetchAll()
  }

  function handleLogout() { logout(); router.push('/login') }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M17 10h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2V9a5 5 0 0110 0v1zm-2 0V9a3 3 0 00-6 0v1h6z"/>
            </svg>
          </div>
          <span className="font-semibold text-text">SecureMeet</span>
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded font-mono">ADMIN</span>
        </div>
        <button onClick={handleLogout} className="text-subtext text-sm hover:text-text transition-colors">
          Sign out
        </button>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Live notifications */}
        {notifications.length > 0 && (
          <div className="mb-6 space-y-2">
            {notifications.slice(0, 3).map((n, i) => (
              <div key={i} className="bg-danger/10 border border-danger/30 rounded-xl px-4 py-3 flex items-start gap-3">
                <span className="text-danger text-sm">⚠</span>
                <div>
                  <p className="text-text text-sm font-medium">
                    {n.reportedByName} reported {n.reportedUserName}
                  </p>
                  <p className="text-subtext text-xs mt-0.5">"{n.reason}" — Session: {n.sessionId?.slice(0,16)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Invite form */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-6">
          <h2 className="text-text font-semibold mb-4">Invite a User</h2>
          <form onSubmit={sendInvite} className="flex gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="flex-1 bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                         focus:outline-none focus:border-accent"
            />
            <button type="submit"
              className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all">
              Send Invite
            </button>
          </form>
          {inviteResult && (
            <div className="mt-3 bg-success/10 border border-success/30 rounded-lg px-4 py-3">
              <p className="text-success text-sm font-medium">Invite created!</p>
              <p className="text-subtext text-xs font-mono mt-1 break-all">Token: {inviteResult.token}</p>
              <p className="text-subtext text-xs mt-0.5">Expires: {new Date(inviteResult.expiresAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(['reports', 'users', 'sessions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px
                         ${tab === t ? 'border-accent text-accent' : 'border-transparent text-subtext hover:text-text'}`}>
              {t}
              {t === 'reports' && reports.length > 0 && (
                <span className="ml-2 bg-danger text-white text-xs px-1.5 py-0.5 rounded-full">
                  {reports.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Reports tab */}
        {tab === 'reports' && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-subtext text-sm">
                No pending reports
              </div>
            ) : reports.map((r: any) => (
              <div key={r.id} className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-text font-medium">
                      <span className="text-subtext">Reported user:</span> {r.reportedUser?.fullName}
                    </p>
                    <p className="text-subtext text-sm mt-0.5">
                      By: {r.reportedBy?.fullName} · {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <p className="text-text text-sm mt-2 bg-bg border border-border rounded-lg px-3 py-2 inline-block">
                      "{r.reason}"
                    </p>
                  </div>
                  <span className="text-xs bg-danger/20 text-danger px-2 py-1 rounded font-mono uppercase">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Users tab */}
        {tab === 'users' && (
          <div className="space-y-2">
            {users.map((u: any) => (
              <div key={u.id} className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-text font-medium">{u.fullName}</p>
                  <p className="text-subtext text-sm">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-mono
                    ${u.role === 'ADMIN' ? 'bg-accent/20 text-accent' : 'bg-border text-subtext'}`}>
                    {u.role}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded
                    ${u.active ? 'bg-success/20 text-success' : 'bg-muted/30 text-muted'}`}>
                    {u.active ? 'Active' : 'Suspended'}
                  </span>
                  {u.role !== 'ADMIN' && (
                    <button onClick={() => toggleUser(u.id, u.active)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all
                        ${u.active
                          ? 'border-danger/40 text-danger hover:bg-danger/10'
                          : 'border-success/40 text-success hover:bg-success/10'}`}>
                      {u.active ? 'Suspend' : 'Restore'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sessions tab */}
        {tab === 'sessions' && (
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="bg-surface border border-border rounded-xl p-8 text-center text-subtext text-sm">
                No active sessions
              </div>
            ) : sessions.map((s: any) => (
              <div key={s.id} className="bg-surface border border-border rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-text font-medium">{s.title}</p>
                  <p className="text-subtext text-xs font-mono mt-0.5">{s.sessionId}</p>
                </div>
                <button onClick={() => endSession(s.sessionId)}
                  className="text-xs border border-danger/40 text-danger hover:bg-danger/10
                             px-3 py-1.5 rounded-lg transition-all">
                  End Session
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
