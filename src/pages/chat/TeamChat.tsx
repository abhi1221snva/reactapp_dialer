import {
  useState, useEffect, useRef, useCallback, memo,
} from 'react'
import Pusher from 'pusher-js'
import {
  Send, Plus, Search, Users, Hash, Paperclip, Smile,
  CheckCheck, Check, MoreVertical, X, Download, Image,
  FileText, MessagesSquare, Phone, Video, ChevronDown,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { NewConversationModal } from '../../components/chat/NewConversationModal'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type {
  Conversation, ChatMessage, TypingInfo,
  PusherNewMessageEvent, PusherMessageReadEvent,
  PusherTypingEvent, PusherPresenceEvent,
} from '../../types/chat.types'

// ─── Constants ────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  'bg-indigo-500', 'bg-violet-500', 'bg-sky-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-amber-500',
  'bg-teal-500', 'bg-orange-500',
]
function avatarBg(seed: number) { return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length] }

const COMMON_EMOJIS = [
  '😀','😂','😍','🥰','😊','😎','🤔','😅','🤗','😢','😡','🥳',
  '👍','👎','👋','🙌','👏','🤝','🙏','💪','🤞','☝️','👌','✌️',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💯','🔥','✨','⭐',
  '🎉','🎊','🎁','🚀','💡','⚡','🌟','🏆','💎','🎯','📌','💬',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMessageTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFullTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a), db = new Date(b)
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// ─── AuthImage — fetches image with auth header ───────────────────────────────

