import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  MessageSquare, ArrowLeft, Plus, Hash, X,
  Phone, Video, Minimize2,
} from 'lucide-react'
import { useFloatingStore } from '../../stores/floating.store'
import { useAuthStore } from '../../stores/auth.store'
import { ChatPusherProvider, useChatPusher } from './ChatPusherProvider'
import { ChatListWidget, ConversationList } from './ChatListWidget'
import { MiniChatWindow, VideoCallOverlay, ThreadView } from './MiniChatWindow'
import { DraggableWidget } from '../floating/DraggableWidget'
import { chatService } from '../../services/chat.service'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type { Conversation, ChatMessage } from '../../types/chat.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-teal-500', 'bg-orange-500',
]
function avatarBg(seed: number) { return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length] }

// ─── MobileChatWidget — single-panel fallback for <768px ─────────────────────

function MobileChatWidget() {
  const { user } = useAuthStore()
  const isOpen      = useFloatingStore(s => s.chatOpen)
  const setChatOpen = useFloatingStore(s => s.setChatOpen)
  const navigate = useNavigate()

  const {
    conversations, setConversations, totalUnread, teamMembers, onlineStatus,
    loadConversations,
    callPhase, callSession, isMuted, callSeconds,
    startCall, acceptIncomingCall, declineCall, endCurrentCall, toggleMute,
  } = useChatPusher()

  const [view, setView] = useState<'list' | 'thread'>('list')
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
  }, [setConversations])

  const backToList = () => {
    setView('list')
    setSelectedConv(null)
    setMessages([])
    setInput('')
    setPendingFile(null)
    setTypingName(null)
  }

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
  }

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
  }, [openThread, setConversations])

  const handleGroupCreated = useCallback(async (uuid: string) => {
    setShowCreateGroup(false)
    const res = await chatService.getConversations()
    const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
    setConversations(list)
    const conv = list.find(c => c.uuid === uuid)
    if (conv) openThread(conv)
  }, [openThread, setConversations])

  // Header
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

  const headerRight = view === 'list' ? (
    <button
      onClick={() => setShowCreateGroup(true)}
      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
      title="Create group"
    >
      <Plus className="w-3.5 h-3.5 text-white" />
    </button>
  ) : view === 'thread' && selectedConv?.type === 'direct' && callPhase === 'idle' ? (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall(selectedConv, 'audio')}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-emerald-500/70 flex items-center justify-center transition-colors"
        title="Audio call"
      >
        <Phone className="w-3.5 h-3.5 text-white" />
      </button>
      <button
        onClick={() => startCall(selectedConv, 'video')}
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
        onMaximize={() => { setChatOpen(false); navigate('/chat') }}
        headerGradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)"
        defaultRight={16}
        defaultBottom={20}
        width={340}
        zIndex={62}
        bodyHeight={480}
      >
        <div style={{ height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'list' ? (
            <ConversationList
              conversations={conversations}
              teamMembers={teamMembers}
              onlineStatus={onlineStatus}
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
    </>
  )
}

// ─── MaximizedChat — full-screen chat overlay ────────────────────────────────

function MaximizedChat() {
  const setChatMaximized = useFloatingStore(s => s.setChatMaximized)
  const setChatOpen = useFloatingStore(s => s.setChatOpen)
  const openChatWindows = useFloatingStore(s => s.openChatWindows)
  const chatWindowConvs = useFloatingStore(s => s.chatWindowConvs)
  const openWindow = useFloatingStore(s => s.openChatWindow)
  const closeChatWindow = useFloatingStore(s => s.closeChatWindow)

  const { conversations, setConversations, totalUnread, teamMembers, onlineStatus, loadConversations } = useChatPusher()
  const { user } = useAuthStore()

  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openThread = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv)
    setMessages([])
    setLoadingMsgs(true)
    try {
      const res = await chatService.getMessages(conv.uuid)
      setMessages(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch { /* ignore */ }
    finally { setLoadingMsgs(false) }
    chatService.markAsRead(conv.uuid).catch(() => {})
    setConversations(prev => prev.map(c =>
      c.uuid === conv.uuid ? { ...c, unread_count: 0 } : c
    ))
  }, [setConversations])

  const handleSend = useCallback(async () => {
    if (!selectedConv) return
    if (pendingFile) {
      setSending(true)
      try {
        const res = await chatService.uploadAttachment(selectedConv.uuid, pendingFile)
        const msg: ChatMessage = { ...res.data.data, is_mine: true }
        setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
        setPendingFile(null)
      } catch { /* ignore */ }
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
    } catch { setInput(body) }
    finally { setSending(false) }
  }, [selectedConv, input, pendingFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="fixed inset-0 flex bg-white" style={{ zIndex: 70 }}>
      {/* Sidebar — conversation list */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 flex flex-col">
        <div
          className="flex items-center justify-between px-4 flex-shrink-0"
          style={{ height: 54, background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-white/80" />
            <span className="text-sm font-semibold text-white">Team Chat</span>
            {totalUnread > 0 && (
              <span className="min-w-[18px] h-[18px] px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white/30">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChatMaximized(false)}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
              title="Restore to widget"
            >
              <Minimize2 size={13} className="text-white" />
            </button>
            <button
              onClick={() => { setChatMaximized(false); setChatOpen(false) }}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-rose-500/80 flex items-center justify-center transition-colors"
              title="Close"
            >
              <X size={13} className="text-white" />
            </button>
          </div>
        </div>
        <ConversationList
          conversations={conversations}
          teamMembers={teamMembers}
          onlineStatus={onlineStatus}
          onSelect={openThread}
          onNewGroup={() => {}}
          onOpenDm={() => {}}
        />
      </div>

      {/* Main — thread view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConv ? (
          <ThreadView
            conv={selectedConv}
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
            onInput={setInput}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onEmojiToggle={() => setShowEmoji(v => !v)}
            onEmojiSelect={e => { setInput(prev => prev + e); setShowEmoji(false) }}
            onEmojiClose={() => setShowEmoji(false)}
            onFileSelect={f => { setPendingFile(f); setInput('') }}
            onFileClear={() => setPendingFile(null)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium">Select a conversation</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DesktopChatLayout — hub + spoke multi-window ────────────────────────────

function DesktopChatLayout() {
  const openChatWindows = useFloatingStore(s => s.openChatWindows)
  const chatWindowConvs = useFloatingStore(s => s.chatWindowConvs)
  const closeChatWindow = useFloatingStore(s => s.closeChatWindow)
  const focusChatWindow = useFloatingStore(s => s.focusChatWindow)

  const {
    callPhase, callSession, isMuted, isCameraOff, callSeconds,
    toggleMute, toggleCamera, endCurrentCall,
    remoteVideoRef, localVideoRef,
    remoteStreamRef, localStreamRef,
  } = useChatPusher()

  return (
    <>
      <ChatListWidget />

      {openChatWindows.map((uuid, idx) => {
        const conv = chatWindowConvs[uuid]
        if (!conv) return null
        // z-index: base 63 + position in array (last = highest)
        const zi = 63 + idx
        return (
          <MiniChatWindow
            key={uuid}
            conv={conv}
            stackIndex={idx}
            zIndex={zi}
            onClose={() => closeChatWindow(uuid)}
            onFocus={() => focusChatWindow(uuid)}
          />
        )
      })}

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
          remoteStreamRef={remoteStreamRef}
          localStreamRef={localStreamRef}
        />
      )}
    </>
  )
}

// ─── FloatingChatOrchestrator ────────────────────────────────────────────────

export function FloatingChatOrchestrator() {
  const location = useLocation()
  const isOnChatPage = location.pathname === '/chat'
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  // Hide entirely on the full /chat page
  if (isOnChatPage) return null

  return (
    <ChatPusherProvider>
      {isMobile ? <MobileChatWidget /> : <DesktopChatLayout />}
    </ChatPusherProvider>
  )
}
