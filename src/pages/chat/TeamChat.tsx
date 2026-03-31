import {
  useState, useEffect, useRef, useCallback, memo,
} from 'react'
import Pusher from 'pusher-js'
import {
  Send, Plus, Search, Users, Hash, Paperclip, Smile,
  CheckCheck, Check, MoreVertical, X, Download, Image,
  FileText, MessagesSquare, Phone, Video, ChevronDown,
  PhoneOff, Mic, MicOff, VideoOff, UserPlus, Building2, Store,
} from 'lucide-react'
import { chatService } from '../../services/chat.service'
import { useAuthStore } from '../../stores/auth.store'
import { cn } from '../../utils/cn'
import { initials } from '../../utils/format'
import toast from 'react-hot-toast'
import type {
  Conversation, ChatMessage, TypingInfo, SearchUser,
  PusherNewMessageEvent, PusherMessageReadEvent,
  PusherTypingEvent, PusherPresenceEvent,
  CallData, CallSignalData, CallAcceptedData, CallEndedData,
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
        <span className="text-sm text-black bg-slate-100 px-3 py-1 rounded-full">{msg.body}</span>
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

function formatDuration(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

// ─── Call session type ────────────────────────────────────────────────────────

interface CallSession {
  callId: string
  convUuid: string
  callType: 'audio' | 'video'
  remoteUserId: number
  remoteName: string
  isCaller: boolean
}

type CallPhase = 'idle' | 'calling' | 'incoming' | 'active'

// ─── CallingOverlay ───────────────────────────────────────────────────────────

function CallingOverlay({ session, onCancel }: { session: CallSession; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.96)' }}>
      <div className="text-center">
        <div className={cn(
          'w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6',
          avatarBg(session.remoteUserId),
        )} style={{ animation: 'pulse 2s infinite' }}>
          {initials(session.remoteName)}
        </div>
        <p className="text-slate-400 text-sm mb-1">{session.callType === 'video' ? 'Video call' : 'Audio call'}</p>
        <h3 className="text-2xl font-bold text-white mb-2">{session.remoteName}</h3>
        <p className="text-slate-500 mb-10 animate-pulse">Calling…</p>
        <button
          onClick={onCancel}
          className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 mx-auto transition-colors shadow-lg"
          title="Cancel call"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
        <p className="text-xs text-slate-500 mt-3">Cancel</p>
      </div>
    </div>
  )
}

// ─── IncomingCallOverlay ──────────────────────────────────────────────────────

function IncomingCallOverlay({
  session, onAccept, onDecline,
}: { session: CallSession; onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(15,23,42,0.96)' }}>
      <div className="bg-slate-800 rounded-3xl p-8 w-80 text-center shadow-2xl border border-white/10">
        <div className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 animate-pulse',
          avatarBg(session.remoteUserId),
        )}>
          {initials(session.remoteName)}
        </div>
        <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">
          Incoming {session.callType === 'video' ? 'Video' : 'Audio'} Call
        </p>
        <h3 className="text-xl font-bold text-white mb-8">{session.remoteName}</h3>
        <div className="flex items-center justify-center gap-10">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onDecline}
              className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-slate-400">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white hover:bg-emerald-600 transition-colors shadow-lg"
            >
              <Phone className="w-7 h-7" />
            </button>
            <span className="text-xs text-slate-400">Accept</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ActiveCallOverlay ────────────────────────────────────────────────────────

interface ActiveCallOverlayProps {
  session: CallSession
  isMuted: boolean
  isCameraOff: boolean
  callSeconds: number
  onMute: () => void
  onCamera: () => void
  onEnd: () => void
  remoteVideoRef: React.RefObject<HTMLVideoElement>
  localVideoRef: React.RefObject<HTMLVideoElement>
  remoteAudioRef: React.RefObject<HTMLAudioElement>
}