interface AuthImageProps {
  attachmentId: number
  alt: string
  className?: string
}
function AuthImage({ attachmentId, alt, className }: AuthImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const token = useAuthStore(s => s.token)

  useEffect(() => {
    let url: string | null = null
    const apiBase = import.meta.env.VITE_API_URL as string
    fetch(`${apiBase}/team-chat/attachments/${attachmentId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.blob())
      .then(blob => {
        url = URL.createObjectURL(blob)
        setSrc(url)
      })
      .catch(() => { /* image failed */ })
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [attachmentId, token])

  if (!src) {
    return (
      <div className={cn('bg-slate-100 rounded-xl flex items-center justify-center', className || 'w-48 h-32')}>
        <Image className="w-6 h-6 text-slate-300" />
      </div>
    )
  }
  return <img src={src} alt={alt} className={cn('rounded-xl object-cover cursor-pointer', className || 'max-w-xs max-h-48')} />
}

// ─── TypingDots ───────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-2.5 bg-white border border-slate-200 rounded-2xl rounded-bl-md shadow-sm w-fit">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage
  showSender: boolean
  showAvatar: boolean
  isGrouped: boolean
  onDownload: (id: number, name: string) => void
}

const MessageBubble = memo(function MessageBubble({
  msg, showSender, showAvatar, isGrouped, onDownload,
}: BubbleProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  if (msg.message_type === 'system') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[11px] text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{msg.body}</span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-2.5 group', msg.is_mine ? 'flex-row-reverse' : 'flex-row', isGrouped ? 'mt-0.5' : 'mt-3')}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 self-end">
        {showAvatar ? (
          <div className={cn(
            'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold',
            avatarBg(msg.sender.id),
          )}>
            {initials(msg.sender.name)}
          </div>
        ) : null}
      </div>

      <div className={cn('flex flex-col max-w-[70%]', msg.is_mine ? 'items-end' : 'items-start')}>
        {/* Sender name */}
        {showSender && !msg.is_mine && (
          <p className="text-xs font-semibold text-slate-600 mb-1 px-1">{msg.sender.name}</p>
        )}

        {/* Bubble */}
        <div className="relative">
          {/* Context menu trigger (hover) */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className={cn(
              'absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10',
              'w-6 h-6 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center',
              msg.is_mine ? '-left-7' : '-right-7',
            )}
          >
            <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
          </button>

          {/* Context menu dropdown */}
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
              <div className={cn(
                'absolute top-7 z-30 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-32 text-sm',
                msg.is_mine ? 'right-0' : 'left-0',
              )}>
                {msg.is_mine && (
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700" onClick={() => setMenuOpen(false)}>
                    Edit
                  </button>
                )}
                {msg.is_mine && (
                  <button className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600" onClick={() => setMenuOpen(false)}>
                    Delete
                  </button>
                )}
                {!msg.is_mine && (
                  <button className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700" onClick={() => setMenuOpen(false)}>
                    Copy
                  </button>
                )}
              </div>
            </>
          )}

          {/* Message content */}
          {msg.message_type === 'image' && msg.attachments.length > 0 ? (
            <AuthImage attachmentId={msg.attachments[0].id} alt={msg.body} />
          ) : msg.message_type === 'file' && msg.attachments.length > 0 ? (
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl',
                msg.is_mine ? 'rounded-br-md text-white' : 'rounded-bl-md bg-white border border-slate-200',
              )}
              style={msg.is_mine ? { background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' } : {}}
            >
              <div className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                msg.is_mine ? 'bg-white/20' : 'bg-indigo-50',
              )}>
                <FileText className={cn('w-5 h-5', msg.is_mine ? 'text-white' : 'text-indigo-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium truncate', msg.is_mine ? 'text-white' : 'text-slate-800')}>
                  {msg.attachments[0].original_name}
                </p>
                <p className={cn('text-xs', msg.is_mine ? 'text-white/70' : 'text-slate-400')}>
                  {msg.attachments[0].file_size}
                </p>
              </div>
              <button
                onClick={() => onDownload(msg.attachments[0].id, msg.attachments[0].original_name)}
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                  msg.is_mine ? 'hover:bg-white/20' : 'hover:bg-indigo-50',
                )}
              >
                <Download className={cn('w-4 h-4', msg.is_mine ? 'text-white' : 'text-indigo-500')} />
              </button>
            </div>
          ) : (
            <div
              className={cn(
                'px-4 py-2.5 text-sm leading-relaxed rounded-2xl break-words whitespace-pre-wrap',
                msg.is_mine ? 'rounded-br-md text-white' : 'rounded-bl-md text-slate-900 bg-white border border-slate-200',
              )}
              style={msg.is_mine ? {
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 2px 8px rgba(79,70,229,.25)',
              } : { boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}
            >
              {msg.body}
              {msg.is_edited && (
                <span className={cn('text-[10px] ml-2', msg.is_mine ? 'text-white/60' : 'text-slate-400')}>
                  (edited)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp + status */}
        <div className={cn('flex items-center gap-1 mt-1 px-1', msg.is_mine ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-slate-400">{formatMessageTime(msg.created_at)}</span>
          {msg.is_mine && (
            msg.is_read
              ? <CheckCheck className="w-3.5 h-3.5 text-indigo-500" />
              : msg.is_delivered
              ? <CheckCheck className="w-3.5 h-3.5 text-slate-400" />
              : <Check className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>
    </div>
  )
})

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute bottom-12 left-0 z-30 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 w-72">
        <div className="grid grid-cols-8 gap-1">
          {COMMON_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => onSelect(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl rounded-lg hover:bg-slate-100 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamChat() {
  const { user, token } = useAuthStore()

  // ── Core state ──
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineStatus, setOnlineStatus] = useState<Map<number, string>>(new Map())
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingInfo[]>>(new Map())
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [sidebarSearch, setSidebarSearch] = useState('')

  // ── Input state ──
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const presenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRestorationRef = useRef<number>(0)

  const selectedConv = conversations.find(c => c.uuid === selectedUuid) ?? null

  // ─── Load conversations ──────────────────────────────────────────────────

  const loadConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations()
      const list: Conversation[] = Array.isArray(res.data?.data)
        ? res.data.data
        : []
      setConversations(list)
    } catch {
      // silent — Pusher will handle updates
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // ─── Load messages ───────────────────────────────────────────────────────

  const loadMessages = useCallback(async (uuid: string) => {
    try {
      const res = await chatService.getMessages(uuid)
      const msgs: ChatMessage[] = Array.isArray(res.data?.data) ? res.data.data : []
      setMessages(msgs)
      setHasMore(msgs.length >= 50)
    } catch {
      toast.error('Could not load messages')
    }
  }, [])

  useEffect(() => {
    if (!selectedUuid) { setMessages([]); return }
    loadMessages(selectedUuid)
    chatService.markAsRead(selectedUuid).catch(() => {})
  }, [selectedUuid, loadMessages])

  // Auto-scroll to bottom on new messages (not on load-more)
  const isFirstLoad = useRef(true)
  useEffect(() => {
    if (isFirstLoad.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
      isFirstLoad.current = false
    } else {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg?.is_mine) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [messages])

  useEffect(() => { isFirstLoad.current = true }, [selectedUuid])

  // ─── Load more (scroll up) ───────────────────────────────────────────────

  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loadingMore && selectedUuid && messages.length > 0) {
          const container = sentinel.parentElement
          scrollRestorationRef.current = container?.scrollHeight ?? 0
          setLoadingMore(true)
          chatService.getMessages(selectedUuid, messages[0].id)
            .then(res => {
              const older: ChatMessage[] = Array.isArray(res.data?.data) ? res.data.data : []
              if (older.length < 50) setHasMore(false)
              setMessages(prev => [...older, ...prev])
              // Restore scroll position after prepend
              requestAnimationFrame(() => {
                if (container) {
                  container.scrollTop = container.scrollHeight - scrollRestorationRef.current
                }
              })
            })
            .catch(() => {})
            .finally(() => setLoadingMore(false))
        }
      },
      { threshold: 0.1 }
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, selectedUuid, messages])

  // ─── Pusher ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !token) return
    const parentId = user.parent_id
    const userId = user.id
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

    // Per-user channel (notifications + presence)
    const userChannel = pusher.subscribe(`private-team-user.${parentId}.${userId}`)

    userChannel.bind('new.message', (data: PusherNewMessageEvent) => {
      // Refresh conversation list to update unread counts and last message
      setConversations(prev => {
        const idx = prev.findIndex(c => c.uuid === data.conversation_uuid)
        if (idx === -1) {
          // New conversation we don't know about yet — reload
          chatService.getConversations()
            .then(res => { if (Array.isArray(res.data?.data)) setConversations(res.data.data) })
            .catch(() => {})
          return prev
        }
        const updated = [...prev]
        const conv = { ...updated[idx] }
        if (data.conversation_uuid !== selectedUuid) {
          conv.unread_count = (conv.unread_count || 0) + 1
        }
        if (conv.last_message) {
          conv.last_message = {
            ...conv.last_message,
            body: data.preview,
          }
        }
        updated.splice(idx, 1)
        updated.unshift(conv)
        return updated
      })
    })

    userChannel.bind('presence.changed', (data: PusherPresenceEvent) => {
      setOnlineStatus(prev => new Map(prev).set(data.user_id, data.status))
    })

    pusherRef.current = pusher

    // Presence on mount
    chatService.updatePresence('online').catch(() => {})
    presenceIntervalRef.current = setInterval(() => {
      chatService.updatePresence('online').catch(() => {})
    }, 30000)

    return () => {
      if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current)
      chatService.updatePresence('offline').catch(() => {})
      userChannel.unbind_all()
      pusher.unsubscribe(`private-team-user.${parentId}.${userId}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe/unsubscribe conversation channel when selection changes
  useEffect(() => {
    if (!pusherRef.current || !user || !selectedUuid) return
    const parentId = user.parent_id
    const userId = user.id
    const channelName = `private-team-chat.${parentId}.${selectedUuid}`
    const channel = pusherRef.current.subscribe(channelName)

    channel.bind('message.sent', (data: ChatMessage & { conversation_uuid: string }) => {
      const isMine = data.sender?.id === userId
      const msg: ChatMessage = { ...data, is_mine: isMine }
      setMessages(prev => {
        if (prev.some(m => m.uuid === msg.uuid)) return prev
        return [...prev, msg]
      })
      // Mark as read if window is focused and this conv is active
      if (!isMine && document.hasFocus()) {
        chatService.markAsRead(selectedUuid).catch(() => {})
      }
      // Update conversation last message
      setConversations(prev => prev.map(c =>
        c.uuid === selectedUuid
          ? { ...c, last_message: { body: msg.body, sender_id: msg.sender.id, created_at: msg.created_at, message_type: msg.message_type } }
          : c
      ))
    })

    channel.bind('message.read', (data: PusherMessageReadEvent) => {
      if (data.reader_id === userId) return
      setMessages(prev => prev.map(m =>
        m.is_mine && !m.read_by.includes(data.reader_id)
          ? { ...m, is_read: true, read_by: [...m.read_by, data.reader_id] }
          : m
      ))
    })

    channel.bind('user.typing', (data: PusherTypingEvent) => {
      if (data.user_id === userId) return
      const key = selectedUuid
      // Clear existing timeout for this user
      const existing = typingTimeoutsRef.current.get(`${key}-${data.user_id}`)
      if (existing) clearTimeout(existing)

      setTypingUsers(prev => {
        const m = new Map(prev)
        const current = m.get(key) ?? []
        const filtered = current.filter(t => t.user_id !== data.user_id)
        m.set(key, [...filtered, { user_id: data.user_id, name: data.name, clearAt: Date.now() + 3000 }])
        return m
      })

      // Auto-clear after 3s
      const t = setTimeout(() => {
        setTypingUsers(prev => {
          const m = new Map(prev)
          const current = m.get(key) ?? []
          m.set(key, current.filter(ti => ti.user_id !== data.user_id))
          return m
        })
      }, 3000)
      typingTimeoutsRef.current.set(`${key}-${data.user_id}`, t)
    })

    return () => {
      channel.unbind_all()
      pusherRef.current?.unsubscribe(channelName)
    }
  }, [selectedUuid, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send message ────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!selectedUuid) return

    if (pendingFile) {
      setUploading(true)
      try {
        const res = await chatService.uploadAttachment(selectedUuid, pendingFile)
        const msg: ChatMessage = { ...res.data.data, is_mine: true }
        setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
        setPendingFile(null)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      } catch {
        toast.error('File upload failed')
      } finally {
        setUploading(false)
      }
      return
    }

    if (!input.trim()) return
    const body = input.trim()
    setInput('')
    setSending(true)
    try {
      const res = await chatService.sendMessage(selectedUuid, body)
      const msg: ChatMessage = { ...res.data.data, is_mine: true }
      setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch {
      setInput(body)
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }, [selectedUuid, input, pendingFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ─── Typing indicator ────────────────────────────────────────────────────

  const handleInputChange = (val: string) => {
    setInput(val)
    if (!selectedUuid) return
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      chatService.sendTyping(selectedUuid).catch(() => {})
    }, 400)
  }

  // ─── File download ───────────────────────────────────────────────────────

  const handleDownload = useCallback(async (attachmentId: number, fileName: string) => {
    const apiBase = import.meta.env.VITE_API_URL as string
    try {
      const res = await fetch(`${apiBase}/team-chat/attachments/${attachmentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName; a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }, [token])

  // ─── Conversation selection ──────────────────────────────────────────────

  const selectConversation = useCallback((uuid: string) => {
    setSelectedUuid(uuid)
    setInput('')
    setPendingFile(null)
    setShowEmoji(false)
    // Clear unread badge
    setConversations(prev => prev.map(c =>
      c.uuid === uuid ? { ...c, unread_count: 0 } : c
    ))
  }, [])

  // ─── New conversation ────────────────────────────────────────────────────

  const handleNewConv = useCallback(async (uuid: string) => {
    setShowNewModal(false)
    await loadConversations()
    selectConversation(uuid)
  }, [loadConversations, selectConversation])

  // ─── Presence dot ────────────────────────────────────────────────────────

  function presenceDotClass(userId?: number): string {
    if (!userId) return 'bg-slate-300'
    const s = onlineStatus.get(userId)
    if (s === 'online') return 'bg-emerald-400'
    if (s === 'away') return 'bg-amber-400'
    if (s === 'busy') return 'bg-rose-400'
    return 'bg-slate-300'
  }

  // ─── Derived data ─────────────────────────────────────────────────────────

  const filteredConvs = conversations.filter(c =>
    c.name.toLowerCase().includes(sidebarSearch.toLowerCase())
  )
  const directConvs = filteredConvs.filter(c => c.type === 'direct')
  const groupConvs = filteredConvs.filter(c => c.type === 'group')
  const currentTyping = selectedUuid ? (typingUsers.get(selectedUuid) ?? []) : []

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-slate-900 overflow-hidden">

        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-white">Team Chat</h1>
            <button
              onClick={() => setShowNewModal(true)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              title="New conversation"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-1.5 bg-white/10 text-white placeholder-slate-400 text-xs rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-white/30"
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 px-2">

          {/* Direct Messages section */}
          {directConvs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-3 pb-1.5">
                Direct Messages
              </p>
              {directConvs.map(conv => {
                const otherParticipant = conv.participants.find(p => p.user_id !== user?.id)
                return (
                  <SidebarItem
                    key={conv.uuid}
                    conv={conv}
                    isActive={selectedUuid === conv.uuid}
                    dotClass={presenceDotClass(otherParticipant?.user_id)}
                    isDirect
                    onClick={() => selectConversation(conv.uuid)}
                  />
                )
              })}
            </div>
          )}

          {/* Groups section */}
          {groupConvs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 pt-3 pb-1.5">
                Channels
              </p>
              {groupConvs.map(conv => (
                <SidebarItem
                  key={conv.uuid}
                  conv={conv}
                  isActive={selectedUuid === conv.uuid}
                  dotClass=""
                  isDirect={false}
                  onClick={() => selectConversation(conv.uuid)}
                />
              ))}
            </div>
          )}

          {filteredConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <MessagesSquare className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-500 text-center px-4">
                {sidebarSearch ? 'No matches found' : 'No conversations yet.\nClick + to start chatting.'}
              </p>
            </div>
          )}
        </div>

        {/* Current user footer */}
        <div className="flex-shrink-0 px-3 py-3 border-t border-white/10 flex items-center gap-2.5">
          <div className="relative flex-shrink-0">
            <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold', avatarBg(user?.id ?? 0))}>
              {initials(user?.name ?? '')}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.extension}</p>
          </div>
        </div>
      </div>

      {/* ── Chat window ── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">

        {!selectedConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              <MessagesSquare className="w-10 h-10 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">Welcome to Team Chat</h2>
              <p className="text-sm text-slate-400 mt-1">Select a conversation or start a new one</p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <ChatHeader
              conv={selectedConv}
              currentUserId={user?.id}
              onlineStatus={onlineStatus}
              avatarBg={avatarBg}
            />

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-6 py-4" id="messages-container">
              {/* Load more sentinel */}
              <div ref={loadMoreRef} className="h-1" />
              {loadingMore && (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!hasMore && messages.length > 0 && (
                <p className="text-center text-xs text-slate-400 py-2">Beginning of conversation</p>
              )}

              {/* Messages grouped by day */}
              {messages.map((msg, i) => {
                const prev = messages[i - 1]
                const showDaySep = !prev || !isSameDay(msg.created_at, prev.created_at)
                const isGrouped = !showDaySep && prev &&
                  prev.sender?.id === msg.sender?.id &&
                  new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000 &&
                  msg.message_type !== 'system' && prev.message_type !== 'system'
                const showSender = !isGrouped && msg.message_type !== 'system'
                const showAvatar = !msg.is_mine && showSender

                return (
                  <div key={msg.uuid}>
                    {showDaySep && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-xs text-slate-400 font-medium px-3 py-1 bg-slate-100 rounded-full">
                          {dayLabel(msg.created_at)}
                        </span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}
                    <MessageBubble
                      msg={msg}
                      showSender={showSender}
                      showAvatar={showAvatar}
                      isGrouped={!!isGrouped}
                      onDownload={handleDownload}
                    />
                  </div>
                )
              })}

              {/* Typing indicator */}
              {currentTyping.length > 0 && (
                <div className="flex items-start gap-2.5 mt-3">
                  <div className="w-8 flex-shrink-0" />
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-xs text-slate-500 px-1">
                      {currentTyping.map(t => t.name).join(', ')} {currentTyping.length === 1 ? 'is' : 'are'} typing…
                    </p>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-slate-100 bg-white">
              {/* File preview bar */}
              {pendingFile && (
                <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-indigo-50 rounded-xl border border-indigo-100">
                  <FileText className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-indigo-700 truncate">{pendingFile.name}</p>
                    <p className="text-[10px] text-indigo-400">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button onClick={() => setPendingFile(null)} className="text-indigo-400 hover:text-indigo-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                {/* Emoji + File buttons */}
                <div className="flex gap-1 pb-1 relative flex-shrink-0">
                  <div className="relative">
                    <button
                      onClick={() => setShowEmoji(v => !v)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="Emoji"
                    >
                      <Smile className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                    </button>
                    {showEmoji && (
                      <EmojiPicker
                        onSelect={e => { setInput(v => v + e); setShowEmoji(false); textareaRef.current?.focus() }}
                        onClose={() => setShowEmoji(false)}
                      />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    title="Attach file"
                  >
                    <Paperclip className="w-[18px] h-[18px]" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                    onChange={e => {
                      const f = e.target.files?.[0]
                      if (f) { setPendingFile(f); setInput('') }
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Text input */}
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder={pendingFile ? 'Add a caption (optional)…' : `Message ${selectedConv?.name ?? ''}…`}
                  className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 transition-colors"
                  style={{ minHeight: '40px', maxHeight: '120px' }}
                  value={input}
                  onChange={e => {
                    handleInputChange(e.target.value)
                    // Auto-resize
                    e.target.style.height = 'auto'
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                  }}
                  onKeyDown={handleKeyDown}
                />

                {/* Send button */}
                <button
                  onClick={handleSend}
                  disabled={(!input.trim() && !pendingFile) || sending || uploading}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all hover:shadow-lg active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  title="Send (Enter)"
                >
                  {sending || uploading
                    ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <Send className="w-4 h-4" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 pl-20">Enter to send · Shift+Enter for new line</p>
            </div>
          </>
        )}
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <NewConversationModal
          onClose={() => setShowNewModal(false)}
          onConversationCreated={handleNewConv}
        />
      )}
    </div>
  )
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  conv: Conversation
  isActive: boolean
  dotClass: string
  isDirect: boolean
  onClick: () => void
}

const SidebarItem = memo(function SidebarItem({ conv, isActive, dotClass, isDirect, onClick }: SidebarItemProps) {
  const lastMsg = conv.last_message

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-2.5 px-2 py-2 rounded-xl transition-all text-left',
        isActive ? 'bg-white/15' : 'hover:bg-white/8 hover:bg-white/[0.08]',
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold',
          avatarBg(conv.uuid.charCodeAt(0)),
        )}>
          {isDirect
            ? initials(conv.name)
            : <Hash className="w-4 h-4" />
          }
        </div>
        {isDirect && dotClass && (
          <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900', dotClass)} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={cn('text-sm truncate font-medium', isActive ? 'text-white' : 'text-slate-300')}>
            {conv.name}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {(conv.unread_count ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {(conv.unread_count ?? 0) > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
        </div>
        {lastMsg && (
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {lastMsg.message_type === 'image' ? '📷 Image'
              : lastMsg.message_type === 'file' ? '📎 File'
              : lastMsg.body}
          </p>
        )}
      </div>
    </button>
  )
})

// ─── ChatHeader ───────────────────────────────────────────────────────────────

interface ChatHeaderProps {
  conv: Conversation
  currentUserId: number | undefined
  onlineStatus: Map<number, string>
  avatarBg: (seed: number) => string
}

const ChatHeader = memo(function ChatHeader({ conv, currentUserId, onlineStatus, avatarBg }: ChatHeaderProps) {
  const [showMembers, setShowMembers] = useState(false)
  const otherParticipant = conv.type === 'direct'
    ? conv.participants.find(p => p.user_id !== currentUserId)
    : null
  const status = otherParticipant ? (onlineStatus.get(otherParticipant.user_id) ?? 'offline') : null

  const statusLabel = status === 'online' ? 'Online'
    : status === 'away' ? 'Away'
    : status === 'busy' ? 'Busy'
    : 'Offline'

  return (
    <div className="flex-shrink-0 px-5 py-3 border-b border-slate-200 flex items-center gap-3 bg-white">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold',
          avatarBg(conv.uuid.charCodeAt(0)),
        )}>
          {conv.type === 'direct'
            ? initials(conv.name)
            : <Hash className="w-4 h-4" />
          }
        </div>
        {status && (
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
            status === 'online' ? 'bg-emerald-400'
              : status === 'away' ? 'bg-amber-400'
              : status === 'busy' ? 'bg-rose-400'
              : 'bg-slate-300',
          )} />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">{conv.name}</p>
        {conv.type === 'direct' ? (
          <p className="text-xs text-slate-400">{statusLabel}</p>
        ) : (
          <p className="text-xs text-slate-400">{conv.participants.length} members</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {conv.type === 'direct' && (
          <>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Audio call">
              <Phone className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Video call">
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        {conv.type === 'group' && (
          <div className="relative">
            <button
              onClick={() => setShowMembers(v => !v)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Members
              <ChevronDown className="w-3 h-3" />
            </button>
            {showMembers && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMembers(false)} />
                <div className="absolute right-0 top-9 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-2 w-56">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-1">Members ({conv.participants.length})</p>
                  {conv.participants.map(p => (
                    <div key={p.user_id} className="flex items-center gap-2.5 px-3 py-2">
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold', avatarBg(p.user_id))}>
                        {initials(p.name)}
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 font-medium">{p.name}</p>
                        {p.role === 'admin' && <p className="text-[10px] text-indigo-500">Admin</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// Utility: format full timestamp for tooltip
function _formatFullTime(iso: string): string { return formatFullTime(iso) }
void _formatFullTime
