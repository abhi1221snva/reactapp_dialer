import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Inbox, Star, Send, Trash2, Search, PenLine, RefreshCw,
  ChevronLeft, X, Loader2, AlertCircle, Paperclip,
  EyeOff, Reply, Forward, Mail, Menu, ChevronDown,
  FileText, AlertTriangle, CheckSquare, Square, MoreVertical,
  Minimize2, Maximize2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { gmailService } from '../../services/gmail.service'
import api from '../../api/axios'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailAddress { name: string; email: string }

interface EmailSummary {
  id: string
  thread_id: string
  from: EmailAddress
  to: EmailAddress
  subject: string
  date: string | null
  snippet: string
  is_unread: boolean
  is_starred: boolean
  is_important: boolean
  labels: string[]
}

interface EmailDetail extends EmailSummary {
  cc: EmailAddress
  bcc: EmailAddress
  body_html: string
  body_text: string
  attachments: Array<{
    id: string
    message_id: string
    filename: string
    mime_type: string
    size: number
  }>
}

interface GmailLabel {
  id: string
  name: string
  type: string
  messages_total: number
  messages_unread: number
}

interface ComposeData {
  to: string; cc: string; bcc: string; subject: string; body: string; showCc: boolean
}

interface EmailListResult {
  emails: EmailSummary[]
  next_page_token?: string
  result_size_estimate: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const isThisYear = d.getFullYear() === now.getFullYear()
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (isThisYear) return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })
  } catch { return '' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getAvatar(name: string, email: string): string {
  return (name || email || '?')[0].toUpperCase()
}

const AVATAR_COLORS = [
  '#1a73e8', '#34a853', '#ea4335', '#fbbc04',
  '#9c27b0', '#00897b', '#f4511e', '#0288d1',
]
function avatarColor(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const FOLDERS = [
  { id: 'INBOX',   label: 'Inbox',  icon: Inbox,         system: true },
  { id: 'STARRED', label: 'Starred', icon: Star,          system: true },
  { id: 'SENT',    label: 'Sent',    icon: Send,          system: true },
  { id: 'DRAFT',   label: 'Drafts',  icon: FileText,      system: true },
  { id: 'SPAM',    label: 'Spam',    icon: AlertTriangle, system: true },
  { id: 'TRASH',   label: 'Trash',   icon: Trash2,        system: true },
]

// ─── Compose Modal ────────────────────────────────────────────────────────────

function ComposeModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [form, setForm] = useState<ComposeData>({ to: '', cc: '', bcc: '', subject: '', body: '', showCc: false })
  const [minimized, setMinimized] = useState(false)

  const sendMutation = useMutation({
    mutationFn: () => gmailService.sendEmail({ to: form.to, subject: form.subject, body: form.body, cc: form.cc || undefined, bcc: form.bcc || undefined }),
    onSuccess: () => { toast.success('Email sent'); onSent(); onClose() },
    onError: () => toast.error('Failed to send email'),
  })

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.to.trim()) { toast.error('Recipient required'); return }
    if (!form.subject.trim()) { toast.error('Subject required'); return }
    sendMutation.mutate()
  }

  return (
    <div className="fixed bottom-0 right-6 z-50 w-[520px] shadow-2xl rounded-t-xl overflow-hidden border border-slate-300"
      style={{ fontFamily: 'Google Sans, Roboto, sans-serif' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer select-none"
        style={{ background: '#404040' }}
        onClick={() => setMinimized(m => !m)}
      >
        <span className="text-sm text-white font-medium">New Message</span>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => setMinimized(m => !m)} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors">
            {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
          </button>
          <button onClick={onClose} className="p-1 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <form onSubmit={handleSend} className="flex flex-col bg-white" style={{ height: 480 }}>
          <div className="border-b border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-8 shrink-0">To</span>
              <input className="flex-1 text-sm outline-none placeholder-slate-400 text-slate-800"
                placeholder="Recipients" value={form.to}
                onChange={e => setForm(f => ({ ...f, to: e.target.value }))} />
              <button type="button" onClick={() => setForm(f => ({ ...f, showCc: !f.showCc }))}
                className="text-xs text-slate-400 hover:text-slate-700 shrink-0">
                {form.showCc ? 'Hide' : 'Cc Bcc'}
              </button>
            </div>
          </div>
          {form.showCc && (
            <>
              <div className="border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8 shrink-0">Cc</span>
                <input className="flex-1 text-sm outline-none placeholder-slate-400"
                  placeholder="Cc" value={form.cc}
                  onChange={e => setForm(f => ({ ...f, cc: e.target.value }))} />
              </div>
              <div className="border-b border-slate-200 px-3 py-2 flex items-center gap-2">
                <span className="text-xs text-slate-500 w-8 shrink-0">Bcc</span>
                <input className="flex-1 text-sm outline-none placeholder-slate-400"
                  placeholder="Bcc" value={form.bcc}
                  onChange={e => setForm(f => ({ ...f, bcc: e.target.value }))} />
              </div>
            </>
          )}
          <div className="border-b border-slate-200 px-3 py-2">
            <input className="w-full text-sm outline-none placeholder-slate-400 font-medium text-slate-800"
              placeholder="Subject" value={form.subject}
              onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <textarea
            className="flex-1 px-3 py-3 text-sm outline-none resize-none placeholder-slate-400 text-slate-800 leading-relaxed"
            placeholder="Compose email"
            value={form.body}
            onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          />
          <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200">
            <button type="submit" disabled={sendMutation.isPending}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-60 transition-colors"
              style={{ background: '#1a73e8' }}>
              {sendMutation.isPending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : 'Send'}
            </button>
            <button type="button" onClick={onClose}
              className="ml-auto p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── Email Detail Panel ───────────────────────────────────────────────────────

function EmailDetailPanel({
  messageId, onClose, onStarToggled, onTrashed,
}: {
  messageId: string
  onClose: () => void
  onStarToggled: (id: string, starred: boolean) => void
  onTrashed: (id: string) => void
}) {
  const qc = useQueryClient()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [showReply, setShowReply] = useState(false)
  const [replyBody, setReplyBody] = useState('')

  const { data: email, isLoading } = useQuery({
    queryKey: ['gmail-email', messageId],
    queryFn: () => gmailService.getEmail(messageId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (res: any) => (res.data?.data?.email ?? res.data?.data) as EmailDetail,
  })

  useEffect(() => {
    if (email?.is_unread) {
      gmailService.markAsRead(messageId).catch(() => {})
      qc.setQueryData(['gmail-emails'], (old: EmailListResult | undefined) => {
        if (!old) return old
        return { ...old, emails: old.emails.map(e => e.id === messageId ? { ...e, is_unread: false } : e) }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email?.id])

  const starMutation = useMutation({
    mutationFn: () => email?.is_starred ? gmailService.unstarEmail(messageId) : gmailService.starEmail(messageId),
    onSuccess: () => { onStarToggled(messageId, !email?.is_starred); qc.invalidateQueries({ queryKey: ['gmail-email', messageId] }) },
  })

  const trashMutation = useMutation({
    mutationFn: () => gmailService.trashEmail(messageId),
    onSuccess: () => { toast.success('Moved to trash'); onTrashed(messageId); onClose() },
    onError: () => toast.error('Failed to move to trash'),
  })

  const sendReplyMutation = useMutation({
    mutationFn: () => gmailService.sendEmail({
      to: email?.from.email ?? '',
      subject: `Re: ${email?.subject ?? ''}`,
      body: replyBody,
    }),
    onSuccess: () => { toast.success('Reply sent'); setShowReply(false); setReplyBody('') },
    onError: () => toast.error('Failed to send reply'),
  })

  const handleIframeLoad = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    try {
      const h = iframe.contentDocument?.body?.scrollHeight
      if (h) iframe.style.height = h + 32 + 'px'
    } catch { /**/ }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 size={24} className="animate-spin" style={{ color: '#1a73e8' }} />
      </div>
    )
  }

  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <p className="text-sm text-slate-400">Email not found</p>
      </div>
    )
  }

  const initials = getAvatar(email.from.name, email.from.email)
  const bgColor = avatarColor(email.from.email)

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 flex-shrink-0">
        <button onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
          title="Back">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-1 ml-1">
          <button onClick={() => trashMutation.mutate()} disabled={trashMutation.isPending}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" title="Move to trash">
            <Trash2 size={16} />
          </button>
          <button onClick={() => { gmailService.markAsUnread(messageId).then(() => { toast.success('Marked unread'); onClose() }).catch(() => toast.error('Failed')) }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors" title="Mark as unread">
            <EyeOff size={16} />
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => starMutation.mutate()}
            disabled={starMutation.isPending}
            className="p-2 rounded-full hover:bg-slate-100 transition-colors"
            title={email.is_starred ? 'Unstar' : 'Star'}>
            <Star size={16} fill={email.is_starred ? '#f59e0b' : 'none'} stroke={email.is_starred ? '#f59e0b' : 'currentColor'} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Email content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Subject */}
        <h2 className="text-2xl font-normal text-slate-800 mb-5" style={{ fontFamily: 'Google Sans, Roboto, sans-serif' }}>
          {email.subject || '(No Subject)'}
        </h2>

        {/* From / meta */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: bgColor }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-900">
                {email.from.name || email.from.email}
              </span>
              <span className="text-xs text-slate-500">&lt;{email.from.email}&gt;</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              to {email.to.name || email.to.email}
              {email.to.email ? ` <${email.to.email}>` : ''}
              {email.cc?.email ? `, cc: ${email.cc.name || email.cc.email}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-400">
              {email.date ? new Date(email.date).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
            <button onClick={() => starMutation.mutate()} disabled={starMutation.isPending}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors">
              <Star size={16} fill={email.is_starred ? '#f59e0b' : 'none'} stroke={email.is_starred ? '#f59e0b' : '#94a3b8'} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="text-sm text-slate-800 leading-relaxed mb-6">
          {email.body_html ? (
            <iframe
              ref={iframeRef}
              srcDoc={email.body_html}
              sandbox="allow-same-origin"
              className="w-full border-0 min-h-[200px]"
              style={{ height: 'auto' }}
              onLoad={handleIframeLoad}
              title="Email body"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans leading-relaxed text-slate-700">
              {email.body_text || email.snippet || '(No content)'}
            </pre>
          )}
        </div>

        {/* Attachments */}
        {email.attachments?.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              {email.attachments.length} Attachment{email.attachments.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-wrap gap-2">
              {email.attachments.map(att => (
                <div key={att.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs text-slate-700 transition-colors cursor-pointer">
                  <Paperclip size={12} className="text-slate-400" />
                  <span className="font-medium">{att.filename}</span>
                  <span className="text-slate-400">{formatBytes(att.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reply / Forward */}
        {!showReply && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Reply size={14} /> Reply
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Forward size={14} /> Forward
            </button>
          </div>
        )}

        {/* Inline reply box */}
        {showReply && (
          <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-2">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
              Replying to <strong>{email.from.name || email.from.email}</strong>
            </div>
            <textarea
              autoFocus
              className="w-full px-4 py-3 text-sm outline-none resize-none text-slate-800 placeholder-slate-400"
              style={{ minHeight: 120 }}
              placeholder="Write your reply…"
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
            />
            <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-200">
              <button
                onClick={() => sendReplyMutation.mutate()}
                disabled={sendReplyMutation.isPending || !replyBody.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium text-white disabled:opacity-60 transition-colors"
                style={{ background: '#1a73e8' }}
              >
                {sendReplyMutation.isPending ? <><Loader2 size={13} className="animate-spin" /> Sending…</> : 'Send'}
              </button>
              <button onClick={() => { setShowReply(false); setReplyBody('') }}
                className="px-3 py-2 rounded-full text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Email Row ────────────────────────────────────────────────────────────────

function EmailRow({
  email, selected, checked, onClick, onStar, onCheck,
}: {
  email: EmailSummary
  selected: boolean
  checked: boolean
  onClick: () => void
  onStar: (e: React.MouseEvent) => void
  onCheck: (e: React.MouseEvent) => void
}) {
  const [hovered, setHovered] = useState(false)
  const bgColor = avatarColor(email.from.email)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'flex items-center gap-2 px-4 py-0 cursor-pointer border-b border-slate-200 group relative transition-colors select-none',
        selected ? 'bg-blue-50 shadow-[inset_3px_0_0_#1a73e8]' : hovered ? 'bg-[#f2f6fc]' : email.is_unread ? 'bg-white' : 'bg-[#f6f8fc]',
      )}
      style={{ height: 52 }}
    >
      {/* Checkbox — only visible on hover or when checked */}
      <div className="flex items-center justify-center w-5 shrink-0" onClick={onCheck}>
        {(hovered || checked) ? (
          checked
            ? <CheckSquare size={16} className="text-slate-600" />
            : <Square size={16} className="text-slate-400 hover:text-slate-600" />
        ) : (
          // Avatar fallback when not hovering and not checked
          <div className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-bold"
            style={{ background: bgColor }}>
            {getAvatar(email.from.name, email.from.email)}
          </div>
        )}
      </div>

      {/* Star */}
      <button
        onClick={onStar}
        className={cn('shrink-0 w-5 flex items-center justify-center transition-colors', email.is_starred ? 'text-amber-400' : 'text-slate-300 hover:text-amber-400')}
        style={{ color: email.is_starred ? '#f59e0b' : undefined }}
      >
        <Star size={15} fill={email.is_starred ? 'currentColor' : 'none'} />
      </button>

      {/* Sender name */}
      <div className={cn('shrink-0 w-36 truncate text-sm', email.is_unread ? 'font-semibold text-slate-900' : 'font-normal text-slate-700')}>
        {email.from.name || email.from.email}
      </div>

      {/* Subject + snippet */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
        <span className={cn('text-sm shrink-0', email.is_unread ? 'font-semibold text-slate-900' : 'text-slate-800')}>
          {email.subject || '(No Subject)'}
        </span>
        <span className="text-sm text-slate-500 truncate">
          — {email.snippet}
        </span>
      </div>

      {/* Right side: attachment icon + date */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {email.labels.includes('IMPORTANT') && (
          <div className="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-[7px] border-b-amber-400" title="Important" />
        )}
        {(email as EmailSummary & { attachments?: unknown[] }).attachments?.length ? (
          <Paperclip size={13} className="text-slate-400" />
        ) : null}
        <span className={cn('text-xs w-16 text-right', email.is_unread ? 'font-semibold text-slate-800' : 'text-slate-500')}>
          {formatDate(email.date)}
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GmailMailbox() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()

  const [folder, setFolder]           = useState('INBOX')
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [pageTokens, setPageTokens]   = useState<string[]>([])
  const [pageToken, setPageToken]     = useState<string | undefined>()
  const [compose, setCompose]         = useState(false)
  const [localEmails, setLocalEmails] = useState<EmailSummary[] | null>(null)
  const [oauthError, setOauthError]   = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [checked, setChecked]         = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll]     = useState(false)
  const [connecting, setConnecting]   = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>()

  // Handle OAuth callback params
  useEffect(() => {
    const status  = searchParams.get('status')
    const message = searchParams.get('message')
    if (status === 'success') {
      toast.success('Gmail connected successfully!')
      qc.invalidateQueries({ queryKey: ['gmail-status'] })
      qc.invalidateQueries({ queryKey: ['integrations'] })
    } else if (status === 'error') {
      const msg = message ? decodeURIComponent(message) : 'Failed to connect Gmail'
      setOauthError(msg)
      toast.error(msg)
    }
    if (status) setSearchParams({}, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Status check (raw fetch — bypass 401 interceptor)
  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/gmail/status`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
      )
      if (!res.ok) return { connected: false }
      const json = await res.json()
      return json?.data ?? json
    },
    retry: 0,
    staleTime: 30_000,
  })

  const connected = (statusData as { connected?: boolean })?.connected ?? false

  // Labels
  const { data: labelsData } = useQuery({
    queryKey: ['gmail-labels'],
    queryFn: () => gmailService.getLabels(),
    enabled: connected,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (res: any) => (res.data?.data?.labels ?? []) as GmailLabel[],
    staleTime: 60_000,
  })

  // Email list
  const { data: emailsData, isLoading: emailsLoading, isFetching, error: emailsError } = useQuery<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    any, Error, EmailListResult
  >({
    queryKey: ['gmail-emails', folder, search, pageToken],
    queryFn: () => gmailService.listEmails({ folder, limit: 25, page_token: pageToken, q: search || undefined }),
    enabled: connected,
    retry: 1,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select: (res: any) => res.data?.data as EmailListResult,
    placeholderData: (prev: EmailListResult | undefined) => prev,
  })

  const emails = localEmails ?? emailsData?.emails ?? []
  const nextPageToken = emailsData?.next_page_token

  useEffect(() => {
    if (emailsData?.emails) {
      setLocalEmails(emailsData.emails)
      setChecked(new Set())
      setSelectAll(false)
    }
  }, [emailsData])

  const handleSearchInput = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      setSearch(val)
      setPageToken(undefined)
      setPageTokens([])
      setSelectedId(null)
      setLocalEmails(null)
    }, 500)
  }

  const handleFolderChange = (f: string) => {
    setFolder(f)
    setSelectedId(null)
    setPageToken(undefined)
    setPageTokens([])
    setLocalEmails(null)
    setSearch('')
    setSearchInput('')
    setChecked(new Set())
  }

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      starred ? gmailService.unstarEmail(id) : gmailService.starEmail(id),
    onSuccess: (_, vars) => {
      setLocalEmails(prev => prev?.map(e => e.id === vars.id ? { ...e, is_starred: !vars.starred } : e) ?? null)
    },
  })

  const handleStarToggle = (e: React.MouseEvent, email: EmailSummary) => {
    e.stopPropagation()
    starMutation.mutate({ id: email.id, starred: email.is_starred })
  }

  const handleCheck = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setChecked(new Set())
      setSelectAll(false)
    } else {
      setChecked(new Set(emails.map(e => e.id)))
      setSelectAll(true)
    }
  }

  const handleEmailSelect = (id: string) => {
    setSelectedId(id)
    setLocalEmails(prev => prev?.map(e => e.id === id ? { ...e, is_unread: false } : e) ?? null)
  }

  const handleStarToggleFromDetail = (id: string, starred: boolean) => {
    setLocalEmails(prev => prev?.map(e => e.id === id ? { ...e, is_starred: starred } : e) ?? null)
  }

  const handleTrashedFromDetail = (id: string) => {
    setLocalEmails(prev => prev?.filter(e => e.id !== id) ?? null)
    setSelectedId(null)
  }

  const handleNextPage = () => {
    if (!nextPageToken) return
    setPageTokens(prev => [...prev, pageToken ?? ''])
    setPageToken(nextPageToken)
    setSelectedId(null)
    setLocalEmails(null)
  }

  const handlePrevPage = () => {
    const prev = [...pageTokens]
    const token = prev.pop() ?? undefined
    setPageTokens(prev)
    setPageToken(token)
    setSelectedId(null)
    setLocalEmails(null)
  }

  const getUnreadCount = (labelId: string) =>
    labelsData?.find(l => l.id === labelId)?.messages_unread ?? 0

  const folderLabel = FOLDERS.find(f => f.id === folder)?.label ?? folder

  // ── Loading ──────────────────────────────────────────────────────────────

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin" style={{ color: '#1a73e8' }} />
      </div>
    )
  }

  // ── Not connected ─────────────────────────────────────────────────────────

  if (!connected) {
    const handleConnect = async () => {
      try {
        setConnecting(true)
        const res = await api.post('/connect-integration', { provider: 'gmail' })
        const url = res.data?.data?.redirect_url || res.data?.redirect_url
        if (url) window.location.href = url
        else toast.success('Gmail connected')
      } catch {
        toast.error('Could not initiate Gmail connection')
      } finally {
        setConnecting(false)
      }
    }

    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: '#fce8e6' }}>
          <Mail size={28} style={{ color: '#ea4335' }} />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-slate-900">Gmail Not Connected</h2>
          {oauthError ? (
            <p className="text-sm mt-1 max-w-sm" style={{ color: '#ea4335' }}>{oauthError}</p>
          ) : (
            <p className="text-sm text-slate-500 mt-1">Connect your Gmail account to view and send emails.</p>
          )}
        </div>
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="px-5 py-2 rounded-full text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ background: '#1a73e8' }}
        >
          {connecting ? 'Connecting…' : 'Connect Gmail'}
        </button>
      </div>
    )
  }

  // ── Main layout ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 shadow-sm"
      style={{ height: 'calc(100vh - 120px)', background: '#f6f8fc', fontFamily: 'Roboto, sans-serif' }}>

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0 bg-white border-b border-slate-200">
        {/* Hamburger */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <Menu size={20} />
        </button>

        {/* Gmail logo area */}
        <div className="flex items-center gap-1 mr-2">
          <Mail size={22} style={{ color: '#ea4335' }} />
          <span className="text-lg font-medium text-slate-700 hidden sm:block" style={{ fontFamily: 'Google Sans, sans-serif' }}>
            Gmail
          </span>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-3 px-4 py-2 rounded-full transition-all"
            style={{ background: '#eaf1fb' }}>
            <Search size={18} className="text-slate-500 shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none placeholder-slate-500 text-slate-800"
              placeholder="Search mail"
              value={searchInput}
              onChange={e => handleSearchInput(e.target.value)}
            />
            {searchInput && (
              <button onClick={() => handleSearchInput('')} className="text-slate-400 hover:text-slate-600">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => { setLocalEmails(null); qc.invalidateQueries({ queryKey: ['gmail-emails'] }) }}
            disabled={isFetching}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Body Row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
        <aside
          className={cn(
            'flex flex-col flex-shrink-0 overflow-y-auto overflow-x-hidden transition-all duration-200',
            sidebarOpen ? 'w-56' : 'w-14'
          )}
          style={{ background: '#f6f8fc' }}
        >
          {/* Compose */}
          <div className="p-3">
            {sidebarOpen ? (
              <button
                onClick={() => setCompose(true)}
                className="flex items-center gap-3 pl-4 pr-6 py-2 rounded-2xl shadow-sm text-sm font-medium text-slate-700 hover:shadow-md transition-all w-full"
                style={{ background: '#c2e7ff' }}
              >
                <PenLine size={20} />
                Compose
              </button>
            ) : (
              <button
                onClick={() => setCompose(true)}
                className="flex items-center justify-center w-10 h-10 rounded-2xl shadow-sm hover:shadow-md transition-all"
                style={{ background: '#c2e7ff' }}
                title="Compose"
              >
                <PenLine size={18} className="text-slate-700" />
              </button>
            )}
          </div>

          {/* Folders */}
          <nav className="px-2 space-y-0.5">
            {FOLDERS.map(({ id, label, icon: Icon }) => {
              const count = getUnreadCount(id)
              const isActive = folder === id
              return (
                <button
                  key={id}
                  onClick={() => handleFolderChange(id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors text-left',
                    isActive
                      ? 'font-semibold'
                      : 'text-slate-700 hover:bg-slate-200/70'
                  )}
                  style={isActive ? { background: '#d3e3fd', color: '#1d1d1d' } : undefined}
                  title={!sidebarOpen ? label : undefined}
                >
                  <Icon size={18} className="shrink-0" style={{ color: isActive ? '#1d1d1d' : '#444746' }} />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {count > 0 && (
                        <span className="text-xs font-bold text-slate-700">
                          {count > 999 ? '999+' : count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </nav>

          {/* User labels */}
          {sidebarOpen && labelsData && labelsData.filter(l => l.type === 'user').length > 0 && (
            <>
              <div className="px-5 pt-4 pb-1 flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Labels</p>
              </div>
              <nav className="px-2 space-y-0.5">
                {labelsData.filter(l => l.type === 'user').slice(0, 8).map(label => (
                  <button
                    key={label.id}
                    onClick={() => handleFolderChange(label.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-1.5 rounded-full text-sm transition-colors text-left',
                      folder === label.id ? 'font-semibold' : 'text-slate-700 hover:bg-slate-200/70'
                    )}
                    style={folder === label.id ? { background: '#d3e3fd', color: '#1d1d1d' } : undefined}
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#1a73e8' }} />
                    <span className="flex-1 truncate">{label.name}</span>
                    {label.messages_unread > 0 && (
                      <span className="text-xs font-bold text-slate-700">{label.messages_unread}</span>
                    )}
                  </button>
                ))}
              </nav>
            </>
          )}
        </aside>

        {/* ── EMAIL LIST + DETAIL AREA ──────────────────────────────────── */}
        <div className="flex flex-1 min-w-0 gap-0 p-2 pl-0 min-h-0">

          {/* Email list panel */}
          <div className={cn(
            'flex flex-col rounded-2xl overflow-hidden min-h-0',
            selectedId ? 'hidden lg:flex lg:w-[380px] xl:w-[420px] shrink-0' : 'flex-1'
          )}
            style={{ background: 'white', marginRight: selectedId ? '8px' : 0 }}>

            {/* List toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 flex-shrink-0">
              {/* Select all checkbox */}
              <button onClick={handleSelectAll} className="p-1 rounded hover:bg-slate-100 transition-colors">
                {selectAll
                  ? <CheckSquare size={16} className="text-slate-600" />
                  : <Square size={16} className="text-slate-400" />
                }
              </button>
              <button className="p-1 rounded hover:bg-slate-100 transition-colors text-slate-400">
                <ChevronDown size={14} />
              </button>

              {checked.size > 0 && (
                <span className="text-xs text-slate-500 ml-1">{checked.size} selected</span>
              )}

              <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                {emailsData?.result_size_estimate ? (
                  <span>~{emailsData.result_size_estimate.toLocaleString()} emails</span>
                ) : null}
              </div>
            </div>

            {/* Folder title row */}
            <div className="px-4 py-1 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
              <span className="text-xs font-medium text-slate-500">{folderLabel}</span>
              {search && <span className="text-xs" style={{ color: '#1a73e8' }}>Searching: "{search}"</span>}
            </div>

            {/* Email rows */}
            <div className="flex-1 overflow-y-auto">
              {emailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={22} className="animate-spin" style={{ color: '#1a73e8' }} />
                </div>
              ) : emailsError ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                  <AlertCircle size={28} style={{ color: '#ea4335' }} />
                  <p className="text-sm font-semibold text-slate-700">Failed to load emails</p>
                  <p className="text-xs text-slate-500 max-w-xs break-words">
                    {(emailsError as { response?: { data?: { message?: string } } })?.response?.data?.message ?? emailsError.message}
                  </p>
                  <button
                    onClick={() => navigate('/profile', { state: { section: 'integrations' } })}
                    className="text-xs font-medium" style={{ color: '#1a73e8' }}
                  >
                    Reconnect Gmail
                  </button>
                </div>
              ) : emails.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <Mail size={40} className="opacity-20" />
                  <p className="text-sm">{search ? 'No results found' : 'No emails in this folder'}</p>
                </div>
              ) : (
                emails.map(email => (
                  <EmailRow
                    key={email.id}
                    email={email}
                    selected={selectedId === email.id}
                    checked={checked.has(email.id)}
                    onClick={() => handleEmailSelect(email.id)}
                    onStar={e => handleStarToggle(e, email)}
                    onCheck={e => handleCheck(e, email.id)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {(pageTokens.length > 0 || nextPageToken) && (
              <div className="flex items-center justify-end gap-4 px-4 py-2 border-t border-slate-100 flex-shrink-0 text-xs text-slate-500">
                <button
                  onClick={handlePrevPage}
                  disabled={pageTokens.length === 0}
                  className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
                  title="Newer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={!nextPageToken}
                  className="p-1 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors rotate-180"
                  title="Older"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Email detail panel */}
          {selectedId ? (
            <div className="flex-1 min-w-0 rounded-2xl overflow-hidden flex flex-col" style={{ background: 'white' }}>
              <EmailDetailPanel
                messageId={selectedId}
                onClose={() => setSelectedId(null)}
                onStarToggled={handleStarToggleFromDetail}
                onTrashed={handleTrashedFromDetail}
              />
            </div>
          ) : (
            <div className="flex-1 hidden lg:flex items-center justify-center rounded-2xl" style={{ background: '#f6f8fc' }}>
              <div className="text-center text-slate-300">
                <Mail size={48} className="mx-auto opacity-20 mb-3" />
                <p className="text-sm text-slate-400">Select an email to read</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      {compose && (
        <ComposeModal
          onClose={() => setCompose(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ['gmail-emails'] })}
        />
      )}
    </div>
  )
}
