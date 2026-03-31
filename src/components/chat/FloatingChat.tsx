import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Pusher from 'pusher-js'
import {
  MessageSquare, X, Send, ArrowLeft, Plus, Search,
  Smile, Paperclip, CheckCheck, Check, Hash,
  FileText, Users, Loader2, Phone, Video,
  PhoneOff, Mic, MicOff, VideoOff, Building2, Store,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore } from '../../stores/floating.store'
import { DraggableWidget } from '../floating/DraggableWidget'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type {
  Conversation, ChatMessage, SearchUser,
  PusherNewMessageEvent, PusherMessageReadEvent, PusherTypingEvent, PusherPresenceEvent,
  CallData, CallSignalData, CallAcceptedData, CallEndedData,
} from '../../types/chat.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-teal-500', 'bg-orange-500',
]
function avatarBg(seed: number) { return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length] }

function msgTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (diff < 604800000) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const COMMON_EMOJIS = [
  '😀','😂','😍','😊','😎','🤔','😅','🤗',
  '👍','👎','👋','🙌','👏','🙏','❤️','🔥',
  '🎉','✨','💯','🚀','⚡','💡','✅','🎯',
]

// ─── Call types ───────────────────────────────────────────────────────────────

interface CallSession {
  callId: string
  convUuid: string
  callType: 'audio' | 'video'
  remoteUserId: number
  remoteName: string
  isCaller: boolean
}
type CallPhase = 'idle' | 'calling' | 'incoming' | 'active'

