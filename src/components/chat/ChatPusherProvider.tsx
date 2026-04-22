import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import Pusher from 'pusher-js'
import toast from 'react-hot-toast'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore } from '../../stores/floating.store'
import type {
  Conversation, SearchUser,
  PusherNewMessageEvent, PusherPresenceEvent,
  CallData, CallSignalData, CallAcceptedData, CallEndedData,
} from '../../types/chat.types'

// ─── Call types (exported for use by MiniChatWindow) ─────────────────────────

export interface CallSession {
  callId: string
  convUuid: string
  callType: 'audio' | 'video'
  remoteUserId: number
  remoteName: string
  isCaller: boolean
}

export type CallPhase = 'idle' | 'calling' | 'incoming' | 'active'

// ─── Context shape ───────────────────────────────────────────────────────────

interface ChatPusherContextValue {
  conversations: Conversation[]
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
  totalUnread: number
  setTotalUnread: React.Dispatch<React.SetStateAction<number>>
  teamMembers: SearchUser[]
  onlineStatus: Map<number, string>
  loadConversations: () => Promise<void>
  pusherRef: React.MutableRefObject<Pusher | null>
  // Call state
  callPhase: CallPhase
  callSession: CallSession | null
  isMuted: boolean
  isCameraOff: boolean
  callSeconds: number
  // Call actions
  startCall: (conv: Conversation, callType: 'audio' | 'video') => Promise<void>
  acceptIncomingCall: () => Promise<void>
  declineCall: () => Promise<void>
  endCurrentCall: () => Promise<void>
  toggleMute: () => void
  toggleCamera: () => void
  // Call media refs
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  // Stream refs (for late-mounting video elements)
  remoteStreamRef: React.RefObject<MediaStream | null>
  localStreamRef: React.RefObject<MediaStream | null>
}

const ChatPusherContext = createContext<ChatPusherContextValue | null>(null)