function ActiveCallOverlay({
  session, isMuted, isCameraOff, callSeconds,
  onMute, onCamera, onEnd,
  remoteVideoRef, localVideoRef, remoteAudioRef,
}: ActiveCallOverlayProps) {
  const isVideo = session.callType === 'video'

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: isVideo ? '#000' : 'rgba(15,23,42,0.97)' }}>
      {isVideo ? (
        <>
          {/* Remote video — full screen */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Local video — PiP */}
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute top-4 right-4 w-36 h-24 rounded-xl object-cover border-2 border-white/20 z-10 shadow-lg"
          />
          {/* Header */}
          <div className="relative z-20 text-center pt-8 pb-4">
            <p className="text-white font-semibold text-lg">{session.remoteName}</p>
            <p className="text-white/60 text-sm mt-0.5">{formatDuration(callSeconds)}</p>
          </div>
          <div className="flex-1" />
        </>
      ) : (
        <>
          {/* Hidden audio element */}
          <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
          <div className="flex-1 flex flex-col items-center justify-center gap-5">
            <div className={cn(
              'w-28 h-28 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-2xl',
              avatarBg(session.remoteUserId),
            )}>
              {initials(session.remoteName)}
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold text-white">{session.remoteName}</h3>
              <p className="text-slate-400 mt-1 tabular-nums">{formatDuration(callSeconds)}</p>
            </div>
            {/* Animated waveform */}
            <div className="flex items-end gap-1.5 h-10">
              {[4, 7, 5, 8, 3, 6, 4, 7, 5].map((h, i) => (
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
          </div>
        </>
      )}

      {/* Controls */}
      <div className="relative z-20 flex items-center justify-center gap-5 pb-12 pt-4">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onMute}
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
              isMuted ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
            )}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <span className="text-xs text-white/50">{isMuted ? 'Unmute' : 'Mute'}</span>
        </div>

        {isVideo && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onCamera}
              className={cn(
                'w-14 h-14 rounded-full flex items-center justify-center transition-colors',
                isCameraOff ? 'bg-rose-500 text-white' : 'bg-white/20 text-white hover:bg-white/30',
              )}
              title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            >
              {isCameraOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
            <span className="text-xs text-white/50">{isCameraOff ? 'Camera On' : 'Camera Off'}</span>
          </div>
        )}

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onEnd}
            className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
            title="End call"
          >
            <PhoneOff className="w-7 h-7" />
          </button>
          <span className="text-xs text-white/50">End</span>
        </div>
      </div>
    </div>
  )
}

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

// ─── CreateGroupModal ─────────────────────────────────────────────────────────

interface CreateGroupModalProps {
  members: SearchUser[]
  onClose: () => void
  onCreated: (uuid: string) => void
}