function fmtDuration(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── WidgetCallPanel — shown inside the widget body during audio calls ─────────

interface WcpProps {
  phase: CallPhase
  session: CallSession
  isMuted: boolean
  callSeconds: number
  onAccept: () => void
  onDecline: () => void
  onEnd: () => void
  onMute: () => void
  remoteAudioRef: React.RefObject<HTMLAudioElement>
}

function WidgetCallPanel({ phase, session, isMuted, callSeconds, onAccept, onDecline, onEnd, onMute, remoteAudioRef }: WcpProps) {
  const COLORS = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-orange-500']
  const bg = COLORS[Math.abs(session.remoteUserId) % COLORS.length]

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* Hidden remote audio */}
      {phase === 'active' && <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />}

      {/* Avatar */}
      <div className={cn('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl', bg, phase === 'incoming' && 'animate-pulse')}>
        {initials(session.remoteName)}
      </div>

      {/* Name + status */}
      <div className="text-center">
        <p className="text-xs text-indigo-300 uppercase tracking-wider mb-1">
          {phase === 'calling' ? 'Calling…'
            : phase === 'incoming' ? `Incoming ${session.callType === 'video' ? 'video' : 'audio'} call`
            : session.callType === 'video' ? 'Video Call' : 'Audio Call'}
        </p>
        <h3 className="text-xl font-bold text-white">{session.remoteName}</h3>
        {phase === 'active' && (
          <p className="text-sm text-slate-400 mt-1 tabular-nums">{fmtDuration(callSeconds)}</p>
        )}
      </div>

      {/* Animated waveform for active call */}
      {phase === 'active' && (
        <div className="flex items-end gap-1 h-8">
          {[3,6,4,8,3,5,7,4,3].map((h, i) => (
            <div
              key={i}
              className="w-1.5 rounded-full animate-bounce"
              style={{
                height: `${h * 4}px`,
                backgroundColor: isMuted ? '#475569' : '#818cf8',
                animationDelay: `${i * 0.08}s`,
                animationDuration: '0.8s',
              }}
            />
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-end gap-5">
        {phase === 'active' && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onMute}
              className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors', isMuted ? 'bg-rose-500 hover:bg-rose-600' : 'bg-white/15 hover:bg-white/25')}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <span className="text-[10px] text-slate-500">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>
        )}

        {phase === 'incoming' && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={onAccept}
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition-colors shadow-lg"
              title="Accept"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-[10px] text-slate-500">Accept</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={phase === 'incoming' ? onDecline : onEnd}
            className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shadow-lg"
            title={phase === 'incoming' ? 'Decline' : 'End call'}
          >
            <PhoneOff className="w-6 h-6" />
          </button>
          <span className="text-[10px] text-slate-500">{phase === 'incoming' ? 'Decline' : 'End'}</span>
        </div>
      </div>
    </div>
  )
}

// ─── VideoCallOverlay — full-screen overlay for active video calls ─────────────

interface VcoProps {
  session: CallSession
  isMuted: boolean
  isCameraOff: boolean
  callSeconds: number
  onMute: () => void
  onCamera: () => void
  onEnd: () => void
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  localVideoRef: React.RefObject<HTMLVideoElement>
}

function VideoCallOverlay({ session, isMuted, isCameraOff, callSeconds, onMute, onCamera, onEnd, remoteVideoRef, localVideoRef }: VcoProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-black" style={{ zIndex: 100 }}>
      {/* Remote video */}
      <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      {/* Local PiP */}
      <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/20 shadow-lg z-10" />
      {/* Info */}
      <div className="relative z-10 text-center pt-8">
        <p className="text-white font-semibold">{session.remoteName}</p>
        <p className="text-white/60 text-sm mt-0.5 tabular-nums">{fmtDuration(callSeconds)}</p>
      </div>
      <div className="flex-1" />
      {/* Controls */}
      <div className="relative z-10 flex items-center justify-center gap-4 pb-10">
        <button onClick={onMute} className={cn('w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors', isMuted ? 'bg-rose-500' : 'bg-white/20 hover:bg-white/30')} title={isMuted ? 'Unmute' : 'Mute'}>
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button onClick={onCamera} className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors', isCameraOff ? 'bg-rose-500' : 'bg-white/20 hover:bg-white/30')} title={isCameraOff ? 'Camera on' : 'Camera off'}>
          {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>
        <button onClick={onEnd} className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors shadow-lg" title="End call">
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

// ─── CreateGroupModal ─────────────────────────────────────────────────────────

function CreateGroupModal({ members, onClose, onCreated }: {
  members: SearchUser[]
  onClose: () => void
  onCreated: (uuid: string) => void
}) {
  const [groupName, setGroupName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )
  const toggle = (id: number) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const handleCreate = async () => {
    if (!groupName.trim() || selected.size < 1) return
    setCreating(true)
    try {
      const res = await chatService.createGroup(groupName.trim(), Array.from(selected))
      onCreated(res.data.data.uuid)
    } catch { toast.error('Failed to create group') }
    finally { setCreating(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Create Group</h2>
            <p className="text-xs text-slate-400 mt-0.5">Name your group and add members</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4 overflow-hidden">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Group Name</label>
            <input
              autoFocus type="text" placeholder="e.g. Sales Team, Support Squad…"
              value={groupName} onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-800 placeholder-slate-400"
            />
          </div>
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Members</label>
              {selected.size > 0 && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{selected.size} selected</span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text" placeholder="Search members…" value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="overflow-y-auto max-h-52 flex flex-col gap-0.5">
              {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-6">No members found</p>}
              {filtered.map(m => {
                const isChecked = selected.has(m.id)
                return (
                  <button key={m.id} onClick={() => toggle(m.id)}
                    className={cn('flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left w-full', isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50')}
                  >
                    <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors', isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300')}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0', avatarBg(m.id))}>
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isChecked ? 'text-indigo-700' : 'text-slate-700')}>{m.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!groupName.trim() || selected.size < 1 || creating}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {creating && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── FloatingChat ─────────────────────────────────────────────────────────────

export function FloatingChat() {
  const { user, token } = useAuthStore()
  const location = useLocation()
  const isOnChatPage = location.pathname === '/chat'

  const isOpen        = useFloatingStore(s => s.chatOpen)
  const setChatOpen   = useFloatingStore(s => s.setChatOpen)
  const setChatUnread = useFloatingStore(s => s.setChatUnread)

  const [view, setView] = useState<'list' | 'thread'>('list')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<SearchUser[]>([])
  const [onlineStatus, setOnlineStatus] = useState<Map<number, string>>(new Map())
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const convChannelRef = useRef<ReturnType<InstanceType<typeof Pusher>['subscribe']> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs for stable access inside Pusher callbacks (avoid stale closures)
  const conversationsRef = useRef<Conversation[]>([])
  const openThreadRef = useRef<(conv: Conversation) => void>(() => {})

  // ── Call state ──────────────────────────────────────────────────────────────
  const [callPhase, setCallPhase] = useState<CallPhase>('idle')
  const [callSession, setCallSession] = useState<CallSession | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)

  // Call refs (stable for Pusher callbacks)
  const callPhaseRef = useRef<CallPhase>('idle')
  const callSessionRef = useRef<CallSession | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync state → refs
  useEffect(() => { callPhaseRef.current = callPhase }, [callPhase])
  useEffect(() => { callSessionRef.current = callSession }, [callSession])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])

  // ─── Load conversations ────────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    if (!user) return
    try {
      const res = await chatService.getConversations()
      const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
      setConversations(list)
      setTotalUnread(list.reduce((s, c) => s + (c.unread_count ?? 0), 0))
    } catch { /* silent */ }
  }, [user])

  useEffect(() => { if (user) loadConversations() }, [user, loadConversations])

  const loadTeamMembers = useCallback(async () => {
    if (!user) return
    try {
      const res = await chatService.searchUsers('')
      const all: SearchUser[] = Array.isArray(res.data?.data) ? res.data.data : []
      const members = all.filter(m => m.id !== user.id)
      setTeamMembers(members)
      setOnlineStatus(prev => {
        const updated = new Map(prev)
        members.forEach(m => { if (!updated.has(m.id)) updated.set(m.id, m.status) })
        return updated
      })
    } catch { /* silent */ }
  }, [user])

  useEffect(() => { if (user) loadTeamMembers() }, [user, loadTeamMembers])

  // ─── Pusher — global user channel (skip when on /chat page) ───────────────

  useEffect(() => {
    if (!user || !token || isOnChatPage) return
    const apiBase = import.meta.env.VITE_API_URL as string
    const pusher = new Pusher(import.meta.env.VITE_PUSHER_APP_KEY as string, {
      cluster: (import.meta.env.VITE_PUSHER_APP_CLUSTER as string) || 'us2',
      channelAuthorization: {
        endpoint: `${apiBase}/team-chat/pusher/auth`,
        transport: 'ajax',
        headers: { Authorization: `Bearer ${token}` },
      },
    })
    pusherRef.current = pusher

    const userChannel = pusher.subscribe(`private-team-user.${user.parent_id}.${user.id}`)
    userChannel.bind('new.message', (data: PusherNewMessageEvent) => {
      setTotalUnread(v => v + 1)
      setConversations(prev => {
        const idx = prev.findIndex(c => c.uuid === data.conversation_uuid)
        if (idx === -1) { loadConversations(); return prev }
        const updated = [...prev]
        const conv = { ...updated[idx] }
        conv.unread_count = (conv.unread_count ?? 0) + 1
        if (conv.last_message) conv.last_message = { ...conv.last_message, body: data.preview }
        updated.splice(idx, 1)
        updated.unshift(conv)
        return updated
      })

      // Auto-open the chat widget and navigate to the conversation thread
      setChatOpen(true)
      const conv = conversationsRef.current.find(c => c.uuid === data.conversation_uuid)
      if (conv) {
        openThreadRef.current(conv)
      } else {
        // Conversation not loaded yet — reload list, then open when available
        chatService.getConversations().then(res => {
          const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
          setConversations(list)
          const found = list.find(c => c.uuid === data.conversation_uuid)
          if (found) openThreadRef.current(found)
        }).catch(() => {})
      }
    })

    userChannel.bind('presence.updated', (data: PusherPresenceEvent) => {
      setOnlineStatus(prev => { const m = new Map(prev); m.set(data.user_id, data.status); return m })
    })

    // ── Call events ─────────────────────────────────────────────────────────

    userChannel.bind('call.incoming', (data: CallData) => {
      if (callPhaseRef.current !== 'idle') {
        chatService.endCall(data.conversation_uuid, data.call_id, 'busy').catch(() => {})
        return
      }
      const session: CallSession = {
        callId: data.call_id, convUuid: data.conversation_uuid,
        callType: data.call_type, remoteUserId: data.caller.id,
        remoteName: data.caller.name, isCaller: false,
      }
      callSessionRef.current = session; setCallSession(session)
      callPhaseRef.current = 'incoming'; setCallPhase('incoming')
      // Auto-open widget so user sees the ringing UI
      setChatOpen(true)
    })

    userChannel.bind('call.accepted', (data: CallAcceptedData) => {
      if (callPhaseRef.current !== 'calling') return
      const session = callSessionRef.current; if (!session) return
      ;(async () => {
        try {
          const iceRes = await chatService.getIceServers()
          const iceServers = iceRes.data?.data?.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }]
          const peer = await buildPeer(session, iceServers)
          callPhaseRef.current = 'active'; setCallPhase('active')
          startCallTimer()
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          await chatService.callSignal(session.convUuid, { call_id: session.callId, signal_type: 'offer', signal_data: offer as RTCSessionDescriptionInit, target_user_id: data.accepted_by.id })
        } catch { toast.error('Call setup failed'); cleanupCall() }
      })()
    })

    userChannel.bind('call.signal', (data: CallSignalData) => {
      const session = callSessionRef.current
      if (!session || data.call_id !== session.callId) return
      ;(async () => {
        const peer = peerRef.current
        if (data.signal_type === 'offer') {
          if (!peer) { pendingOfferRef.current = data.signal_data as RTCSessionDescriptionInit; return }
          await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit)
          for (const c of pendingIceRef.current) { await peer.addIceCandidate(c).catch(() => {}) }
          pendingIceRef.current = []
          const answer = await peer.createAnswer()
          await peer.setLocalDescription(answer)
          await chatService.callSignal(session.convUuid, { call_id: session.callId, signal_type: 'answer', signal_data: answer as RTCSessionDescriptionInit, target_user_id: data.from_user.id })
        } else if (data.signal_type === 'answer') {
          if (peer) await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit).catch(() => {})
        } else if (data.signal_type === 'ice-candidate') {
          const candidate = data.signal_data as RTCIceCandidateInit
          if (peer?.remoteDescription) { await peer.addIceCandidate(candidate).catch(() => {}) }
          else { pendingIceRef.current.push(candidate) }
        }
      })()
    })

    userChannel.bind('call.ended', (data: CallEndedData) => {
      const session = callSessionRef.current
      if (!session || data.call_id !== session.callId) return
      toast(data.reason === 'declined' ? `${data.ended_by.name} declined` : data.reason === 'busy' ? `${data.ended_by.name} is busy` : 'Call ended', { icon: '📞' })
      cleanupCall()
    })

    // Mark presence
    chatService.updatePresence('online').catch(() => {})
    const heartbeat = setInterval(() => chatService.updatePresence('online').catch(() => {}), 30000)

    return () => {
      clearInterval(heartbeat)
      chatService.updatePresence('offline').catch(() => {})
      userChannel.unbind_all()
      pusher.unsubscribe(`private-team-user.${user.parent_id}.${user.id}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [user?.id, token, isOnChatPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Pusher — conversation channel ────────────────────────────────────────

  useEffect(() => {
    if (!selectedConv || !user || !token || isOnChatPage) return
    if (!pusherRef.current) return
    const uuid = selectedConv.uuid
    const parentId = user.parent_id
    const userId = user.id
    const channelName = `private-team-chat.${parentId}.${uuid}`
    const channel = pusherRef.current.subscribe(channelName)
    convChannelRef.current = channel

    channel.bind('message.sent', (data: ChatMessage & { conversation_uuid: string }) => {
      const isMine = data.sender?.id === userId
      const msg: ChatMessage = { ...data, is_mine: isMine }
      setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
      if (!isMine && document.hasFocus()) {
        chatService.markAsRead(uuid).catch(() => {})
        setConversations(prev => prev.map(c =>
          c.uuid === uuid ? { ...c, unread_count: 0 } : c
        ))
        setTotalUnread(prev => Math.max(0, prev - 1))
      }
    })

    channel.bind('message.read', (data: PusherMessageReadEvent) => {
      if (data.reader_id === userId) return
      setMessages(prev => prev.map(m =>
        m.is_mine ? { ...m, is_read: true } : m
      ))
    })

    channel.bind('user.typing', (data: PusherTypingEvent) => {
      if (data.user_id === userId) return
      setTypingName(data.name)
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
      typingTimerRef.current = setTimeout(() => setTypingName(null), 3000)
    })

    return () => {
      channel.unbind_all()
      pusherRef.current?.unsubscribe(channelName)
      convChannelRef.current = null
    }
  }, [selectedConv?.uuid, user?.id, token, isOnChatPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Select conversation ───────────────────────────────────────────────────

  const openThread = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv)
    setView('thread')
    setMessages([])
    setLoadingMsgs(true)
    try {
      const res = await chatService.getMessages(conv.uuid)
      setMessages(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch { toast.error('Could not load messages') }
    finally { setLoadingMsgs(false) }
    chatService.markAsRead(conv.uuid).catch(() => {})
    setConversations(prev => prev.map(c =>
      c.uuid === conv.uuid ? { ...c, unread_count: 0 } : c
    ))
    setTotalUnread(prev => Math.max(0, prev - (conv.unread_count ?? 0)))
  }, [])

  // Keep ref in sync so Pusher callbacks can call the latest version
  useEffect(() => { openThreadRef.current = openThread }, [openThread])

  // ─── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!selectedConv) return

    if (pendingFile) {
      setSending(true)
      try {
        const res = await chatService.uploadAttachment(selectedConv.uuid, pendingFile)
        const msg: ChatMessage = { ...res.data.data, is_mine: true }
        setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
        setPendingFile(null)
      } catch { toast.error('Upload failed') }
      finally { setSending(false) }
      return
    }

    const body = input.trim()
    if (!body) return
    setInput('')
    setSending(true)
    try {
      const res = await chatService.sendMessage(selectedConv.uuid, body)
      const msg: ChatMessage = { ...res.data.data, is_mine: true }
      setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
    } catch {
      setInput(body)
      toast.error('Failed to send')
    } finally { setSending(false) }
  }, [selectedConv, input, pendingFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (!selectedConv) return
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      chatService.sendTyping(selectedConv.uuid).catch(() => {})
    }, 400)
  }

  // ─── Call helpers ──────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    pendingIceRef.current = []; pendingOfferRef.current = null
    callPhaseRef.current = 'idle'; setCallPhase('idle')
    callSessionRef.current = null; setCallSession(null)
    setCallSeconds(0); setIsMuted(false); setIsCameraOff(false)
  }, [])

  const startCallTimer = useCallback(() => {
    setCallSeconds(0)
    if (callTimerRef.current) clearInterval(callTimerRef.current)
    callTimerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000)
  }, [])

  const buildPeer = useCallback(async (session: CallSession, iceServers: RTCIceServer[]) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: session.callType === 'video' })
    localStreamRef.current = stream
    if (session.callType === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream

    const peer = new RTCPeerConnection({ iceServers })
    peerRef.current = peer
    stream.getTracks().forEach(t => peer.addTrack(t, stream))

    peer.ontrack = (e) => {
      const s = e.streams[0]
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = s
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = s
    }
    peer.onicecandidate = (e) => {
      const sess = callSessionRef.current
      if (e.candidate && sess) {
        chatService.callSignal(sess.convUuid, {
          call_id: sess.callId, signal_type: 'ice-candidate',
          signal_data: e.candidate.toJSON() as RTCIceCandidateInit,
          target_user_id: sess.remoteUserId,
        }).catch(() => {})
      }
    }
    return peer
  }, [])

  const startCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!selectedConv || callPhaseRef.current !== 'idle') return
    if (selectedConv.type !== 'direct') { toast('Group calls coming soon!', { icon: '🎙️' }); return }
    const other = selectedConv.participants.find(p => p.user_id !== user?.id)
    if (!other) return
    try {
      const res = await chatService.initiateCall(selectedConv.uuid, callType)
      const data = res.data?.data; if (!data) return
      const session: CallSession = { callId: data.call_id, convUuid: selectedConv.uuid, callType, remoteUserId: other.user_id, remoteName: other.name, isCaller: true }
      callSessionRef.current = session; setCallSession(session)
      callPhaseRef.current = 'calling'; setCallPhase('calling')
    } catch { toast.error('Failed to start call') }
  }, [selectedConv, user?.id])

  const acceptIncomingCall = useCallback(async () => {
    const session = callSessionRef.current
    if (!session || callPhaseRef.current !== 'incoming') return
    try {
      await chatService.acceptCall(session.convUuid, session.callId, session.remoteUserId)
      const iceRes = await chatService.getIceServers()
      const iceServers = iceRes.data?.data?.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }]
      const peer = await buildPeer(session, iceServers)
      callPhaseRef.current = 'active'; setCallPhase('active')
      startCallTimer()
      if (pendingOfferRef.current) {
        await peer.setRemoteDescription(pendingOfferRef.current)
        for (const c of pendingIceRef.current) { await peer.addIceCandidate(c).catch(() => {}) }
        pendingIceRef.current = []
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await chatService.callSignal(session.convUuid, { call_id: session.callId, signal_type: 'answer', signal_data: answer as RTCSessionDescriptionInit, target_user_id: session.remoteUserId })
        pendingOfferRef.current = null
      }
    } catch { toast.error('Failed to accept call'); cleanupCall() }
  }, [buildPeer, startCallTimer, cleanupCall])

  const declineCall = useCallback(async () => {
    const session = callSessionRef.current; if (!session) return
    try { await chatService.endCall(session.convUuid, session.callId, 'declined') } catch {}
    cleanupCall()
  }, [cleanupCall])

  const endCurrentCall = useCallback(async () => {
    const session = callSessionRef.current; if (!session) return
    try { await chatService.endCall(session.convUuid, session.callId, 'ended') } catch {}
    cleanupCall()
  }, [cleanupCall])

  const toggleMute = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setIsMuted(m => !m)
  }, [])

  const toggleCamera = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setIsCameraOff(c => !c)
  }, [])

  // ─── Group created ────────────────────────────────────────────────────────

  const handleGroupCreated = useCallback(async (uuid: string) => {
    setShowCreateGroup(false)
    const res = await chatService.getConversations()
    const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
    setConversations(list)
    const conv = list.find(c => c.uuid === uuid)
    if (conv) openThread(conv)
  }, [openThread])

  // ─── Open DM with a team member ───────────────────────────────────────────

  const openDmWith = useCallback(async (memberId: number) => {
    try {
      const res = await chatService.getOrCreateDirect(memberId)
      const { uuid } = res.data.data
      const convRes = await chatService.getConversations()
      const list: Conversation[] = Array.isArray(convRes.data?.data) ? convRes.data.data : []
      setConversations(list)
      const conv = list.find(c => c.uuid === uuid)
      if (conv) openThread(conv)
    } catch { toast.error('Could not open conversation') }
  }, [openThread])

  // ─── Back to list ──────────────────────────────────────────────────────────

  const backToList = () => {
    setView('list')
    setSelectedConv(null)
    setMessages([])
    setInput('')
    setPendingFile(null)
    setTypingName(null)
  }

  // Sync unread count to floating store so FloatingFab can display the badge
  useEffect(() => { setChatUnread(totalUnread) }, [totalUnread, setChatUnread])

  // ─── Render ───────────────────────────────────────────────────────────────

  // Header left slot — changes between list view and thread view
  const headerLeft = view === 'thread' && selectedConv ? (
    <>
      <button
        onClick={backToList}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors flex-shrink-0"
        title="Back to conversations"
      >
        <ArrowLeft className="w-3.5 h-3.5 text-white" />
      </button>
      <div className={cn(
        'w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',
        avatarBg(selectedConv.uuid.charCodeAt(0)),
      )}>
        {selectedConv.type === 'group' ? <Hash className="w-3 h-3" /> : initials(selectedConv.name)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{selectedConv.name}</p>
        {selectedConv.type === 'group' && (
          <p className="text-[10px] text-white/60 leading-none mt-0.5">{selectedConv.participants.length} members</p>
        )}
      </div>
    </>
  ) : (
    <>
      <MessageSquare className="w-4 h-4 text-white/80 flex-shrink-0" />
      <span className="text-sm font-semibold text-white">Team Chat</span>
      {totalUnread > 0 && (
        <span className="min-w-[18px] h-[18px] px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white/30">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}
    </>
  )

  // Header right slot
  const headerRight = view === 'list' ? (
    <button
      onClick={() => setShowCreateGroup(true)}
      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
      title="Create group"
    >
      <Plus className="w-3.5 h-3.5 text-white" />
    </button>
  ) : view === 'thread' && selectedConv?.type === 'direct' && callPhase === 'idle' ? (
    // Call buttons — DM thread only, no active call
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall('audio')}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-emerald-500/70 flex items-center justify-center transition-colors"
        title="Audio call"
      >
        <Phone className="w-3.5 h-3.5 text-white" />
      </button>
      <button
        onClick={() => startCall('video')}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-indigo-500/70 flex items-center justify-center transition-colors"
        title="Video call"
      >
        <Video className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  ) : undefined

  return (
    <>
      <DraggableWidget
        isOpen={isOpen}
        onClose={() => setChatOpen(false)}
        headerLeft={headerLeft}
        headerRight={headerRight}
        headerGradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
        defaultRight={16}
        defaultBottom={20}
        width={340}
        zIndex={62}
        bodyHeight={480}
      >
        <div style={{ height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Call UI takes over the body during calling/incoming/audio-active states */}
          {callSession && (callPhase === 'calling' || callPhase === 'incoming' || (callPhase === 'active' && callSession.callType === 'audio')) ? (
            <WidgetCallPanel
              phase={callPhase}
              session={callSession}
              isMuted={isMuted}
              callSeconds={callSeconds}
              onAccept={acceptIncomingCall}
              onDecline={declineCall}
              onEnd={endCurrentCall}
              onMute={toggleMute}
              remoteAudioRef={remoteAudioRef}
            />
          ) : view === 'list' ? (
            <ConversationList
              conversations={conversations}
              teamMembers={teamMembers}
              onlineStatus={onlineStatus}
              currentUserId={user?.id}
              onSelect={openThread}
              onNewGroup={() => setShowCreateGroup(true)}
              onOpenDm={openDmWith}
            />
          ) : (
            <ThreadView
              conv={selectedConv!}
              messages={messages}
              loading={loadingMsgs}
              input={input}
              pendingFile={pendingFile}
              sending={sending}
              typingName={typingName}
              showEmoji={showEmoji}
              user={user}
              messagesEndRef={messagesEndRef}
              fileInputRef={fileInputRef}
              onBack={backToList}
              onInput={handleInputChange}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              onEmojiToggle={() => setShowEmoji(v => !v)}
              onEmojiSelect={e => { handleInputChange(input + e); setShowEmoji(false) }}
              onEmojiClose={() => setShowEmoji(false)}
              onFileSelect={f => { setPendingFile(f); setInput('') }}
              onFileClear={() => setPendingFile(null)}
            />
          )}
        </div>
      </DraggableWidget>

      {/* Full-screen video overlay for active video calls */}
      {callPhase === 'active' && callSession?.callType === 'video' && (
        <VideoCallOverlay
          session={callSession}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          callSeconds={callSeconds}
          onMute={toggleMute}
          onCamera={toggleCamera}
          onEnd={endCurrentCall}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
        />
      )}

      {showCreateGroup && (
        <CreateGroupModal
          members={teamMembers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </>
  )
}

// ─── ConversationList ─────────────────────────────────────────────────────────

interface ConvListProps {
  conversations: Conversation[]
  teamMembers: SearchUser[]
  onlineStatus: Map<number, string>
  currentUserId: number | undefined
  onSelect: (c: Conversation) => void
  onNewGroup: () => void
  onOpenDm: (memberId: number) => void
}

function ConversationList({ conversations, teamMembers, onlineStatus, onSelect, onNewGroup, onOpenDm }: ConvListProps) {
  const systemConvs = conversations.filter(c => c.is_system)
  const groupConvs = conversations.filter(c => c.type === 'group' && !c.is_system)
  const directConvs = conversations.filter(c => c.type === 'direct')

  const systemIcon = (slug: string | null | undefined) =>
    slug === 'lender' ? <Building2 className="w-4 h-4" /> :
    slug === 'merchant' ? <Store className="w-4 h-4" /> :
    <Hash className="w-4 h-4" />

  return (
    <div className="flex-1 overflow-y-auto">

      {/* ── Channels (system) ── */}
      {systemConvs.length > 0 && (
        <div>
          <div className="flex items-center px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Channels</p>
          </div>
          {systemConvs.map(conv => {
            const unread = conv.unread_count ?? 0
            const lm = conv.last_message
            return (
              <button
                key={conv.uuid}
                onClick={() => onSelect(conv)}
                className="w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
              >
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', conv.system_slug === 'lender' ? 'bg-violet-500' : 'bg-emerald-500')}>
                  {systemIcon(conv.system_slug)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{conv.name}</p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {lm && <span className="text-[10px] text-slate-400">{msgTime(lm.created_at)}</span>}
                      {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
                    </div>
                  </div>
                  {lm && <p className="text-xs text-slate-400 truncate mt-0.5">{lm.body}</p>}
                  {!lm && <p className="text-xs text-slate-400 mt-0.5">Broadcast channel</p>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* ── Groups ── */}
      <div>
        <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Groups</p>
          <button
            onClick={onNewGroup}
            title="Create group"
            className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
          </button>
        </div>
        {groupConvs.length === 0 && (
          <button
            onClick={onNewGroup}
            className="w-full flex items-center gap-2 px-3.5 py-1.5 text-xs text-slate-400 hover:text-indigo-500 hover:bg-slate-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Create your first group
          </button>
        )}
        {groupConvs.map(conv => {
          const unread = conv.unread_count ?? 0
          const lm = conv.last_message
          return (
            <button
              key={conv.uuid}
              onClick={() => onSelect(conv)}
              className="w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
            >
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', avatarBg(conv.uuid.charCodeAt(0)))}>
                <Hash className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>{conv.name}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lm && <span className="text-[10px] text-slate-400">{msgTime(lm.created_at)}</span>}
                    {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">{unread > 9 ? '9+' : unread}</span>}
                  </div>
                </div>
                {lm && <p className="text-xs text-slate-400 truncate mt-0.5">{lm.message_type === 'image' ? '📷 Image' : lm.message_type === 'file' ? '📎 File' : lm.body}</p>}
                {!lm && <p className="text-xs text-slate-400 mt-0.5">{conv.participants.length} members</p>}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── People ── */}
      {teamMembers.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">People</p>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {teamMembers.filter(m => (onlineStatus.get(m.id) ?? m.status) === 'online').length} online
            </span>
          </div>
          {teamMembers.map(member => {
            const effectiveStatus = (onlineStatus.get(member.id) ?? member.status) as string
            const dotColor =
              effectiveStatus === 'online' ? 'bg-emerald-400' :
              effectiveStatus === 'away'   ? 'bg-amber-400'   :
              effectiveStatus === 'busy'   ? 'bg-rose-400'    : 'bg-slate-300'
            const existingDm = directConvs.find(c => c.participants.some(p => p.user_id === member.id))
            const unread = existingDm?.unread_count ?? 0
            return (
              <button
                key={member.id}
                onClick={() => onOpenDm(member.id)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
              >
                <div className="relative flex-shrink-0">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold', avatarBg(member.id))}>
                    {initials(member.name)}
                  </div>
                  <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', dotColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{effectiveStatus}</p>
                </div>
                {unread > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── ThreadView ───────────────────────────────────────────────────────────────

interface ThreadProps {
  conv: Conversation
  messages: ChatMessage[]
  loading: boolean
  input: string
  pendingFile: File | null
  sending: boolean
  typingName: string | null
  showEmoji: boolean
  user: { id: number; name: string } | null
  messagesEndRef: React.RefObject<HTMLDivElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  onBack: () => void
  onInput: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onEmojiToggle: () => void
  onEmojiSelect: (e: string) => void
  onEmojiClose: () => void
  onFileSelect: (f: File) => void
  onFileClear: () => void
}

function ThreadView({
  conv, messages, loading, input, pendingFile, sending, typingName,
  showEmoji, user, messagesEndRef, fileInputRef,
  onBack, onInput, onSend, onKeyDown,
  onEmojiToggle, onEmojiSelect, onEmojiClose, onFileSelect, onFileClear,
}: ThreadProps) {
  return (
    <>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-0.5" style={{ background: '#f8fafc' }}>
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold', avatarBg(conv.uuid.charCodeAt(0)))}>
              {conv.type === 'group' ? <Users className="w-5 h-5" /> : initials(conv.name)}
            </div>
            <p className="text-xs text-slate-500 text-center">Start the conversation with {conv.name}</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const prev = messages[i - 1]
          const isGrouped = prev &&
            prev.sender?.id === msg.sender?.id &&
            new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000 &&
            msg.message_type !== 'system'
          const isMine = msg.is_mine

          if (msg.message_type === 'system') {
            return (
              <div key={msg.uuid} className="flex justify-center my-2">
                <span className="text-[10px] text-slate-400 bg-slate-200/70 px-2.5 py-1 rounded-full">{msg.body}</span>
              </div>
            )
          }

          return (
            <div key={msg.uuid} className={cn('flex gap-2 items-end', isMine ? 'flex-row-reverse' : 'flex-row', isGrouped ? 'mt-0.5' : 'mt-2.5')}>
              {/* Avatar */}
              {!isMine && (
                <div className="flex-shrink-0 w-7">
                  {!isGrouped ? (
                    <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold', avatarBg(msg.sender.id))}>
                      {initials(msg.sender.name)}
                    </div>
                  ) : null}
                </div>
              )}

              <div className={cn('flex flex-col max-w-[78%]', isMine ? 'items-end' : 'items-start')}>
                {!isGrouped && !isMine && (
                  <p className="text-[10px] font-semibold text-slate-500 mb-0.5 px-1">{msg.sender.name}</p>
                )}

                {/* File attachment */}
                {(msg.message_type === 'file' || msg.message_type === 'image') && msg.attachments.length > 0 ? (
                  <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-2xl text-xs',
                    isMine ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-white border border-slate-200 text-slate-700',
                  )}
                    style={isMine ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' } : {}}
                  >
                    <FileText className={cn('w-4 h-4 flex-shrink-0', isMine ? 'text-white/70' : 'text-indigo-400')} />
                    <span className="truncate max-w-[140px]">{msg.attachments[0].original_name}</span>
                  </div>
                ) : (
                  /* Text bubble */
                  <div
                    className={cn(
                      'px-3 py-2 text-sm leading-relaxed rounded-2xl break-words whitespace-pre-wrap',
                      isMine ? 'rounded-br-sm text-white' : 'rounded-bl-sm bg-white border border-slate-200 text-slate-800',
                    )}
                    style={isMine ? {
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                      boxShadow: '0 2px 6px rgba(79,70,229,.2)',
                    } : { boxShadow: '0 1px 2px rgba(0,0,0,.05)' }}
                  >
                    {msg.body}
                  </div>
                )}

                {/* Time + status */}
                <div className={cn('flex items-center gap-1 mt-0.5 px-0.5', isMine ? 'flex-row-reverse' : 'flex-row')}>
                  <span className="text-[10px] text-slate-400">{msgTime(msg.created_at)}</span>
                  {isMine && (
                    msg.is_read
                      ? <CheckCheck className="w-3 h-3 text-indigo-500" />
                      : msg.is_delivered
                      ? <CheckCheck className="w-3 h-3 text-slate-400" />
                      : <Check className="w-3 h-3 text-slate-400" />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing */}
        {typingName && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 flex-shrink-0" />
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-2xl rounded-bl-sm flex items-center gap-1 shadow-sm">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-[10px] text-slate-400 pb-1">{typingName}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / read-only notice */}
      {conv.is_system ? (
        <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400">This is a read-only broadcast channel</p>
        </div>
      ) : (
      <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-100 bg-white">
        {/* File preview */}
        {pendingFile && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 bg-indigo-50 rounded-lg">
            <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-indigo-700 truncate flex-1">{pendingFile.name}</span>
            <button onClick={onFileClear} className="text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="flex items-end gap-1.5">
          {/* Emoji */}
          <div className="relative flex-shrink-0">
            <button
              onClick={onEmojiToggle}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Smile className="w-4 h-4" />
            </button>
            {showEmoji && (
              <>
                <div className="fixed inset-0 z-20" onClick={onEmojiClose} />
                <div className="absolute bottom-9 left-0 z-30 bg-white border border-slate-200 rounded-xl shadow-xl p-2 w-56">
                  <div className="grid grid-cols-8 gap-0.5">
                    {COMMON_EMOJIS.map(e => (
                      <button key={e} onClick={() => onEmojiSelect(e)} className="w-6 h-6 flex items-center justify-center text-base rounded hover:bg-slate-100 transition-colors">
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* File attach */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
          />

          {/* Textarea */}
          <textarea
            rows={1}
            placeholder="Message…"
            className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 transition-colors"
            style={{ minHeight: '36px', maxHeight: '90px' }}
            value={input}
            onChange={e => {
              onInput(e.target.value)
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 90) + 'px'
            }}
            onKeyDown={onKeyDown}
          />

          {/* Send */}
          <button
            onClick={onSend}
            disabled={(!input.trim() && !pendingFile) || sending}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all hover:shadow-lg active:scale-95"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {sending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Send className="w-3.5 h-3.5" />
            }
          </button>
        </div>
      </div>
      )}
    </>
  )
}
