'use client'
import { useEffect, useRef, useState, Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OpenVidu, Session, Publisher, Subscriber, StreamManager } from 'openvidu-browser'
import { useAuthStore } from '@/store/auth'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import api from '@/lib/api'

// ─────────────────────────────────────────────
// Video Tile
// ─────────────────────────────────────────────
function VideoTile({ streamManager, name, isMe, handRaised, onReport }: {
  streamManager: StreamManager
  name: string
  isMe: boolean
  handRaised: boolean
  onReport?: () => void
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (videoRef.current) streamManager.addVideoElement(videoRef.current)
  }, [streamManager])

  return (
    <div className="relative bg-[#111118] rounded-xl overflow-hidden aspect-video border border-[#1e1e2e] group">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      {handRaised && (
        <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-xs px-2 py-0.5 rounded-full font-medium">
          ✋ Hand Raised
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between
                      bg-gradient-to-t from-black/70 to-transparent">
        <span className="text-white text-xs font-medium">{isMe ? `${name} (You)` : name}</span>
        {!isMe && onReport && (
          <button onClick={onReport}
            className="opacity-0 group-hover:opacity-100 transition-opacity
                       bg-red-600/80 hover:bg-red-600 text-white text-xs px-2.5 py-1 rounded-lg">
            Report
          </button>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Report Modal
// ─────────────────────────────────────────────
function ReportModal({ user, sessionId, onClose }: {
  user: { id: number; name: string }
  sessionId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await api.post('/api/sessions/report', { sessionId, reportedUserId: user.id, reason })
      setDone(true)
      setTimeout(onClose, 1500)
    } catch { alert('Failed to submit report') }
    finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 w-full max-w-sm">
        {done ? (
          <div className="text-center py-4">
            <div className="text-green-400 text-3xl mb-2">✓</div>
            <p className="text-[#e3e5e8] font-medium">Reported & removed</p>
            <p className="text-[#b5bac1] text-sm mt-1">Admin has been notified</p>
          </div>
        ) : <>
          <h3 className="text-[#e3e5e8] font-semibold mb-1">Report {user.name}</h3>
          <p className="text-[#b5bac1] text-sm mb-4">User will be removed immediately. Admin will be notified.</p>
          <textarea value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Describe the issue..." rows={3}
            className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5
                       text-[#e3e5e8] text-sm focus:outline-none focus:border-red-500 resize-none mb-4" />
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]
                         text-sm py-2.5 rounded-lg transition-all">Cancel</button>
            <button onClick={submit} disabled={loading || !reason.trim()}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white text-sm
                         py-2.5 rounded-lg transition-all disabled:opacity-50">
              {loading ? 'Reporting...' : 'Report & Remove'}
            </button>
          </div>
        </>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Chat Panel
// ─────────────────────────────────────────────
function ChatPanel({ sessionId, myName }: { sessionId: string; myName: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const stompRef = useRef<Client | null>(null)

  useEffect(() => {
    // Load history
    api.get(`/api/chat/history/${sessionId}`).then(r => setMessages(r.data)).catch(() => {})

    // Subscribe to live messages
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/session/${sessionId}/chat`, msg => {
          setMessages(prev => [...prev, JSON.parse(msg.body)])
        })
      },
    })
    client.activate()
    stompRef.current = client
    return () => { client.deactivate() }
  }, [sessionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      await api.post('/api/chat/send', { sessionId, content: input.trim() })
      setInput('')
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-[#4e5058] text-xs text-center mt-8">No messages yet</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.senderName === myName ? 'items-end' : 'items-start'}`}>
            <span className="text-[#4e5058] text-xs mb-0.5">{m.senderName}</span>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm break-words
              ${m.senderName === myName
                ? 'bg-[#5865f2] text-white rounded-tr-sm'
                : 'bg-[#1e1e2e] text-[#e3e5e8] rounded-tl-sm'}`}>
              {m.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-[#1e1e2e] p-3 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message..."
          maxLength={2000}
          className="flex-1 bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-3 py-2
                     text-[#e3e5e8] text-sm focus:outline-none focus:border-[#5865f2]"
        />
        <button type="submit" disabled={!input.trim() || loading}
          className="bg-[#5865f2] hover:bg-[#4752c4] text-white px-3 py-2 rounded-lg
                     text-sm transition-all disabled:opacity-40">
          ↑
        </button>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────
// Participant List
// ─────────────────────────────────────────────
function ParticipantList({ participants, raisedHands }: {
  participants: { name: string; isMe: boolean; userId: number }[]
  raisedHands: Set<number>
}) {
  return (
    <div className="px-4 py-3 space-y-2 overflow-y-auto">
      {participants.map((p, i) => (
        <div key={i} className="flex items-center justify-between bg-[#1e1e2e] rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#5865f2]/20 rounded-full flex items-center justify-center
                            text-[#5865f2] text-xs font-semibold">
              {p.name[0]?.toUpperCase()}
            </div>
            <span className="text-[#e3e5e8] text-sm">{p.isMe ? `${p.name} (You)` : p.name}</span>
          </div>
          {raisedHands.has(p.userId) && <span className="text-sm">✋</span>}
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Lobby Panel
// ─────────────────────────────────────────────
function LobbyPanel({ requests, onApprove, onReject }: {
  requests: any[]
  onApprove: (id: number) => void
  onReject: (id: number) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto px-4 py-3 space-y-3">
      <h3 className="text-[#e3e5e8] font-semibold text-xs uppercase tracking-wider mb-2">Lobby requests</h3>
      {requests.length === 0 ? (
        <p className="text-[#4e5058] text-xs text-center mt-8">No pending requests</p>
      ) : (
        requests.map(r => (
          <div key={r.requestId} className="bg-[#1e1e2e] border border-border rounded-xl p-3 flex flex-col gap-2">
            <div className="flex flex-col">
              <span className="text-[#e3e5e8] text-sm font-semibold">{r.fullName}</span>
              <span className="text-[#b5bac1] text-xs font-mono truncate">{r.email}</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onReject(r.requestId)}
                className="flex-1 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 text-xs py-1.5 rounded-lg transition-all font-medium"
              >
                Decline
              </button>
              <button
                onClick={() => onApprove(r.requestId)}
                className="flex-1 bg-success/10 hover:bg-success/20 text-success border border-success/30 text-xs py-1.5 rounded-lg transition-all font-medium"
              >
                Accept
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Ended Screen with Countdown
// ─────────────────────────────────────────────
function EndedScreen({ onRedirect }: { onRedirect: () => void }) {
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          onRedirect()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [onRedirect])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-[#5865f2]/10 rounded-full flex items-center justify-center mx-auto text-[#5865f2] text-xl">
          🔒
        </div>
        <div>
          <h2 className="text-[#e3e5e8] text-xl font-bold mb-2">Meeting has ended</h2>
          <p className="text-[#b5bac1] text-sm leading-relaxed mb-1">
            This meeting session was closed by the host.
          </p>
          <p className="text-[#5865f2] text-xs font-semibold">
            Redirecting to ongoing meetings in {countdown}s...
          </p>
        </div>
        <button
          onClick={onRedirect}
          className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 rounded-xl text-sm font-semibold transition-all"
        >
          JOIN ongoing meetings
        </button>
      </div>
    </div>
  )
}

// Main Room Content
// ─────────────────────────────────────────────
function RoomContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId') || ''
  const ovToken = searchParams.get('token') || ''
  const hostId = parseInt(searchParams.get('hostId') || '0', 10)
  const { fullName, token, updateProfile } = useAuthStore()
  const router = useRouter()

  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [subscribers, setSubscribers] = useState<{ sm: Subscriber; name: string; userId: number }[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [audioOn, setAudioOn] = useState(true)
  const [videoOn, setVideoOn] = useState(true)
  const [screenSharing, setScreenSharing] = useState(false)
  const [screenPublisher, setScreenPublisher] = useState<Publisher | null>(null)
  const [handRaised, setHandRaised] = useState(false)
  const [raisedHands, setRaisedHands] = useState<Set<number>>(new Set())
  const [reportTarget, setReportTarget] = useState<{ id: number; name: string } | null>(null)
  
  // Custom lobby knocking states
  const [joinStatus, setJoinStatus] = useState<'LOADING' | 'PENDING_APPROVAL' | 'REJECTED' | 'ACTIVE' | 'LEFT' | 'ENDED' | 'KICKED'>('LOADING')
  const [sessionTitle, setSessionTitle] = useState('')
  const [lobbyRequests, setLobbyRequests] = useState<any[]>([])

  const [sidePanel, setSidePanel] = useState<'chat' | 'participants' | 'lobby' | null>(null)
  const [unread, setUnread] = useState(0)

  const [showRenameModal, setShowRenameModal] = useState(false)
  const [newName, setNewName] = useState(fullName || '')

  const stompRef = useRef<Client | null>(null)
  const myUserId = useRef<number | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const OVRef = useRef<OpenVidu | null>(null)

  useEffect(() => {
    setNewName(fullName || '')
  }, [fullName])

  useEffect(() => {
    if (!token) { router.push('/login'); return }
    
    // 1. Fetch user ID and trigger join sequence
    api.get('/api/auth/me')
      .then(r => { 
        myUserId.current = r.data.id 
        attemptJoin()
      })
      .catch(() => {
        router.push('/dashboard')
      })

    return () => {
      sessionRef.current?.disconnect()
      stompRef.current?.deactivate()
    }
  }, [])

  // Sync edit name state
  async function handleRename() {
    if (!newName.trim()) return
    try {
      await api.put('/api/users/profile', { fullName: newName })
      updateProfile({ fullName: newName })
      api.post('/api/chat/signal', {
        type: 'name_change',
        userId: myUserId.current,
        userName: newName,
        sessionId,
        payload: newName,
      }).catch(() => {})
      setShowRenameModal(false)
    } catch {
      alert('Failed to change name')
    }
  }

  // Lobby knock requests for Host
  async function handleApproveLobby(requestId: number) {
    try {
      await api.post(`/api/sessions/requests/${requestId}/approve`)
      setLobbyRequests(prev => prev.filter(r => r.requestId !== requestId))
    } catch {
      alert('Failed to approve request')
    }
  }

  async function handleRejectLobby(requestId: number) {
    try {
      await api.post(`/api/sessions/requests/${requestId}/reject`)
      setLobbyRequests(prev => prev.filter(r => r.requestId !== requestId))
    } catch {
      alert('Failed to decline request')
    }
  }

  // Knocking attempt API call
  async function attemptJoin() {
    try {
      const { data } = await api.post(`/api/sessions/join/${sessionId}`)
      setSessionTitle(data.title)

      if (data.status === 'ACTIVE') {
        setJoinStatus('ACTIVE')
        initOpenVidu(data.token)
        connectWebSocket()
      } else if (data.status === 'PENDING_APPROVAL') {
        setJoinStatus('PENDING_APPROVAL')
        connectKnockWebSocket()
      } else if (data.status === 'REJECTED') {
        setJoinStatus('REJECTED')
      }
    } catch {
      setJoinStatus('LEFT')
    }
  }

  // Participant knock WS subscription
  function connectKnockWebSocket() {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/session/${sessionId}/join-status/${myUserId.current}`, msg => {
          const data = JSON.parse(msg.body)
          if (data.status === 'APPROVED') {
            client.deactivate()
            attemptJoin()
          } else if (data.status === 'REJECTED') {
            client.deactivate()
            setJoinStatus('REJECTED')
          }
        })
      },
    })
    client.activate()
    stompRef.current = client
  }

  // Track unread when chat is closed
  useEffect(() => {
    if (sidePanel === 'chat') setUnread(0)
  }, [sidePanel])

  function initOpenVidu(tokenParam: string) {
    const OV = new OpenVidu()
    OVRef.current = OV
    const s = OV.initSession()
    sessionRef.current = s

    s.on('streamCreated', (event: any) => {
      const sub = s.subscribe(event.stream, undefined)
      const data = JSON.parse(event.stream.connection.data || '{}')
      setSubscribers(prev => [...prev, { sm: sub, name: data.fullName || 'User', userId: data.userId || 0 }])
    })
    s.on('streamDestroyed', (event: any) => {
      setSubscribers(prev => prev.filter(sub => sub.sm !== event.stream.streamManager))
    })

    s.connect(tokenParam, { fullName, userId: myUserId.current }).then(() => {
      const pub = OV.initPublisher(undefined, {
        audioSource: undefined, videoSource: undefined,
        publishAudio: true, publishVideo: true,
        resolution: '640x480', frameRate: 30,
      })
      s.publish(pub)
      setPublisher(pub)
      setSession(s)
      sessionRef.current = s
    }).catch(console.error)
  }

  function connectWebSocket() {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        // Subscribe to general events
        client.subscribe(`/topic/session/${sessionId}/kick`, msg => {
          const data = JSON.parse(msg.body)
          if (data.userId === myUserId.current) {
            sessionRef.current?.disconnect()
            setJoinStatus('KICKED')
          }
        })
        client.subscribe(`/topic/session/${sessionId}/ended`, () => {
          sessionRef.current?.disconnect()
          setJoinStatus('ENDED')
        })
        client.subscribe(`/topic/session/${sessionId}/signals`, msg => {
          const event = JSON.parse(msg.body)
          if (event.type === 'raise_hand') {
            setRaisedHands(prev => { const s = new Set(prev); s.add(event.userId); return s })
          } else if (event.type === 'lower_hand') {
            setRaisedHands(prev => { const s = new Set(prev); s.delete(event.userId); return s })
          } else if (event.type === 'name_change') {
            setSubscribers(prev => prev.map(sub => {
              if (sub.userId === event.userId) {
                return { ...sub, name: event.userName }
              }
              return sub
            }))
          }
        })
        client.subscribe(`/topic/session/${sessionId}/chat`, () => {
          setSidePanel(prev => { if (prev !== 'chat') setUnread(u => u + 1); return prev })
        })

        // Host specific WS setup
        if (myUserId.current === hostId) {
          // Fetch existing pending requests
          api.get(`/api/sessions/${sessionId}/requests`).then(r => {
            setLobbyRequests(r.data)
          }).catch(() => {})

          // Listen to knocks
          client.subscribe(`/topic/session/${sessionId}/lobby`, msg => {
            const req = JSON.parse(msg.body)
            setLobbyRequests(prev => {
              if (req.status === 'PENDING') {
                if (prev.some(p => p.requestId === req.requestId)) return prev
                return [...prev, req]
              } else {
                return prev.filter(p => p.requestId !== req.requestId)
              }
            })
          })
        }
      },
    })
    client.activate()
    stompRef.current = client
  }

  function toggleAudio() {
    publisher?.publishAudio(!audioOn)
    setAudioOn(!audioOn)
  }

  function toggleVideo() {
    publisher?.publishVideo(!videoOn)
    setVideoOn(!videoOn)
  }

  async function toggleScreenShare() {
    if (!session || !OVRef.current) return
    if (screenSharing) {
      if (screenPublisher) session.unpublish(screenPublisher)
      setScreenPublisher(null)
      setScreenSharing(false)
    } else {
      try {
        const screenPub = OVRef.current.initPublisher(undefined, {
          videoSource: 'screen', publishAudio: false, publishVideo: true,
        })
        screenPub.once('accessAllowed', () => {
          session.publish(screenPub)
          setScreenPublisher(screenPub)
          setScreenSharing(true)
        })
        screenPub.once('accessDenied', () => { alert('Screen share denied') })
      } catch (e) { console.error(e) }
    }
  }

  function toggleHand() {
    const newState = !handRaised
    setHandRaised(newState)
    if (myUserId.current !== null) {
      setRaisedHands(prev => {
        const s = new Set(prev)
        newState ? s.add(myUserId.current!) : s.delete(myUserId.current!)
        return s
      })
    }
    api.post('/api/chat/signal', {
      type: newState ? 'raise_hand' : 'lower_hand',
      userId: myUserId.current,
      userName: fullName,
      sessionId,
      payload: '',
    }).catch(() => {})
  }

  function leaveSession() {
    sessionRef.current?.disconnect()
    setJoinStatus('LEFT')
  }

  async function endSessionByHost() {
    if (confirm('Are you sure you want to end this meeting for everyone?')) {
      try {
        await api.post(`/api/sessions/end/${sessionId}`)
      } catch {
        alert('Failed to end meeting')
      }
    }
  }

  // ─────────────────────────────────────────────
  // Exit State Redirect Pages
  // ─────────────────────────────────────────────

  if (joinStatus === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-[#b5bac1] text-sm animate-pulse">Checking credentials...</div>
      </div>
    )
  }

  if (joinStatus === 'PENDING_APPROVAL') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-[#5865f2]/10 rounded-full flex items-center justify-center mx-auto text-[#5865f2] animate-pulse">
            🔑
          </div>
          <div>
            <h2 className="text-[#e3e5e8] text-xl font-bold mb-2">Waiting for Permission</h2>
            <p className="text-[#b5bac1] text-sm leading-relaxed">
              You've knocked. The host has been notified and needs to accept your request to let you join the meeting.
            </p>
          </div>
          <button
            onClick={() => {
              sessionRef.current?.disconnect()
              stompRef.current?.deactivate()
              router.push('/dashboard')
            }}
            className="w-full bg-[#1e1e2e] border border-[#2e2e3e] text-[#e3e5e8] hover:bg-[#2e2e3e] py-3 rounded-xl text-sm font-semibold transition-all"
          >
            Cancel Request & Return
          </button>
        </div>
      </div>
    )
  }

  if (joinStatus === 'REJECTED') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 text-2xl font-bold">
            ⊘
          </div>
          <div>
            <h2 className="text-[#e3e5e8] text-xl font-bold mb-2">Admission Denied</h2>
            <p className="text-[#b5bac1] text-sm leading-relaxed">
              The host did not approve your request to join this session.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 rounded-xl text-sm font-semibold transition-all"
          >
            JOIN ongoing meetings
          </button>
        </div>
      </div>
    )
  }

  if (joinStatus === 'LEFT') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-[#1e1e2e] rounded-full flex items-center justify-center mx-auto text-[#b5bac1] text-xl">
            🚪
          </div>
          <div>
            <h2 className="text-[#e3e5e8] text-xl font-bold mb-2">You left the meeting</h2>
            <p className="text-[#b5bac1] text-sm leading-relaxed">
              You have disconnected from the session.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 rounded-xl text-sm font-semibold transition-all"
          >
            JOIN ongoing meetings
          </button>
        </div>
      </div>
    )
  }

  if (joinStatus === 'ENDED') {
    return <EndedScreen onRedirect={() => router.push('/dashboard')} />
  }

  if (joinStatus === 'KICKED') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#111118] border border-[#1e1e2e] rounded-2xl p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-500 text-xl">
            ⊘
          </div>
          <div>
            <h2 className="text-[#e3e5e8] text-xl font-bold mb-2">Removed from session</h2>
            <p className="text-[#b5bac1] text-sm leading-relaxed">
              You were removed from this session.
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white py-3 rounded-xl text-sm font-semibold transition-all"
          >
            JOIN ongoing meetings
          </button>
        </div>
      </div>
    )
  }

  // Build participant list
  const allParticipants = [
    ...(publisher ? [{ name: fullName || 'You', isMe: true, userId: myUserId.current || -1 }] : []),
    ...subscribers.map(s => ({ name: s.name, isMe: false, userId: s.userId })),
  ]

  // Build video tiles
  const tiles = [
    ...(publisher ? [{ sm: publisher as StreamManager, name: fullName || 'You', isMe: true, userId: -1 }] : []),
    ...subscribers.map(s => ({ sm: s.sm as StreamManager, name: s.name, isMe: false, userId: s.userId })),
  ]

  const gridCols = tiles.length === 1 ? 'grid-cols-1 max-w-2xl mx-auto' :
                   tiles.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {/* Header */}
      <header className="border-b border-[#1e1e2e] px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-[#5865f2] rounded flex items-center justify-center">
            <span className="text-white text-xs">🔒</span>
          </div>
          <span className="text-[#e3e5e8] font-medium text-sm">SecureMeet</span>
          <span className="text-[#4e5058] text-xs font-mono hidden sm:block">
            {sessionId.slice(0, 24)}...
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[#b5bac1] text-xs">{tiles.length} participant{tiles.length !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <div className={`grid gap-3 ${gridCols}`}>
              {tiles.map((t, i) => (
                <VideoTile
                  key={i}
                  streamManager={t.sm}
                  name={t.name}
                  isMe={t.isMe}
                  handRaised={raisedHands.has(t.userId)}
                  onReport={!t.isMe && t.userId !== hostId ? () => setReportTarget({ id: t.userId, name: t.name }) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Control bar */}
          <div className="border-t border-[#1e1e2e] px-6 py-4 flex items-center justify-between flex-shrink-0">
            {/* Left controls */}
            <div className="flex items-center gap-2">
              <ControlBtn active={audioOn} onClick={toggleAudio} activeIcon="🎙" inactiveIcon="🔇"
                label={audioOn ? 'Mute' : 'Unmute'} danger={!audioOn} />
              <ControlBtn active={videoOn} onClick={toggleVideo} activeIcon="📷" inactiveIcon="🚫"
                label={videoOn ? 'Stop video' : 'Start video'} danger={!videoOn} />
              <ControlBtn active={!screenSharing} onClick={toggleScreenShare}
                activeIcon="🖥" inactiveIcon="🖥" label={screenSharing ? 'Stop share' : 'Share screen'}
                highlight={screenSharing} />
              <ControlBtn active={true} onClick={() => setShowRenameModal(true)} activeIcon="✏️" inactiveIcon="✏️"
                label="Change Display Name" />
            </div>

            {/* Center — raise hand */}
            <div className="flex items-center gap-2">
              <button onClick={toggleHand}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all
                  ${handRaised
                    ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                    : 'bg-[#111118] border border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                <span>✋</span>
                <span className="hidden sm:inline">{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
              </button>
            </div>

            {/* Right — panel toggles + leave/end */}
            <div className="flex items-center gap-2">
              {myUserId.current === hostId && (
                <button onClick={() => setSidePanel(p => p === 'lobby' ? null : 'lobby')}
                  className={`relative px-3 py-2 rounded-lg text-sm transition-all border
                    ${sidePanel === 'lobby'
                      ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#5865f2]'
                      : 'bg-[#111118] border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                  🔔 <span className="hidden sm:inline">Lobby</span>
                  {lobbyRequests.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px]
                                     w-4 h-4 rounded-full flex items-center justify-center font-bold">
                      {lobbyRequests.length}
                    </span>
                  )}
                </button>
              )}
              <button onClick={() => setSidePanel(p => p === 'participants' ? null : 'participants')}
                className={`px-3 py-2 rounded-lg text-sm transition-all border
                  ${sidePanel === 'participants'
                    ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#5865f2]'
                    : 'bg-[#111118] border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                👥 <span className="hidden sm:inline">People</span>
              </button>
              <button onClick={() => setSidePanel(p => p === 'chat' ? null : 'chat')}
                className={`relative px-3 py-2 rounded-lg text-sm transition-all border
                  ${sidePanel === 'chat'
                    ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#5865f2]'
                    : 'bg-[#111118] border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                💬 <span className="hidden sm:inline">Chat</span>
                {unread > 0 && sidePanel !== 'chat' && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px]
                                   w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
              {myUserId.current === hostId ? (
                <button onClick={endSessionByHost}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all ml-2">
                  End Meeting
                </button>
              ) : (
                <button onClick={leaveSession}
                  className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-all ml-2">
                  Leave
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        {sidePanel && (
          <div className="w-80 border-l border-[#1e1e2e] flex flex-col bg-[#111118] flex-shrink-0">
            {/* Panel header */}
            <div className="px-4 py-3 border-b border-[#1e1e2e] flex items-center justify-between">
              <div className="flex gap-1">
                {(['chat', 'participants'] as const).map(p => (
                  <button key={p} onClick={() => setSidePanel(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                      ${sidePanel === p ? 'bg-[#5865f2] text-white' : 'text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                    {p}
                  </button>
                ))}
                {myUserId.current === hostId && (
                  <button onClick={() => setSidePanel('lobby')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                      ${sidePanel === 'lobby' ? 'bg-[#5865f2] text-white' : 'text-[#b5bac1] hover:text-[#e3e5e8]'}`}>
                    Lobby
                  </button>
                )}
              </div>
              <button onClick={() => setSidePanel(null)} className="text-[#4e5058] hover:text-[#b5bac1] text-lg leading-none">×</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {sidePanel === 'chat' && <ChatPanel sessionId={sessionId} myName={fullName || ''} />}
              {sidePanel === 'participants' && <ParticipantList participants={allParticipants} raisedHands={raisedHands} />}
              {sidePanel === 'lobby' && <LobbyPanel requests={lobbyRequests} onApprove={handleApproveLobby} onReject={handleRejectLobby} />}
            </div>
          </div>
        )}
      </div>

      {reportTarget && (
        <ReportModal user={reportTarget} sessionId={sessionId} onClose={() => setReportTarget(null)} />
      )}

      {showRenameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111118] border border-[#1e1e2e] rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-[#e3e5e8] font-semibold mb-1">Change Display Name</h3>
            <p className="text-[#b5bac1] text-sm mb-4">Updates your display name for this session.</p>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full bg-[#0a0a0f] border border-[#1e1e2e] rounded-lg px-4 py-2.5
                         text-[#e3e5e8] text-sm focus:outline-none focus:border-[#5865f2] mb-4"
              placeholder="Enter your name"
              required
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowRenameModal(false)}
                className="flex-1 border border-[#1e1e2e] text-[#b5bac1] hover:text-[#e3e5e8]
                           text-sm py-2.5 rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                disabled={!newName.trim()}
                className="flex-1 bg-[#5865f2] hover:bg-[#4752c4] text-white text-sm
                           py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                Change Name
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// Control Button helper
// ─────────────────────────────────────────────
function ControlBtn({ active, onClick, activeIcon, inactiveIcon, label, danger, highlight }: {
  active: boolean; onClick: () => void; activeIcon: string; inactiveIcon: string
  label: string; danger?: boolean; highlight?: boolean
}) {
  return (
    <button onClick={onClick} title={label}
      className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg transition-all border
        ${danger && !active ? 'bg-red-600 border-red-600 text-white'
          : highlight ? 'bg-[#5865f2]/20 border-[#5865f2]/50 text-[#5865f2]'
          : 'bg-[#111118] border-[#1e1e2e] text-[#e3e5e8] hover:border-[#5865f2]/50'}`}>
      {active ? activeIcon : inactiveIcon}
    </button>
  )
}

export default function RoomPage() {
  return <Suspense fallback={
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#b5bac1] text-sm">Joining session...</div>
    </div>
  }>
    <RoomContent />
  </Suspense>
}