export function useChatPusher() {
  const ctx = useContext(ChatPusherContext)
  if (!ctx) throw new Error('useChatPusher must be used within ChatPusherProvider')
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ChatPusherProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuthStore()
  const location = useLocation()
  const isOnChatPage = location.pathname === '/chat'

  const setChatOpen    = useFloatingStore(s => s.setChatOpen)
  const setChatUnread  = useFloatingStore(s => s.setChatUnread)
  const openChatWindow = useFloatingStore(s => s.openChatWindow)

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [teamMembers, setTeamMembers] = useState<SearchUser[]>([])
  const [onlineStatus, setOnlineStatus] = useState<Map<number, string>>(new Map())

  // ── Call state ────────────────────────────────────────────────────────────
  const [callPhase, setCallPhase] = useState<CallPhase>('idle')
  const [callSession, setCallSession] = useState<CallSession | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const pusherRef = useRef<Pusher | null>(null)
  const conversationsRef = useRef<Conversation[]>([])
  const callPhaseRef = useRef<CallPhase>('idle')
  const callSessionRef = useRef<CallSession | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync state -> refs for stable Pusher callbacks
  useEffect(() => { callPhaseRef.current = callPhase }, [callPhase])
  useEffect(() => { callSessionRef.current = callSession }, [callSession])
  useEffect(() => { conversationsRef.current = conversations }, [conversations])

  // ── Load conversations ────────────────────────────────────────────────────

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

  // Sync unread to floating store for FAB badge
  useEffect(() => { setChatUnread(totalUnread) }, [totalUnread, setChatUnread])

  // ── Call helpers ──────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    remoteStreamRef.current = null
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null
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

  const attachRemoteStream = useCallback((stream: MediaStream) => {
    remoteStreamRef.current = stream
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream
    const audio = remoteAudioRef.current
    if (audio) {
      audio.srcObject = stream
      audio.muted = false
      audio.volume = 1.0
      const p = audio.play()
      if (p) p.catch(err => {
        console.warn('[TeamChat] audio.play() blocked:', err.name)
        const resume = () => { audio.play().catch(() => {}); document.removeEventListener('click', resume) }
        document.addEventListener('click', resume, { once: true })
      })
      console.log('[TeamChat] Audio attached — tracks:', stream.getAudioTracks().map(t => t.readyState))
    } else {
      console.warn('[TeamChat] remoteAudioRef null — stream buffered')
    }
  }, [])

  const buildPeer = useCallback(async (session: CallSession, iceServers: RTCIceServer[]) => {
    console.log('[TeamChat] buildPeer — type:', session.callType, 'iceServers:', iceServers.length)

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: session.callType === 'video' })
    localStreamRef.current = stream
    console.log('[TeamChat] Local tracks:', stream.getTracks().map(t => `${t.kind}:${t.readyState}`))
    if (session.callType === 'video' && localVideoRef.current) localVideoRef.current.srcObject = stream

    const peer = new RTCPeerConnection({ iceServers })
    peerRef.current = peer
    stream.getTracks().forEach(t => peer.addTrack(t, stream))

    peer.ontrack = (e) => {
      console.log('[TeamChat] ontrack — kind:', e.track.kind, 'state:', e.track.readyState, 'streams:', e.streams.length)
      const s = e.streams[0] ?? new MediaStream([e.track])
      attachRemoteStream(s)
    }

    peer.oniceconnectionstatechange = () => {
      console.log('[TeamChat] ICE state:', peer.iceConnectionState)
      if (peer.iceConnectionState === 'failed') {
        console.error('[TeamChat] ICE FAILED — check TURN servers / network')
        toast.error('Connection failed — network issue')
      }
    }

    peer.onconnectionstatechange = () => {
      console.log('[TeamChat] Connection state:', peer.connectionState)
    }

    peer.onicecandidate = (e) => {
      const sess = callSessionRef.current
      if (e.candidate && sess) {
        chatService.callSignal(sess.convUuid, {
          call_id: sess.callId, signal_type: 'ice-candidate',
          signal_data: e.candidate.toJSON() as RTCIceCandidateInit,
          target_user_id: sess.remoteUserId,
        }).catch(err => console.warn('[TeamChat] ICE signal error:', err))
      }
    }
    return peer
  }, [attachRemoteStream])

  const startCall = useCallback(async (conv: Conversation, callType: 'audio' | 'video') => {
    if (callPhaseRef.current !== 'idle') return
    if (conv.type !== 'direct') { toast('Group calls coming soon!', { icon: '🎙️' }); return }
    const other = conv.participants.find(p => p.user_id !== user?.id)
    if (!other) return
    try {
      const res = await chatService.initiateCall(conv.uuid, callType)
      const data = res.data?.data; if (!data) return
      const session: CallSession = { callId: data.call_id, convUuid: conv.uuid, callType, remoteUserId: other.user_id, remoteName: other.name, isCaller: true }
      callSessionRef.current = session; setCallSession(session)
      callPhaseRef.current = 'calling'; setCallPhase('calling')
    } catch { toast.error('Failed to start call') }
  }, [user?.id])

  const acceptIncomingCall = useCallback(async () => {
    const session = callSessionRef.current
    if (!session || callPhaseRef.current !== 'incoming') return
    try {
      await chatService.acceptCall(session.convUuid, session.callId, session.remoteUserId)
      const iceRes = await chatService.getIceServers()
      const iceServers = iceRes.data?.data?.iceServers ?? [
            { urls: `stun:${import.meta.env.VITE_TURN_SERVER_HOST || 'sip3.linkswitchcommunications.com'}:3478` },
            { urls: `turn:${import.meta.env.VITE_TURN_SERVER_HOST || 'sip3.linkswitchcommunications.com'}:3478?transport=tcp`, username: import.meta.env.VITE_TURN_SERVER_USERNAME || '89789798', credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || 'dwuedjniu' },
          ]
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

  // ── Pusher — global user channel (skip on /chat page) ────────────────────

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

      // Auto-open mini window if under limit and not already open
      const { openChatWindows } = useFloatingStore.getState()
      if (!openChatWindows.includes(data.conversation_uuid) && openChatWindows.length < 4) {
        const conv = conversationsRef.current.find(c => c.uuid === data.conversation_uuid)
        if (conv) {
          setChatOpen(true)
          openChatWindow(conv)
        } else {
          chatService.getConversations().then(res => {
            const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
            setConversations(list)
            const found = list.find(c => c.uuid === data.conversation_uuid)
            if (found) {
              setChatOpen(true)
              openChatWindow(found)
            }
          }).catch(() => {})
        }
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
      setChatOpen(true)
      // Auto-open the conversation's mini window
      const conv = conversationsRef.current.find(c => c.uuid === data.conversation_uuid)
      if (conv) openChatWindow(conv)
    })

    userChannel.bind('call.accepted', (data: CallAcceptedData) => {
      console.log('[TeamChat] call.accepted by:', data.accepted_by.id, 'phase:', callPhaseRef.current)
      if (callPhaseRef.current !== 'calling') return
      const session = callSessionRef.current; if (!session) return
      ;(async () => {
        try {
          const iceRes = await chatService.getIceServers()
          const iceServers = iceRes.data?.data?.iceServers ?? [
            { urls: `stun:${import.meta.env.VITE_TURN_SERVER_HOST || 'sip3.linkswitchcommunications.com'}:3478` },
            { urls: `turn:${import.meta.env.VITE_TURN_SERVER_HOST || 'sip3.linkswitchcommunications.com'}:3478?transport=tcp`, username: import.meta.env.VITE_TURN_SERVER_USERNAME || '89789798', credential: import.meta.env.VITE_TURN_SERVER_CREDENTIAL || 'dwuedjniu' },
          ]
          console.log('[TeamChat] ICE servers from API:', JSON.stringify(iceServers.map((s: RTCIceServer) => s.urls)))
          const peer = await buildPeer(session, iceServers)
          callPhaseRef.current = 'active'; setCallPhase('active')
          startCallTimer()
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          console.log('[TeamChat] Offer created, sending to:', data.accepted_by.id)
          await chatService.callSignal(session.convUuid, { call_id: session.callId, signal_type: 'offer', signal_data: offer as RTCSessionDescriptionInit, target_user_id: data.accepted_by.id })
          console.log('[TeamChat] Offer sent successfully')
        } catch (err) { console.error('[TeamChat] call.accepted handler error:', err); toast.error('Call setup failed'); cleanupCall() }
      })()
    })

    userChannel.bind('call.signal', (data: CallSignalData) => {
      const session = callSessionRef.current
      if (!session || data.call_id !== session.callId) return
      console.log('[TeamChat] signal received:', data.signal_type, 'peer exists:', !!peerRef.current)
      ;(async () => {
        try {
          const peer = peerRef.current
          if (data.signal_type === 'offer') {
            if (!peer) { console.log('[TeamChat] Offer queued (peer not ready)'); pendingOfferRef.current = data.signal_data as RTCSessionDescriptionInit; return }
            await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit)
            console.log('[TeamChat] Remote description set (offer), pending ICE:', pendingIceRef.current.length)
            for (const c of pendingIceRef.current) { await peer.addIceCandidate(c).catch(err => console.warn('[TeamChat] addIceCandidate err:', err)) }
            pendingIceRef.current = []
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            console.log('[TeamChat] Sending answer to:', data.from_user.id)
            await chatService.callSignal(session.convUuid, { call_id: session.callId, signal_type: 'answer', signal_data: answer as RTCSessionDescriptionInit, target_user_id: data.from_user.id })
          } else if (data.signal_type === 'answer') {
            if (peer) {
              await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit)
              console.log('[TeamChat] Remote description set (answer)')
            }
          } else if (data.signal_type === 'ice-candidate') {
            const candidate = data.signal_data as RTCIceCandidateInit
            if (peer?.remoteDescription) { await peer.addIceCandidate(candidate).catch(err => console.warn('[TeamChat] addIceCandidate err:', err)) }
            else { pendingIceRef.current.push(candidate) }
          }
        } catch (err) { console.error('[TeamChat] Signal handler error:', err) }
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

  // ── Context value ─────────────────────────────────────────────────────────

  const value: ChatPusherContextValue = {
    conversations, setConversations,
    totalUnread, setTotalUnread,
    teamMembers, onlineStatus,
    loadConversations,
    pusherRef,
    callPhase, callSession,
    isMuted, isCameraOff, callSeconds,
    startCall, acceptIncomingCall, declineCall, endCurrentCall,
    toggleMute, toggleCamera,
    remoteAudioRef, remoteVideoRef, localVideoRef,
    remoteStreamRef, localStreamRef,
  }

  return (
    <ChatPusherContext.Provider value={value}>
      {children}
      {/* Always-mounted audio element so remoteAudioRef is never null when ontrack fires */}
      <audio
        ref={(el) => {
          (remoteAudioRef as React.MutableRefObject<HTMLAudioElement | null>).current = el
          if (el && remoteStreamRef.current && !el.srcObject) {
            el.srcObject = remoteStreamRef.current
            el.play().catch(() => {})
          }
        }}
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />
    </ChatPusherContext.Provider>
  )
}
