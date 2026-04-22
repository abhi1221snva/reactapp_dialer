import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  X, Send, Smile, Paperclip, CheckCheck, Check, Hash,
  FileText, Users, Loader2, Phone, Video,
  PhoneOff, Mic, MicOff, VideoOff,
  Minus, Maximize2, ChevronUp,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../stores/auth.store'
import { useFloatingStore, useWidgetPositions } from '../../stores/floating.store'
import { useChatPusher, type CallPhase, type CallSession } from './ChatPusherProvider'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type { Conversation, ChatMessage, PusherMessageReadEvent, PusherTypingEvent } from '../../types/chat.types'

// ─── Layout constants ────────────────────────────────────────────────────────

const MINI_WIDTH = 300
const GAP = 12
const BODY_HEIGHT = 420

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function fmtDuration(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── WidgetCallPanel ─────────────────────────────────────────────────────────

interface WcpProps {
  phase: CallPhase
  session: CallSession
  isMuted: boolean
  callSeconds: number
  onAccept: () => void
  onDecline: () => void
  onEnd: () => void
  onMute: () => void
}

function WidgetCallPanel({ phase, session, isMuted, callSeconds, onAccept, onDecline, onEnd, onMute }: WcpProps) {
  const COLORS = ['bg-indigo-500','bg-violet-500','bg-sky-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-orange-500']
  const bg = COLORS[Math.abs(session.remoteUserId) % COLORS.length]

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}>
      {/* Audio element is now always-mounted in ChatPusherProvider */}
      <div className={cn('w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-xl', bg, phase === 'incoming' && 'animate-pulse')}>
        {initials(session.remoteName)}
      </div>
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

// ─── VideoCallOverlay (exported for orchestrator) ────────────────────────────

interface VcoProps {
  session: CallSession
  isMuted: boolean
  isCameraOff: boolean
  callSeconds: number
  onMute: () => void
  onCamera: () => void
  onEnd: () => void
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>
  localVideoRef: React.RefObject<HTMLVideoElement | null>
  remoteStreamRef: React.RefObject<MediaStream | null>
  localStreamRef: React.RefObject<MediaStream | null>
}

export function VideoCallOverlay({ session, isMuted, isCameraOff, callSeconds, onMute, onCamera, onEnd, remoteVideoRef, localVideoRef, remoteStreamRef, localStreamRef }: VcoProps) {
  return (
    <div className="fixed inset-0 flex flex-col bg-black" style={{ zIndex: 100 }}>
      <video
        ref={(el) => {
          (remoteVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
          if (el && remoteStreamRef.current && !el.srcObject) {
            el.srcObject = remoteStreamRef.current
            el.play().catch(() => {})
          }
        }}
        autoPlay playsInline className="absolute inset-0 w-full h-full object-cover"
      />
      <video
        ref={(el) => {
          (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el
          if (el && localStreamRef.current && !el.srcObject) {
            el.srcObject = localStreamRef.current
            el.play().catch(() => {})
          }
        }}
        autoPlay playsInline muted className="absolute top-4 right-4 w-32 h-24 rounded-xl object-cover border-2 border-white/20 shadow-lg z-10"
      />
      <div className="relative z-10 text-center pt-8">
        <p className="text-white font-semibold">{session.remoteName}</p>
        <p className="text-white/60 text-sm mt-0.5 tabular-nums">{fmtDuration(callSeconds)}</p>
      </div>
      <div className="flex-1" />
      <div className="relative z-10 flex items-center justify-center gap-4 pb-10">
        <button onClick={onMute} className={cn('w-12 h-12 rounded-full flex items-center justify-center text-white transition-colors', isMuted ? 'bg-rose-500' : 'bg-white/20 hover:bg-white/30')} title={isMuted ? 'Unmute' : 'Mute'}>
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

// ─── ThreadView (exported for mobile fallback) ───────────────────────────────

export interface ThreadViewProps {
  conv: Conversation
  messages: ChatMessage[]
  loading: boolean
  input: string
  pendingFile: File | null
  sending: boolean
  typingName: string | null
  showEmoji: boolean
  user: { id: number; name: string } | null
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onInput: (v: string) => void
  onSend: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onEmojiToggle: () => void
  onEmojiSelect: (e: string) => void
  onEmojiClose: () => void
  onFileSelect: (f: File) => void
  onFileClear: () => void
}

export function ThreadView({
  conv, messages, loading, input, pendingFile, sending, typingName,
  showEmoji, user, messagesEndRef, fileInputRef,
  onInput, onSend, onKeyDown,
  onEmojiToggle, onEmojiSelect, onEmojiClose, onFileSelect, onFileClear,
}: ThreadViewProps) {
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

        <div ref={messagesEndRef as React.Ref<HTMLDivElement>} />
      </div>

      {/* Input / read-only notice */}
      {conv.is_system ? (
        <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
          <p className="text-[10px] text-slate-400">This is a read-only broadcast channel</p>
        </div>
      ) : (
      <div className="flex-shrink-0 px-3 py-2.5 border-t border-slate-100 bg-white">
        {pendingFile && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 mb-2 bg-indigo-50 rounded-lg">
            <FileText className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <span className="text-xs text-indigo-700 truncate flex-1">{pendingFile.name}</span>
            <button onClick={onFileClear} className="text-indigo-400 hover:text-indigo-600"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        <div className="flex items-end gap-1.5">
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

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef as React.Ref<HTMLInputElement>}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
          />

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

// ─── MiniChatWindow ──────────────────────────────────────────────────────────

interface MiniChatWindowProps {
  conv: Conversation
  stackIndex: number
  zIndex: number
  onClose: () => void
  onFocus: () => void
}

export function MiniChatWindow({ conv, stackIndex, zIndex, onClose, onFocus }: MiniChatWindowProps) {
  const { user, token } = useAuthStore()
  const { miniChatRight } = useWidgetPositions()
  const setChatOpen = useFloatingStore(s => s.setChatOpen)
  const navigate = useNavigate()
  const [isMinimized, setIsMinimized] = useState(false)
  const {
    pusherRef, setConversations, setTotalUnread,
    callPhase, callSession, isMuted, callSeconds,
    startCall, acceptIncomingCall, declineCall, endCurrentCall, toggleMute,
  } = useChatPusher()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [typingName, setTypingName] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const convChannelRef = useRef<ReturnType<InstanceType<typeof import('pusher-js').default>['subscribe']> | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const uuid = conv.uuid

  // ── Load messages on mount ─────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoadingMsgs(true)
    chatService.getMessages(uuid).then(res => {
      if (!cancelled) setMessages(Array.isArray(res.data?.data) ? res.data.data : [])
    }).catch(() => {
      if (!cancelled) toast.error('Could not load messages')
    }).finally(() => {
      if (!cancelled) setLoadingMsgs(false)
    })

    // Mark as read
    chatService.markAsRead(uuid).catch(() => {})
    setConversations(prev => prev.map(c =>
      c.uuid === uuid ? { ...c, unread_count: 0 } : c
    ))
    setTotalUnread(prev => Math.max(0, prev - (conv.unread_count ?? 0)))

    return () => { cancelled = true }
  }, [uuid]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to conversation Pusher channel ──────────────────────────

  useEffect(() => {
    if (!user || !token || !pusherRef.current) return
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
  }, [uuid, user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send ──────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (pendingFile) {
      setSending(true)
      try {
        const res = await chatService.uploadAttachment(uuid, pendingFile)
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
      const res = await chatService.sendMessage(uuid, body)
      const msg: ChatMessage = { ...res.data.data, is_mine: true }
      setMessages(prev => prev.some(m => m.uuid === msg.uuid) ? prev : [...prev, msg])
    } catch {
      setInput(body)
      toast.error('Failed to send')
    } finally { setSending(false) }
  }, [uuid, input, pendingFile])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current)
    typingDebounceRef.current = setTimeout(() => {
      chatService.sendTyping(uuid).catch(() => {})
    }, 400)
  }

  // ── Position ──────────────────────────────────────────────────────────

  const rightPos = miniChatRight(stackIndex)

  // ── Check if this window owns the active call ─────────────────────────

  const isCallWindow = callSession && callSession.convUuid === uuid
  const showCallPanel = isCallWindow && (callPhase === 'calling' || callPhase === 'incoming' || (callPhase === 'active' && callSession!.callType === 'audio'))

  // ── Header ────────────────────────────────────────────────────────────

  const headerLeft = (
    <>
      <div className={cn(
        'w-7 h-7 rounded-xl flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0',
        avatarBg(conv.uuid.charCodeAt(0)),
      )}>
        {conv.type === 'group' ? <Hash className="w-3 h-3" /> : initials(conv.name)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-tight">{conv.name}</p>
        {conv.type === 'group' && (
          <p className="text-[10px] text-white/60 leading-none mt-0.5">{conv.participants.length} members</p>
        )}
      </div>
    </>
  )

  const headerRight = conv.type === 'direct' && (!callSession || !isCallWindow) ? (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall(conv, 'audio')}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-emerald-500/70 flex items-center justify-center transition-colors"
        title="Audio call"
      >
        <Phone className="w-3.5 h-3.5 text-white" />
      </button>
      <button
        onClick={() => startCall(conv, 'video')}
        className="w-7 h-7 rounded-lg bg-white/15 hover:bg-indigo-500/70 flex items-center justify-center transition-colors"
        title="Video call"
      >
        <Video className="w-3.5 h-3.5 text-white" />
      </button>
    </div>
  ) : undefined

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      onMouseDown={onFocus}
      style={{
        position: 'fixed',
        bottom: 20,
        right: rightPos,
        width: MINI_WIDTH,
        zIndex,
        borderRadius: '16px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.08)',
        border: '1px solid rgba(0,0,0,0.07)',
        opacity: 1,
        transform: 'translateY(0) scale(1)',
        transition: 'right 0.25s ease, opacity 0.22s ease, transform 0.22s cubic-bezier(0.32, 0.72, 0, 1)',
        transformOrigin: 'bottom right',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3.5 flex-shrink-0"
        style={{
          height: '48px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          userSelect: 'none',
          cursor: isMinimized ? 'pointer' : 'default',
        }}
        onClick={isMinimized ? () => setIsMinimized(false) : undefined}
        title={isMinimized ? 'Click to expand' : undefined}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {headerLeft}
          {isMinimized && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              <ChevronUp size={10} color="rgba(255,255,255,0.7)" />
            </span>
          )}
        </div>
        {/* Stop mousedown propagation on the controls bar so onFocus doesn't re-render mid-click */}
        <div
          className="flex items-center gap-1 flex-shrink-0 ml-2"
          style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {headerRight}

          <button
            onClick={(e) => { e.stopPropagation(); setChatOpen(false); navigate('/chat') }}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
            title="Maximize"
          >
            <Maximize2 size={12} className="text-white" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); setIsMinimized(v => !v) }}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center transition-colors"
            title={isMinimized ? 'Restore' : 'Minimize'}
          >
            {isMinimized ? <ChevronUp size={12} className="text-white" /> : <Minus size={12} className="text-white" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              // During an active call, minimize instead of closing to keep audio alive
              if (isCallWindow && callPhase !== 'idle') {
                setIsMinimized(true)
              } else {
                onClose()
              }
            }}
            className="w-7 h-7 rounded-lg bg-white/15 hover:bg-rose-500/80 flex items-center justify-center transition-colors"
            title={isCallWindow && callPhase !== 'idle' ? 'Minimize (call active)' : 'Close'}
          >
            {isCallWindow && callPhase !== 'idle' ? <Minus size={12} className="text-white" /> : <X size={12} className="text-white" />}
          </button>
        </div>
      </div>

      {/* Compact call bar — visible when minimized with an active call */}
      {isMinimized && isCallWindow && callPhase !== 'idle' && (
        <div
          className="flex items-center justify-between px-3 py-2 bg-emerald-500 cursor-pointer"
          onClick={() => setIsMinimized(false)}
        >
          <div className="flex items-center gap-2 text-white text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            {callPhase === 'incoming' ? 'Incoming call…' : callPhase === 'calling' ? 'Calling…' : fmtDuration(callSeconds)}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); toggleMute() }}
              className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff size={10} className="text-white" /> : <Mic size={10} className="text-white" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); endCurrentCall() }}
              className="w-6 h-6 rounded-full bg-rose-600 flex items-center justify-center"
              title="End call"
            >
              <PhoneOff size={10} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Body (collapsible) */}
      <div style={{
        maxHeight: isMinimized ? 0 : BODY_HEIGHT,
        height: isMinimized ? 0 : BODY_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'max-height 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {showCallPanel ? (
          <WidgetCallPanel
            phase={callPhase}
            session={callSession!}
            isMuted={isMuted}
            callSeconds={callSeconds}
            onAccept={acceptIncomingCall}
            onDecline={declineCall}
            onEnd={endCurrentCall}
            onMute={toggleMute}
          />
        ) : (
          <ThreadView
            conv={conv}
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
    </div>
  )
}