function CreateGroupModal({ members, onClose, onCreated }: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [creating, setCreating] = useState(false)

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const toggle = (id: number) =>
    setSelected(prev => {
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
    } catch {
      toast.error('Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Create Group</h2>
            <p className="text-xs text-slate-400 mt-0.5">Name your group and add members</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 flex-1 overflow-hidden">

          {/* Group name */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Group Name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. Sales Team, Support Squad…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Member picker */}
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600">Members</label>
              {selected.size > 0 && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {selected.size} selected
                </span>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search members…"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-700 placeholder-slate-400"
              />
            </div>
            <div className="overflow-y-auto max-h-52 flex flex-col gap-0.5 pr-0.5">
              {filtered.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No members found</p>
              )}
              {filtered.map(m => {
                const isChecked = selected.has(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left w-full',
                      isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300',
                    )}>
                      {isChecked && (
                        <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className={cn(
                      'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      avatarBg(m.id),
                    )}>
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', isChecked ? 'text-indigo-700' : 'text-slate-700')}>
                        {m.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
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

// ─── AddMemberModal ───────────────────────────────────────────────────────────

interface AddMemberModalProps {
  conversationUuid: string
  existingUserIds: Set<number>
  members: SearchUser[]
  onClose: () => void
  onAdded: () => void
}

function AddMemberModal({ conversationUuid, existingUserIds, members, onClose, onAdded }: AddMemberModalProps) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)

  const available = members.filter(
    m => !existingUserIds.has(m.id) && m.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const handleAdd = async () => {
    if (selected.size < 1) return
    setAdding(true)
    try {
      await chatService.addParticipants(conversationUuid, Array.from(selected))
      toast.success(`${selected.size} member${selected.size > 1 ? 's' : ''} added`)
      onAdded()
      onClose()
    } catch {
      toast.error('Failed to add members')
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Add Members</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select people to add to this group</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">Members</label>
            {selected.size > 0 && (
              <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                {selected.size} selected
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              autoFocus
              type="text"
              placeholder="Search members…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-100 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300 text-slate-700 placeholder-slate-400"
            />
          </div>
          <div className="overflow-y-auto max-h-64 flex flex-col gap-0.5 pr-0.5">
            {available.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">
                {members.filter(m => !existingUserIds.has(m.id)).length === 0
                  ? 'All team members are already in this group'
                  : 'No members found'}
              </p>
            )}
            {available.map(m => {
              const isChecked = selected.has(m.id)
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left w-full',
                    isChecked ? 'bg-indigo-50' : 'hover:bg-slate-50',
                  )}
                >
                  <div className={cn(
                    'w-4 h-4 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                    isChecked ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300',
                  )}>
                    {isChecked && (
                      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                    avatarBg(m.id),
                  )}>
                    {initials(m.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium truncate', isChecked ? 'text-indigo-700' : 'text-slate-700')}>
                      {m.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{m.email}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size < 1 || adding}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            {adding && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {adding ? 'Adding…' : 'Add Members'}
          </button>
        </div>
      </div>
    </div>
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
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [teamMembers, setTeamMembers] = useState<SearchUser[]>([])
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)

  // ── Input state ──
  const [input, setInput] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)

  // ── Call state ──
  const [callPhase, setCallPhase] = useState<CallPhase>('idle')
  const [callSession, setCallSession] = useState<CallSession | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [callSeconds, setCallSeconds] = useState(0)

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const pusherRef = useRef<Pusher | null>(null)
  const selectedUuidRef = useRef<string | null>(null)
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRestorationRef = useRef<number>(0)

  // ── Call refs (stable across re-renders for Pusher callbacks) ──
  const callPhaseRef = useRef<CallPhase>('idle')
  const callSessionRef = useRef<CallSession | null>(null)
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync state → refs
  useEffect(() => { callPhaseRef.current = callPhase }, [callPhase])
  useEffect(() => { callSessionRef.current = callSession }, [callSession])
  useEffect(() => { selectedUuidRef.current = selectedUuid }, [selectedUuid])

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

  // ─── Load all team members ───────────────────────────────────────────────

  const loadTeamMembers = useCallback(async () => {
    try {
      const res = await chatService.searchUsers('')
      const all: SearchUser[] = Array.isArray(res.data?.data) ? res.data.data : []
      const members = all.filter(m => m.id !== user?.id)
      setTeamMembers(members)
      // Seed onlineStatus with API-reported statuses so ChatHeader shows
      // the correct status before any Pusher presence.changed events arrive.
      // Pusher events will override these as they come in.
      setOnlineStatus(prev => {
        const updated = new Map(prev)
        members.forEach(m => { if (!updated.has(m.id)) updated.set(m.id, m.status) })
        return updated
      })
    } catch { /* silent */ }
  }, [user?.id])

  useEffect(() => { loadTeamMembers() }, [loadTeamMembers])

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
      const isActiveConv = data.conversation_uuid === selectedUuidRef.current

      // If this message is for the currently active conversation, mark it read immediately
      if (isActiveConv && document.hasFocus()) {
        chatService.markAsRead(data.conversation_uuid).catch(() => {})
      }

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
        // Only increment unread if this is NOT the active conversation or window is not focused
        if (!isActiveConv || !document.hasFocus()) {
          conv.unread_count = (conv.unread_count || 0) + 1
        }
        conv.last_message = {
          ...conv.last_message,
          body: data.preview,
          created_at: new Date().toISOString(),
        }
        updated.splice(idx, 1)
        updated.unshift(conv)
        return updated
      })
    })

    userChannel.bind('presence.changed', (data: PusherPresenceEvent) => {
      setOnlineStatus(prev => new Map(prev).set(data.user_id, data.status))
    })

    // ── Call events ───────────────────────────────────────────────────────────

    userChannel.bind('call.incoming', (data: CallData) => {
      if (callPhaseRef.current !== 'idle') {
        // We're busy — auto-decline
        chatService.endCall(data.conversation_uuid, data.call_id, 'busy').catch(() => {})
        return
      }
      const session: CallSession = {
        callId: data.call_id,
        convUuid: data.conversation_uuid,
        callType: data.call_type,
        remoteUserId: data.caller.id,
        remoteName: data.caller.name,
        isCaller: false,
      }
      callSessionRef.current = session; setCallSession(session)
      callPhaseRef.current = 'incoming'; setCallPhase('incoming')
    })

    userChannel.bind('call.accepted', (data: CallAcceptedData) => {
      if (callPhaseRef.current !== 'calling') return
      const session = callSessionRef.current
      if (!session) return
      ;(async () => {
        try {
          const iceRes = await chatService.getIceServers()
          const iceServers = iceRes.data?.data?.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }]
          const peer = await buildPeer(session, iceServers)
          callPhaseRef.current = 'active'; setCallPhase('active')
          startCallTimer()
          const offer = await peer.createOffer()
          await peer.setLocalDescription(offer)
          await chatService.callSignal(session.convUuid, {
            call_id: session.callId,
            signal_type: 'offer',
            signal_data: offer as RTCSessionDescriptionInit,
            target_user_id: data.accepted_by.id,
          })
        } catch {
          toast.error('Call setup failed')
          cleanupCall()
        }
      })()
    })

    userChannel.bind('call.signal', (data: CallSignalData) => {
      const session = callSessionRef.current
      if (!session || data.call_id !== session.callId) return
      ;(async () => {
        const peer = peerRef.current
        if (data.signal_type === 'offer') {
          if (!peer) {
            // Store offer until we accept and build peer
            pendingOfferRef.current = data.signal_data as RTCSessionDescriptionInit
          } else {
            await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit)
            for (const c of pendingIceRef.current) { await peer.addIceCandidate(c).catch(() => {}) }
            pendingIceRef.current = []
            const answer = await peer.createAnswer()
            await peer.setLocalDescription(answer)
            await chatService.callSignal(session.convUuid, {
              call_id: session.callId,
              signal_type: 'answer',
              signal_data: answer as RTCSessionDescriptionInit,
              target_user_id: data.from_user.id,
            })
          }
        } else if (data.signal_type === 'answer') {
          if (peer) await peer.setRemoteDescription(data.signal_data as RTCSessionDescriptionInit).catch(() => {})
        } else if (data.signal_type === 'ice-candidate') {
          const candidate = data.signal_data as RTCIceCandidateInit
          if (peer?.remoteDescription) {
            await peer.addIceCandidate(candidate).catch(() => {})
          } else {
            pendingIceRef.current.push(candidate)
          }
        }
      })()
    })

    userChannel.bind('call.ended', (data: CallEndedData) => {
      const session = callSessionRef.current
      if (!session || data.call_id !== session.callId) return
      const msg = data.reason === 'declined'
        ? `${data.ended_by.name} declined the call`
        : data.reason === 'busy'
        ? `${data.ended_by.name} is busy`
        : 'Call ended'
      toast(msg, { icon: '📞' })
      cleanupCall()
    })

    pusherRef.current = pusher

    // Presence is handled globally by usePresence() hook in AppWithPusher

    return () => {
      userChannel.unbind_all()
      pusher.unsubscribe(`private-team-user.${parentId}.${userId}`)
      pusher.disconnect()
      pusherRef.current = null
    }
  }, [user?.id, token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Visibility change — mark read & clear badge when tab regains focus ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && selectedUuidRef.current) {
        chatService.markAsRead(selectedUuidRef.current).catch(() => {})
        setConversations(prev => prev.map(c =>
          c.uuid === selectedUuidRef.current ? { ...c, unread_count: 0 } : c
        ))
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  // ─── Periodically refresh team member presence (every 30s) ────────────
  useEffect(() => {
    const interval = setInterval(() => {
      chatService.searchUsers('').then(res => {
        const all: SearchUser[] = Array.isArray(res.data?.data) ? res.data.data : []
        setOnlineStatus(prev => {
          const updated = new Map(prev)
          all.forEach(m => updated.set(m.id, m.status))
          return updated
        })
      }).catch(() => {})
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

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
        // Clear badge for active conversation
        setConversations(prev => prev.map(c =>
          c.uuid === selectedUuid ? { ...c, unread_count: 0 } : c
        ))
      }
      // Update conversation last message
      setConversations(prev => prev.map(c =>
        c.uuid === selectedUuid
          ? { ...c, last_message: { body: msg.body, sender_id: msg.sender.id, created_at: msg.created_at, message_type: msg.message_type } }
          : c
      ))
      // Auto-scroll to bottom for new messages (own or incoming)
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
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
    // Clear unread badge locally + mark read on server
    setConversations(prev => prev.map(c =>
      c.uuid === uuid ? { ...c, unread_count: 0 } : c
    ))
    chatService.markAsRead(uuid).catch(() => {})
  }, [])

  // ─── Open DM with a team member ──────────────────────────────────────────

  const openDmWith = useCallback(async (memberId: number) => {
    try {
      const res = await chatService.getOrCreateDirect(memberId)
      const { uuid } = res.data.data
      await loadConversations()
      selectConversation(uuid)
    } catch {
      toast.error('Could not open conversation')
    }
  }, [loadConversations, selectConversation])

  const handleGroupCreated = useCallback(async (uuid: string) => {
    setShowCreateGroup(false)
    await loadConversations()
    selectConversation(uuid)
  }, [loadConversations, selectConversation])

  // ─── Call helpers ────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null }
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null }
    pendingIceRef.current = []
    pendingOfferRef.current = null
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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: session.callType === 'video',
    })
    localStreamRef.current = stream
    if (session.callType === 'video' && localVideoRef.current) {
      localVideoRef.current.srcObject = stream
    }

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
          call_id: sess.callId,
          signal_type: 'ice-candidate',
          signal_data: e.candidate.toJSON() as RTCIceCandidateInit,
          target_user_id: sess.remoteUserId,
        }).catch(() => {})
      }
    }

    return peer
  }, [])

  const startCall = useCallback(async (callType: 'audio' | 'video') => {
    if (!selectedConv || callPhaseRef.current !== 'idle') return
    if (selectedConv.type !== 'direct') {
      toast('Group calls coming soon!', { icon: '🎙️' }); return
    }
    const other = selectedConv.participants.find(p => p.user_id !== user?.id)
    if (!other) return
    try {
      const res = await chatService.initiateCall(selectedConv.uuid, callType)
      const data = res.data?.data
      if (!data) return
      const session: CallSession = {
        callId: data.call_id,
        convUuid: selectedConv.uuid,
        callType,
        remoteUserId: other.user_id,
        remoteName: other.name,
        isCaller: true,
      }
      callSessionRef.current = session; setCallSession(session)
      callPhaseRef.current = 'calling'; setCallPhase('calling')
    } catch {
      toast.error('Failed to start call')
    }
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
      // If offer arrived before we accepted, process it now
      if (pendingOfferRef.current) {
        await peer.setRemoteDescription(pendingOfferRef.current)
        for (const c of pendingIceRef.current) { await peer.addIceCandidate(c).catch(() => {}) }
        pendingIceRef.current = []
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await chatService.callSignal(session.convUuid, {
          call_id: session.callId,
          signal_type: 'answer',
          signal_data: answer as RTCSessionDescriptionInit,
          target_user_id: session.remoteUserId,
        })
        pendingOfferRef.current = null
      }
    } catch {
      toast.error('Failed to accept call')
      cleanupCall()
    }
  }, [buildPeer, startCallTimer, cleanupCall])

  const declineCall = useCallback(async () => {
    const session = callSessionRef.current
    if (!session) return
    try { await chatService.endCall(session.convUuid, session.callId, 'declined') } catch {}
    cleanupCall()
  }, [cleanupCall])

  const endCurrentCall = useCallback(async () => {
    const session = callSessionRef.current
    if (!session) return
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
  const systemConvs = filteredConvs.filter(c => c.is_system)
  const groupConvs = filteredConvs.filter(c => c.type === 'group' && !c.is_system)
  const currentTyping = selectedUuid ? (typingUsers.get(selectedUuid) ?? []) : []

  // Team members filtered by search, sorted online-first then alphabetically
  const statusOrder = (s: string) => s === 'online' ? 0 : s === 'away' ? 1 : s === 'busy' ? 2 : 3
  const filteredMembers = teamMembers
    .filter(m => m.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
    .sort((a, b) => {
      const sa = onlineStatus.get(a.id) ?? a.status
      const sb = onlineStatus.get(b.id) ?? b.status
      const diff = statusOrder(sa) - statusOrder(sb)
      return diff !== 0 ? diff : a.name.localeCompare(b.name)
    })

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full -m-6 overflow-hidden" style={{ minHeight: 0 }}>

      {/* ── Sidebar ── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">

        {/* Sidebar header */}
        <div className="px-4 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-slate-800">Team Chat</h1>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search people…"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-100 text-slate-700 placeholder-slate-400 text-xs rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-indigo-300"
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Sidebar list */}
        <div className="flex-1 overflow-y-auto pb-4 space-y-0.5 px-2">

          {/* Channels (system) */}
          {systemConvs.length > 0 && (
            <div>
              <div className="flex items-center px-2 pt-3 pb-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Channels</p>
              </div>
              {systemConvs.map(conv => (
                <button
                  key={conv.uuid}
                  onClick={() => selectConversation(conv.uuid)}
                  className={cn(
                    'w-full flex items-start gap-2.5 px-2 py-2 rounded-xl transition-all text-left',
                    selectedUuid === conv.uuid ? 'bg-indigo-50' : 'hover:bg-slate-50',
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5', conv.system_slug === 'lender' ? 'bg-violet-500' : 'bg-emerald-500')}>
                    {conv.system_slug === 'lender' ? <Building2 className="w-4 h-4" /> : conv.system_slug === 'merchant' ? <Store className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn('text-sm truncate font-medium', selectedUuid === conv.uuid ? 'text-indigo-700' : 'text-slate-700')}>{conv.name}</p>
                      {(conv.unread_count ?? 0) > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    {conv.last_message && <p className="text-xs text-slate-400 truncate mt-0.5">{conv.last_message.body}</p>}
                    {!conv.last_message && <p className="text-xs text-slate-400 mt-0.5">Broadcast channel</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Groups section */}
          <div>
            <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Groups
              </p>
              <button
                onClick={() => setShowCreateGroup(true)}
                title="Create group"
                className="w-5 h-5 rounded-md hover:bg-slate-100 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500" />
              </button>
            </div>
            {groupConvs.length === 0 && (
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs text-slate-400 hover:bg-slate-50 hover:text-indigo-500 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Create your first group
              </button>
            )}
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

          {/* ── People ─────────────────────────────────────────────────────── */}
          {filteredMembers.length > 0 && (
            <div>
              {/* Header with online / total counts */}
              <div className="flex items-center justify-between px-2 pt-3 pb-1.5">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  People
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    {filteredMembers.filter(m => (onlineStatus.get(m.id) ?? m.status) === 'online').length} online
                  </span>
                  <span className="text-slate-400 text-[10px]">·</span>
                  <span className="text-[10px] text-slate-400">{filteredMembers.length} total</span>
                </div>
              </div>
              {filteredMembers.map(member => {
                const effectiveStatus = (onlineStatus.get(member.id) ?? member.status) as string
                const dotColor =
                  effectiveStatus === 'online' ? 'bg-emerald-400' :
                  effectiveStatus === 'away'   ? 'bg-amber-400'   :
                  effectiveStatus === 'busy'   ? 'bg-rose-400'    : 'bg-slate-600'
                // Find if we already have a DM open with this member
                const existingDm = directConvs.find(c =>
                  c.participants.some(p => p.user_id === member.id)
                )
                const isActive = existingDm ? selectedUuid === existingDm.uuid : false
                return (
                  <button
                    key={member.id}
                    onClick={() => openDmWith(member.id)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl transition-all text-left',
                      isActive ? 'bg-indigo-50' : 'hover:bg-slate-50',
                    )}
                  >
                    {/* Avatar with presence ring */}
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold',
                        avatarBg(member.id),
                      )}>
                        {initials(member.name)}
                      </div>
                      <span className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white',
                        dotColor,
                      )} />
                    </div>

                    {/* Name + status */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium truncate leading-tight',
                        isActive ? 'text-indigo-700' : 'text-slate-700',
                      )}>
                        {member.name}
                      </p>
                      <p className="text-[10px] text-slate-400 capitalize leading-none mt-0.5">
                        {effectiveStatus}
                      </p>
                    </div>

                    {/* Unread badge from existing DM */}
                    {existingDm && (existingDm.unread_count ?? 0) > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-indigo-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {(existingDm.unread_count ?? 0) > 9 ? '9+' : existingDm.unread_count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {filteredMembers.length === 0 && groupConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <MessagesSquare className="w-8 h-8 text-slate-600" />
              <p className="text-xs text-slate-500 text-center px-4">
                {sidebarSearch ? 'No matches found' : 'No team members found.'}
              </p>
            </div>
          )}
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
              <p className="text-sm text-slate-400 mt-1">Select a person from the list to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <ChatHeader
              conv={selectedConv}
              currentUserId={user?.id}
              onlineStatus={onlineStatus}
              avatarBg={avatarBg}
              onCall={startCall}
              onAddMember={selectedConv.type === 'group' ? () => setShowAddMember(true) : undefined}
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

            {/* Input area / read-only notice */}
            {selectedConv?.is_system ? (
              <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-xs text-slate-400">This is a read-only broadcast channel</p>
              </div>
            ) : (
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
            )}
          </>
        )}
      </div>

      {/* ── Create group modal ── */}
      {showCreateGroup && (
        <CreateGroupModal
          members={teamMembers}
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}

      {/* ── Add member modal ── */}
      {showAddMember && selectedConv && selectedConv.type === 'group' && (
        <AddMemberModal
          conversationUuid={selectedConv.uuid}
          existingUserIds={new Set(selectedConv.participants.map(p => p.user_id))}
          members={teamMembers}
          onClose={() => setShowAddMember(false)}
          onAdded={() => {
            // Refresh conversations to get updated participant list
            chatService.getConversations().then(res => {
              const list = res.data?.data ?? []
              setConversations(list)
            }).catch(() => {})
          }}
        />
      )}

      {/* ── Call overlays ── */}
      {callPhase === 'calling' && callSession && (
        <CallingOverlay session={callSession} onCancel={endCurrentCall} />
      )}
      {callPhase === 'incoming' && callSession && (
        <IncomingCallOverlay
          session={callSession}
          onAccept={acceptIncomingCall}
          onDecline={declineCall}
        />
      )}
      {callPhase === 'active' && callSession && (
        <ActiveCallOverlay
          session={callSession}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          callSeconds={callSeconds}
          onMute={toggleMute}
          onCamera={toggleCamera}
          onEnd={endCurrentCall}
          remoteVideoRef={remoteVideoRef}
          localVideoRef={localVideoRef}
          remoteAudioRef={remoteAudioRef}
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
        isActive ? 'bg-indigo-50' : 'hover:bg-slate-50',
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
          <span className={cn('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white', dotClass)} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <p className={cn('text-sm truncate font-medium', isActive ? 'text-indigo-700' : 'text-slate-700')}>
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
          <p className="text-xs text-slate-500 truncate mt-0.5">
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
  onCall?: (type: 'audio' | 'video') => void
  onAddMember?: () => void
}

const ChatHeader = memo(function ChatHeader({ conv, currentUserId, onlineStatus, avatarBg, onCall, onAddMember }: ChatHeaderProps) {
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
            <button
              onClick={() => onCall?.('audio')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Audio call"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              onClick={() => onCall?.('video')}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Video call"
            >
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
                  {onAddMember && (
                    <div className="px-2 pt-1 mt-1 border-t border-slate-100">
                      <button
                        onClick={() => { setShowMembers(false); onAddMember() }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-indigo-600 hover:bg-indigo-50 transition-colors font-medium"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Add member
                      </button>
                    </div>
                  )}
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
