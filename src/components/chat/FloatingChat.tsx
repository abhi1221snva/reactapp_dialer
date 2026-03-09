import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import Pusher from 'pusher-js'
import {
  MessageSquare, X, Send, ArrowLeft, Plus,
  Smile, Paperclip, CheckCheck, Check, Hash,
  FileText, Users, Loader2,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { NewConversationModal } from './NewConversationModal'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore } from '../../stores/floating.store'
import { DraggableWidget } from '../floating/DraggableWidget'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type {
  Conversation, ChatMessage,
  PusherNewMessageEvent, PusherMessageReadEvent, PusherTypingEvent,
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
  const [showNewModal, setShowNewModal] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const convChannelRef = useRef<ReturnType<InstanceType<typeof Pusher>['subscribe']> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // ─── New conversation ──────────────────────────────────────────────────────

  const handleNewConv = useCallback(async (uuid: string) => {
    setShowNewModal(false)
    await loadConversations()
    const res = await chatService.getConversations()
    const list: Conversation[] = Array.isArray(res.data?.data) ? res.data.data : []
    setConversations(list)
    const conv = list.find(c => c.uuid === uuid)
    if (conv) openThread(conv)
  }, [loadConversations, openThread])

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

  // Header right slot — new conv button in list view
  const headerRight = view === 'list' ? (
    <button
      onClick={() => setShowNewModal(true)}
      className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
      title="New conversation"
    >
      <Plus className="w-3.5 h-3.5 text-white" />
    </button>
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
        defaultBottom={80}
        width={340}
        zIndex={62}
        bodyHeight={480}
      >
        <div style={{ height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {view === 'list' ? (
            <ConversationList
              conversations={conversations}
              onSelect={openThread}
              onNew={() => setShowNewModal(true)}
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

      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onConversationCreated={handleNewConv}
        />
      )}
    </>
  )
}

// ─── ConversationList ─────────────────────────────────────────────────────────

interface ConvListProps {
  conversations: Conversation[]
  onSelect: (c: Conversation) => void
  onNew: () => void
}

function ConversationList({ conversations, onSelect, onNew }: ConvListProps) {
  return (
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">No conversations yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Click + to start a chat</p>
            </div>
            <button
              onClick={onNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all mt-1"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              <Plus className="w-3.5 h-3.5" /> New Conversation
            </button>
          </div>
        )}
        {conversations.map(conv => {
          const unread = conv.unread_count ?? 0
          const lm = conv.last_message
          return (
            <button
              key={conv.uuid}
              onClick={() => onSelect(conv)}
              className="w-full flex items-start gap-3 px-3.5 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100/70 last:border-0 text-left"
            >
              <div className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5',
                avatarBg(conv.uuid.charCodeAt(0)),
              )}>
                {conv.type === 'group' ? <Hash className="w-4 h-4" /> : initials(conv.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-800')}>
                    {conv.name}
                  </p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {lm && <span className="text-[10px] text-slate-400">{msgTime(lm.created_at)}</span>}
                    {unread > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </div>
                </div>
                {lm && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {lm.message_type === 'image' ? '📷 Image'
                      : lm.message_type === 'file' ? '📎 File'
                      : lm.body}
                  </p>
                )}
                {!lm && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {conv.participants.length} member{conv.participants.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </button>
          )
        })}
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

      {/* Input */}
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
    </>
  )
}
