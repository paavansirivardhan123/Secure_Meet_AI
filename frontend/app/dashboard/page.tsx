'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

export default function DashboardPage() {
  const { email, fullName, phoneNumber, profilePicture, bio, updateProfile, role, logout, token } = useAuthStore()
  const router = useRouter()

  const [dashboardData, setDashboardData] = useState<{
    ongoing: any[]
    upcoming: any[]
    history: any[]
  }>({ ongoing: [], upcoming: [], history: [] })

  const [title, setTitle] = useState('')
  const [joinId, setJoinId] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // Scheduling states
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledAt, setScheduledAt] = useState('')
  const [inviteesStr, setInviteesStr] = useState('')

  // Toast notifications state
  const [toasts, setToasts] = useState<any[]>([])
  const stompRef = useRef<Client | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'history'>('ongoing')

  // Profile management states
  const [isEditing, setIsEditing] = useState(false)
  const [editProfile, setEditProfile] = useState({
    fullName: fullName || '',
    email: email || '',
    phoneNumber: phoneNumber || '',
    bio: bio || '',
    profilePicture: profilePicture || ''
  })
  const [profileError, setProfileError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  function addToast(notification: {
    id: string
    type: 'MEETING_STARTED' | 'MEETING_SCHEDULED'
    title: string
    sessionId: string
    hostName: string
    scheduledAt?: string
  }) {
    setToasts(prev => [...prev, notification])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== notification.id))
    }, 10000)
  }

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    if (role === 'ADMIN') { router.push('/admin'); return }
    fetchSessions()

    if (email) {
      const client = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        onConnect: () => {
          client.subscribe(`/topic/notifications/${email}`, (msg) => {
            try {
              const data = JSON.parse(msg.body)
              addToast({
                id: Math.random().toString(36).substring(2, 9),
                type: data.type,
                title: data.title,
                sessionId: data.sessionId,
                hostName: data.hostName,
                scheduledAt: data.scheduledAt
              })
              fetchSessions()
            } catch (err) {
              console.error('Error parsing notification', err)
            }
          })
        },
      })
      client.activate()
      stompRef.current = client
    }

    return () => {
      stompRef.current?.deactivate()
    }
  }, [token, email])

  // Sync edit profile form with store updates
  useEffect(() => {
    setEditProfile({
      fullName: fullName || '',
      email: email || '',
      phoneNumber: phoneNumber || '',
      bio: bio || '',
      profilePicture: profilePicture || ''
    })
  }, [fullName, email, phoneNumber, bio, profilePicture])

  async function fetchSessions() {
    try {
      const { data } = await api.get('/api/sessions/dashboard')
      setDashboardData(data)
    } catch {}
  }

  async function createSession(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const invitees = inviteesStr
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const payload = {
        title,
        invitees,
        scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null
      }
      const { data } = await api.post('/api/sessions/create', payload)
      if (data.status === 'UPCOMING') {
        setTitle('')
        setInviteesStr('')
        setIsScheduled(false)
        setScheduledAt('')
        fetchSessions()
      } else {
        router.push(`/room?sessionId=${data.sessionId}&token=${encodeURIComponent(data.token)}&hostId=${data.hostId}`)
      }
    } catch (err: any) {
      setError('Failed to create session')
    } finally {
      setCreating(false)
    }
  }

  async function joinSession(sessionId: string) {
    try {
      const { data } = await api.post(`/api/sessions/join/${sessionId}`)
      if (data.status === 'PENDING_APPROVAL') {
        router.push(`/room?sessionId=${data.sessionId}&token=&hostId=${data.hostId}`)
      } else {
        router.push(`/room?sessionId=${data.sessionId}&token=${encodeURIComponent(data.token)}&hostId=${data.hostId}`)
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to join session')
    }
  }

  function handleLogout() {
    logout()
    router.push('/login')
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditProfile(prev => ({ ...prev, profilePicture: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    setProfileError('')
    try {
      const { data } = await api.put('/api/users/profile', editProfile)
      updateProfile({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        profilePicture: data.profilePicture,
        bio: data.bio
      })
      setIsEditing(false)
    } catch (err: any) {
      setProfileError(err?.response?.data?.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M17 10h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h2V9a5 5 0 0110 0v1zm-2 0V9a3 3 0 00-6 0v1h6z"/>
            </svg>
          </div>
          <span className="font-semibold text-text">SecureMeet</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-subtext text-sm">Hello, <span className="text-text">{fullName}</span></span>
          <button onClick={handleLogout} className="text-subtext hover:text-text text-sm transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Create/Schedule Meeting */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-text font-semibold mb-1">New Meeting</h2>
            <p className="text-subtext text-sm mb-4">Start or schedule a private session</p>
            <form onSubmit={createSession} className="space-y-3">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                placeholder="Meeting title"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent"
              />
              <input
                value={inviteesStr}
                onChange={e => setInviteesStr(e.target.value)}
                placeholder="Invitees (comma-separated emails)"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent"
              />
              
              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="schedule"
                  checked={isScheduled}
                  onChange={e => setIsScheduled(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent"
                />
                <label htmlFor="schedule" className="text-subtext text-xs select-none cursor-pointer">
                  Schedule for later
                </label>
              </div>

              {isScheduled && (
                <div>
                  <label className="text-subtext text-[10px] block mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    required
                    className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text text-xs
                               focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2.5 rounded-lg
                           text-sm transition-all disabled:opacity-50"
              >
                {creating ? 'Starting...' : isScheduled ? 'Schedule Meeting' : '+ Start Meeting'}
              </button>
            </form>
          </div>

          {/* Join Meeting */}
          <div className="bg-surface border border-border rounded-xl p-6">
            <h2 className="text-text font-semibold mb-1">Join Meeting</h2>
            <p className="text-subtext text-sm mb-5">Enter a session ID</p>
            <div className="space-y-3">
              <input
                value={joinId}
                onChange={e => setJoinId(e.target.value)}
                placeholder="Session ID"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-text text-sm
                           focus:outline-none focus:border-accent font-mono"
              />
              <button
                onClick={() => joinId && joinSession(joinId)}
                className="w-full border border-accent text-accent hover:bg-accent/10 font-medium
                           py-2.5 rounded-lg text-sm transition-all"
              >
                Join Session
              </button>
            </div>
          </div>
        </div>

        {/* Profile Settings Section */}
        <div className="bg-surface border border-border rounded-xl p-6 mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-text font-semibold text-lg">My Profile Settings</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-accent hover:text-accent/80 text-sm font-medium transition-colors"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {profileError && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-4 py-3 mb-4">
              {profileError}
            </div>
          )}

          {!isEditing ? (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Picture Display */}
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-border bg-[#0a0a0f] flex items-center justify-center flex-shrink-0">
                {profilePicture ? (
                  <img src={profilePicture} alt={fullName || 'Avatar'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-accent text-3xl font-bold">{fullName ? fullName[0].toUpperCase() : 'U'}</span>
                )}
              </div>

              {/* Profile Details */}
              <div className="flex-1 w-full space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-subtext text-xs uppercase tracking-wider block mb-1">Full Name</label>
                    <p className="text-text font-medium">{fullName}</p>
                  </div>
                  <div>
                    <label className="text-subtext text-xs uppercase tracking-wider block mb-1">Gmail / Email</label>
                    <p className="text-text font-medium">{email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-subtext text-xs uppercase tracking-wider block mb-1">Phone Number</label>
                    <p className="text-text font-medium">{phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-subtext text-xs uppercase tracking-wider block mb-1">Role</label>
                    <p className="text-text font-medium text-xs font-semibold inline-block px-2 py-0.5 rounded bg-accent/20 text-accent uppercase">
                      {role}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-subtext text-xs uppercase tracking-wider block mb-1">Bio / Profile Description</label>
                  <p className="text-text text-sm italic">{bio || 'No bio written yet. Click edit to add a short profile description.'}</p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
                {/* Profile Picture Uploader */}
                <div className="relative group w-24 h-24 rounded-full overflow-hidden border-2 border-accent/50 bg-[#0a0a0f] flex items-center justify-center flex-shrink-0">
                  {editProfile.profilePicture ? (
                    <img src={editProfile.profilePicture} alt="Avatar preview" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-accent text-3xl font-bold">{editProfile.fullName ? editProfile.fullName[0].toUpperCase() : 'U'}</span>
                  )}
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] text-white">
                    <span>Change</span>
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </div>

                <div className="w-full text-center md:text-left">
                  <p className="text-text text-sm font-medium">Profile Picture</p>
                  <p className="text-subtext text-xs mt-1">Upload a photo. Base64 encoded inside the database.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={editProfile.fullName}
                    onChange={e => setEditProfile(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                    className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Gmail / Email</label>
                  <input
                    type="email"
                    value={editProfile.email}
                    disabled
                    className="w-full bg-bg/50 border border-border rounded-lg px-4 py-2 text-subtext text-sm focus:outline-none opacity-60 cursor-not-allowed"
                  />
                  <span className="text-muted text-[10px] block mt-1">Contact admin to change your email.</span>
                </div>
                <div>
                  <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={editProfile.phoneNumber}
                    onChange={e => setEditProfile(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Enter phone number"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-subtext text-xs uppercase tracking-wider block mb-2">Bio / Bio Details</label>
                  <input
                    type="text"
                    value={editProfile.bio}
                    onChange={e => setEditProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Short description about yourself"
                    className="w-full bg-bg border border-border rounded-lg px-4 py-2 text-text text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-border text-subtext hover:text-text rounded-lg text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-accent hover:bg-accent/90 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Categories Tabs Section */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 border-b border-border">
            <div className="flex gap-4">
              {(['ongoing', 'upcoming', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 text-sm font-semibold capitalize border-b-2 transition-all ${
                    activeTab === tab
                      ? 'border-accent text-accent'
                      : 'border-transparent text-subtext hover:text-text'
                  }`}
                >
                  {tab === 'ongoing' ? 'Ongoing Meetings' : tab === 'upcoming' ? 'Upcoming Meetings' : 'History'}
                </button>
              ))}
            </div>
            <button onClick={fetchSessions} className="text-subtext text-sm hover:text-text pb-3 transition-colors">
              ↺ Refresh
            </button>
          </div>

          {/* Tab Content Rendering */}
          {activeTab === 'ongoing' && (
            dashboardData.ongoing.length === 0 ? (
              <div className="text-center py-8 text-subtext text-sm">
                No ongoing meetings right now
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.ongoing.map((s: any) => (
                  <div key={s.sessionId}
                       className="border border-border rounded-xl px-5 py-4 flex items-center justify-between bg-bg">
                    <div>
                      <p className="text-text font-medium">{s.title}</p>
                      <p className="text-subtext text-xs mt-0.5">Host: {s.hostName}</p>
                      <p className="text-muted text-[10px] font-mono mt-1 select-all">{s.sessionId}</p>
                    </div>
                    <button
                      onClick={() => joinSession(s.sessionId)}
                      className="bg-success/10 text-success border border-success/30 hover:bg-success/20
                                 text-sm px-5 py-2 rounded-lg transition-all font-semibold"
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'upcoming' && (
            dashboardData.upcoming.length === 0 ? (
              <div className="text-center py-8 text-subtext text-sm">
                No upcoming meetings scheduled
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.upcoming.map((s: any) => {
                  const isHost = s.hostName === fullName
                  return (
                    <div key={s.sessionId}
                         className="border border-border rounded-xl px-5 py-4 flex items-center justify-between bg-bg">
                      <div>
                        <p className="text-text font-medium">{s.title}</p>
                        <p className="text-subtext text-xs mt-0.5">Host: {s.hostName}</p>
                        <p className="text-accent text-xs font-semibold mt-1.5 bg-accent/10 px-2 py-0.5 rounded inline-block">
                          ⏰ Scheduled: {new Date(s.scheduledAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => joinSession(s.sessionId)}
                        className={`${
                          isHost
                            ? 'bg-accent hover:bg-accent/90 text-white'
                            : 'border border-accent text-accent hover:bg-accent/10'
                        } text-sm px-5 py-2 rounded-lg transition-all font-semibold`}
                      >
                        {isHost ? 'Start' : 'Join'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          )}

          {activeTab === 'history' && (
            dashboardData.history.length === 0 ? (
              <div className="text-center py-8 text-subtext text-sm">
                No meeting history found
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData.history.map((s: any) => (
                  <div key={s.sessionId}
                       className="border border-border rounded-xl px-5 py-4 flex items-center justify-between bg-bg">
                    <div>
                      <p className="text-text font-medium">{s.title}</p>
                      <p className="text-subtext text-xs mt-0.5">Host: {s.hostName}</p>
                      <div className="flex flex-wrap gap-4 text-muted text-[10px] mt-2 font-mono">
                        <span>Started: {new Date(s.startedAt).toLocaleString()}</span>
                        <span>Ended: {new Date(s.endedAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-subtext text-xs font-medium block">Duration</span>
                      <span className="text-accent text-sm font-bold block mt-0.5">{s.duration || '0s'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 w-full max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-surface/90 backdrop-blur-md border border-border rounded-xl p-4 shadow-2xl flex items-start gap-3 animate-slide-in-up"
          >
            <div className="flex-1">
              {toast.type === 'MEETING_STARTED' ? (
                <>
                  <div className="flex items-center gap-1.5 text-success font-semibold text-xs mb-1">
                    <span className="w-2 h-2 rounded-full bg-success animate-ping"></span>
                    <span>Live Meeting Started</span>
                  </div>
                  <p className="text-text text-sm font-medium">
                    Meeting started by <span className="text-accent">{toast.hostName}</span>
                  </p>
                  <p className="text-subtext text-xs mt-0.5 font-medium">{toast.title}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        joinSession(toast.sessionId)
                        setToasts(prev => prev.filter(t => t.id !== toast.id))
                      }}
                      className="bg-success text-black hover:bg-success/90 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-md shadow-success/20"
                    >
                      Join Meeting
                    </button>
                    <button
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="border border-border text-subtext hover:text-text text-xs px-3 py-1.5 rounded-lg transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-accent font-semibold text-xs mb-1">
                    <span>⏰ Upcoming Invitation</span>
                  </div>
                  <p className="text-text text-sm font-medium">
                    New invite from <span className="text-accent">{toast.hostName}</span>
                  </p>
                  <p className="text-subtext text-xs mt-0.5 font-medium">
                    {toast.title}
                  </p>
                  <p className="text-muted text-[10px] mt-1.5 bg-bg/50 px-2 py-1 rounded inline-block">
                    Starts: {new Date(toast.scheduledAt!).toLocaleString()}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('upcoming')
                        setToasts(prev => prev.filter(t => t.id !== toast.id))
                      }}
                      className="bg-accent text-white hover:bg-accent/90 text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-md shadow-accent/20"
                    >
                      View Scheduled
                    </button>
                    <button
                      onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                      className="border border-border text-subtext hover:text-text text-xs px-3 py-1.5 rounded-lg transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-muted hover:text-text transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
