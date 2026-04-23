import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Loader2, CheckCheck, Search, Phone,
  Check, Circle, Clock, ChevronRight, SquarePen, X, UserCheck, ChevronDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { SmsConversation, SmsMessage, SmsAgent } from '../../types/crm.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ago(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000)   return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`
  if (diff < 604_800_000) {
    return new Date(ts).toLocaleDateString('en-US', { weekday: 'short' })
  }
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMsgTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDayLabel(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.setHours(0,0,0,0) - d.setHours(0,0,0,0)
  if (diff === 0) return 'Today'
  if (diff === 86_400_000) return 'Yesterday'
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Format digits as user types into (XXX)XXX-XXXX */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length <= 3) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 3)})${digits.slice(3)}`
  return `(${digits.slice(0, 3)})${digits.slice(3, 6)}-${digits.slice(6)}`
}

/** Convert (XXX)XXX-XXXX display value to E.164 +1XXXXXXXXXX for API */
function toE164(display: string): string {
  const digits = display.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits[0] === '1') return `+${digits}`
  return display // already E.164 or unusual — pass as-is
}

/** Format a raw phone string into (NXX) NXX-XXXX or +1 (NXX) NXX-XXXX */
function formatPhone(raw: string): string {
  if (!raw) return raw
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return raw // return as-is for unusual formats
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const AVATAR_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ede9fe', text: '#5b21b6' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#cffafe', text: '#155e75' },
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#fef2f2', text: '#991b1b' },
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const { bg, text } = avatarColor(name || '?')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color: text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 32 ? 10 : 13, fontWeight: 700, letterSpacing: '0.01em',
    }}>
      {getInitials(name || '?') || '?'}
    </div>
  )
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({ conv, isActive, onClick }: {
  conv: SmsConversation; isActive: boolean; onClick: () => void
}) {
  const name = [conv.first_name, conv.last_name].filter(Boolean).join(' ') || conv.company_name || conv.lead_phone
  const hasUnread = conv.unread_count > 0

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11,
        padding: '10px 14px',
        background: isActive ? '#f0fdf4' : 'transparent',
        borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
        borderBottom: '1px solid #f1f5f9',
        transition: 'background 0.12s ease',
        cursor: 'pointer',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {/* Avatar */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={name} size={40} />
        {hasUnread && (
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 12, height: 12, borderRadius: '50%',
            background: '#10b981', border: '2px solid #fff',
          }} />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{
            fontSize: 13, fontWeight: hasUnread ? 700 : 600,
            color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 130,
          }}>
            {name}
          </span>
          <span style={{ fontSize: 11, color: hasUnread ? '#10b981' : '#94a3b8', flexShrink: 0, marginLeft: 4, fontWeight: hasUnread ? 600 : 400 }}>
            {conv.last_message_at ? ago(conv.last_message_at) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: 12, color: hasUnread ? '#475569' : '#94a3b8',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 148, fontWeight: hasUnread ? 500 : 400,
          }}>
            {formatPhone(conv.lead_phone)}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
            {conv.agent_name && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
                background: '#ede9fe', color: '#5b21b6', whiteSpace: 'nowrap',
                maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {conv.agent_name.split(' ')[0]}
              </span>
            )}
            {hasUnread && (
              <span style={{
                minWidth: 20, height: 20, padding: '0 5px',
                background: '#10b981', color: '#fff',
                fontSize: 10, fontWeight: 800,
                borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {conv.unread_count > 9 ? '9+' : conv.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, showDay, dayLabel }: {
  msg: SmsMessage; showDay: boolean; dayLabel: string
}) {
  const isOut    = msg.direction === 'outbound'
  const isSystem = msg.direction === 'system'

  return (
    <>
      {/* Day divider */}
      {showDay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.25)' }} />
          <span style={{
            fontSize: 11, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.03em',
            background: '#e8f0ee', padding: '3px 10px', borderRadius: 20,
          }}>
            {dayLabel}
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.25)' }} />
        </div>
      )}

      {/* System message — centered gray note */}
      {isSystem ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <div style={{
            maxWidth: '85%',
            background: '#f1f5f9',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '7px 14px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 12, lineHeight: 1.5, margin: 0, color: '#64748b', fontStyle: 'italic', wordBreak: 'break-word' }}>
              {msg.body}
            </p>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>
              {formatMsgTime(msg.created_at)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          justifyContent: isOut ? 'flex-end' : 'flex-start',
          marginBottom: 6,
          paddingLeft: isOut ? 48 : 0,
          paddingRight: isOut ? 0 : 48,
        }}>
          <div style={{
            maxWidth: '75%',
            background: isOut
              ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
              : '#ffffff',
            color: isOut ? '#fff' : '#1e293b',
            padding: '9px 13px 7px',
            borderRadius: isOut ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
            boxShadow: isOut
              ? '0 2px 8px rgba(5,150,105,0.25)'
              : '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
          }}>
            {/* from/to line for outbound */}
            {isOut && msg.from_number && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', margin: '0 0 4px', letterSpacing: '0.02em' }}>
                From: {formatPhone(msg.from_number)} → {formatPhone(msg.to_number)}
              </p>
            )}
            {!isOut && msg.from_number && (
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '0 0 4px', letterSpacing: '0.02em' }}>
                {formatPhone(msg.from_number)} → {formatPhone(msg.to_number)}
              </p>
            )}
            <p style={{ fontSize: 13.5, lineHeight: 1.5, margin: 0, wordBreak: 'break-word' }}>
              {msg.body}
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3,
              marginTop: 4,
              justifyContent: isOut ? 'flex-end' : 'flex-start',
            }}>
              <span style={{ fontSize: 10.5, color: isOut ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>
                {formatMsgTime(msg.created_at)}
              </span>
              {isOut && (
                msg.status === 'delivered'
                  ? <CheckCheck size={12} style={{ color: 'rgba(255,255,255,0.85)' }} />
                  : msg.status === 'sent'
                    ? <Check size={12} style={{ color: 'rgba(255,255,255,0.6)' }} />
                    : <Clock size={11} style={{ color: 'rgba(255,255,255,0.5)' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── SenderSelect ─────────────────────────────────────────────────────────────

function SenderSelect({ numbers, value, onChange, compact = false }: {
  numbers: { id: number; phone_number: string; friendly_name: string }[]
  value: string
  onChange: (v: string) => void
  compact?: boolean
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: compact ? 0 : 8 }}>
      {!compact && (
        <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>From:</span>
      )}
      {numbers.length > 0 ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: compact ? '4px 8px' : '6px 10px',
            fontSize: 12, border: '1.5px solid #d1fae5', borderRadius: 8,
            outline: 'none', color: '#0f172a', background: '#fff',
            cursor: 'pointer', appearance: 'auto',
          }}
          onFocus={e => (e.target.style.borderColor = '#10b981')}
          onBlur={e => (e.target.style.borderColor = '#d1fae5')}
        >
          <option value="">— Auto-select number —</option>
          {numbers.map(n => (
            <option key={n.id} value={n.phone_number}>
              {n.friendly_name !== n.phone_number
                ? `${n.friendly_name} (${formatPhone(n.phone_number)})`
                : formatPhone(n.phone_number)}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="tel"
          placeholder="From number (e.g. +15551234567)"
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            flex: 1, padding: compact ? '4px 8px' : '6px 10px',
            fontSize: 12, border: '1.5px solid #d1fae5', borderRadius: 8,
            outline: 'none', color: '#0f172a', background: '#fff',
          }}
          onFocus={e => (e.target.style.borderColor = '#10b981')}
          onBlur={e => (e.target.style.borderColor = '#d1fae5')}
        />
      )}
    </div>
  )
}

// ─── AgentAssignDropdown ──────────────────────────────────────────────────────

function AgentAssignDropdown({ agents, currentAgentId, onAssign }: {
  agents: SmsAgent[]
  currentAgentId?: number
  onAssign: (agentId: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = agents.find(a => a.id === currentAgentId)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', fontSize: 12, fontWeight: 600,
          border: '1.5px solid #e2e8f0', borderRadius: 8,
          background: current ? '#ede9fe' : '#f8fafc',
          color: current ? '#5b21b6' : '#64748b',
          cursor: 'pointer', transition: 'all 0.12s',
        }}
        title="Assign agent"
      >
        <UserCheck size={13} />
        <span>{current ? current.name.split(' ')[0] : 'Assign'}</span>
        <ChevronDown size={11} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, zIndex: 200,
          background: '#fff', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
          minWidth: 180, padding: '4px 0', overflow: 'hidden',
        }}>
          <button
            onClick={() => { onAssign(null); setOpen(false) }}
            style={{
              width: '100%', textAlign: 'left', padding: '8px 14px',
              fontSize: 12, color: '#94a3b8', background: 'none', border: 'none',
              cursor: 'pointer', fontStyle: 'italic',
            }}
          >
            — Unassign —
          </button>
          {agents.map(a => (
            <button
              key={a.id}
              onClick={() => { onAssign(a.id); setOpen(false) }}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 14px',
                fontSize: 12, color: a.id === currentAgentId ? '#5b21b6' : '#1e293b',
                background: a.id === currentAgentId ? '#f5f3ff' : 'none',
                border: 'none', cursor: 'pointer', fontWeight: a.id === currentAgentId ? 600 : 400,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (a.id !== currentAgentId) (e.currentTarget as HTMLElement).style.background = '#f8fafc' }}
              onMouseLeave={e => { if (a.id !== currentAgentId) (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CrmSmsInbox() {
  const qc = useQueryClient()
  const [activeId, setActiveId]           = useState<number | null>(null)
  const [statusFilter, setStatusFilter]   = useState<'open' | 'closed' | 'archived' | ''>('')
  const [agentFilter, setAgentFilter]     = useState<number | ''>('')
  const [search, setSearch]               = useState('')
  const [body, setBody]                   = useState('')
  const [fromNumber, setFromNumber]       = useState('')
  const [showCompose, setShowCompose]     = useState(false)
  const [newPhone, setNewPhone]           = useState('')
  const [newBody, setNewBody]             = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const phoneRef    = useRef<HTMLInputElement>(null)

  const { data: senderNumbersData } = useQuery({
    queryKey: ['sms-sender-numbers'],
    queryFn:  () => crmService.getSmsSenderNumbers().then(r => r.data?.data?.numbers ?? []) as Promise<{ id: number; phone_number: string; friendly_name: string }[]>,
    staleTime: 5 * 60_000,
  })

  const { data: agentsData } = useQuery({
    queryKey: ['sms-agents'],
    queryFn:  () => crmService.getSmsAgents().then(r => r.data?.data?.agents ?? []) as Promise<SmsAgent[]>,
    staleTime: 5 * 60_000,
  })

  const agents: SmsAgent[] = agentsData ?? []

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['sms-conversations', statusFilter, agentFilter],
    queryFn:  () => crmService.getSmsConversations({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(agentFilter  ? { agent_id: agentFilter as number } : {}),
    }).then(r => r.data.data),
    refetchInterval: 15_000,
  })

  const conversations: SmsConversation[] = convsData?.data ?? []

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['sms-messages', activeId],
    queryFn:  () => crmService.getSmsMessages(activeId!).then(r => r.data.data.messages as SmsMessage[]),
    enabled:  activeId != null,
    refetchInterval: 5_000,
  })

  const sendMsg = useMutation({
    mutationFn: () => crmService.sendSmsMessageFrom(activeId!, body, fromNumber || undefined),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sms-messages', activeId] })
      qc.invalidateQueries({ queryKey: ['sms-conversations'] })
      setBody('')
      textareaRef.current?.focus()
    },
    onError: () => toast.error('Failed to send message.'),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => crmService.markConversationRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['sms-conversations'] }),
  })

  const assignAgent = useMutation({
    mutationFn: ({ convId, agentId }: { convId: number; agentId: number | null }) =>
      crmService.assignSmsAgent(convId, agentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-conversations'] })
      toast.success('Agent updated')
    },
    onError: () => toast.error('Failed to assign agent.'),
  })

  const startConv = useMutation({
    mutationFn: () => crmService.startNewSmsConversation(toE164(newPhone.trim()), newBody.trim(), fromNumber || undefined),
    onSuccess: (res) => {
      const conv = res.data?.data?.conversation
      qc.invalidateQueries({ queryKey: ['sms-conversations', statusFilter, agentFilter] })
      setShowCompose(false)
      setNewPhone('')
      setNewBody('')
      if (conv?.id) setActiveId(conv.id)
      toast.success('Message sent')
    },
    onError: () => toast.error('Failed to send message.'),
  })

  const selectConv = (id: number) => {
    setActiveId(id)
    const conv = conversations.find(c => c.id === id)
    if (conv && conv.unread_count > 0) markRead.mutate(id)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [body])

  const filtered = conversations.filter(c => {
    if (!search) return true
    const hay = [c.first_name, c.last_name, c.company_name, c.lead_phone].join(' ').toLowerCase()
    return hay.includes(search.toLowerCase())
  })

  const activeConv = conversations.find(c => c.id === activeId)
  const activeName = activeConv
    ? [activeConv.first_name, activeConv.last_name].filter(Boolean).join(' ') || activeConv.company_name || activeConv.lead_phone
    : ''

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_count || 0), 0)

  // Build message list with day dividers
  const msgsWithDay = messages.map((msg, i) => {
    const prev = messages[i - 1]
    const showDay = !prev || formatDayLabel(msg.created_at) !== formatDayLabel(prev.created_at)
    return { msg, showDay, dayLabel: showDay ? formatDayLabel(msg.created_at) : '' }
  })


  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', overflow: 'hidden', background: '#f1f5f9' }}>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* LEFT SIDEBAR                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div style={{
        width: 300, flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex', flexDirection: 'column',
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)',
      }}>

        {/* Sidebar header */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'linear-gradient(135deg,#059669,#10b981)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
              }}>
                <MessageSquare size={16} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>SMS Inbox</p>
                {totalUnread > 0 && (
                  <p style={{ fontSize: 11, color: '#10b981', fontWeight: 600, marginTop: 2 }}>
                    {totalUnread} unread
                  </p>
                )}
              </div>
            </div>
            {/* New message compose button */}
            <button
              onClick={() => { setShowCompose(s => !s); setTimeout(() => phoneRef.current?.focus(), 80) }}
              title="New message"
              style={{
                width: 32, height: 32, borderRadius: 9, border: 'none', cursor: 'pointer',
                background: showCompose ? '#ecfdf5' : 'transparent',
                color: showCompose ? '#059669' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
                boxShadow: showCompose ? 'inset 0 0 0 1.5px #6ee7b7' : 'none',
              }}
            >
              <SquarePen size={15} />
            </button>
          </div>

          {/* ── Compose panel ───────────────────────────────── */}
          {showCompose && (
            <div style={{
              background: '#f0fdf4', border: '1.5px solid #a7f3d0',
              borderRadius: 12, padding: '12px 12px 10px', marginTop: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  New Message
                </span>
                <button
                  onClick={() => { setShowCompose(false); setNewPhone(''); setNewBody('') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 2, lineHeight: 1 }}
                >
                  <X size={13} />
                </button>
              </div>
              <input
                ref={phoneRef}
                type="tel"
                placeholder="To: (XXX)XXX-XXXX"
                value={newPhone}
                onChange={e => setNewPhone(formatPhoneInput(e.target.value))}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '7px 10px', fontSize: 12,
                  border: '1.5px solid #d1fae5', borderRadius: 8,
                  outline: 'none', color: '#0f172a', background: '#fff',
                  marginBottom: 7,
                }}
                onFocus={e => (e.target.style.borderColor = '#10b981')}
                onBlur={e => (e.target.style.borderColor = '#d1fae5')}
              />
              <SenderSelect numbers={senderNumbersData ?? []} value={fromNumber} onChange={setFromNumber} />
              <textarea
                rows={2}
                placeholder="Type your message…"
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && newPhone.trim() && newBody.trim()) {
                    e.preventDefault()
                    startConv.mutate()
                  }
                }}
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  padding: '7px 10px', fontSize: 12,
                  border: '1.5px solid #d1fae5', borderRadius: 8,
                  outline: 'none', color: '#0f172a', background: '#fff',
                  fontFamily: 'inherit', marginBottom: 8,
                }}
                onFocus={e => (e.target.style.borderColor = '#10b981')}
                onBlur={e => (e.target.style.borderColor = '#d1fae5')}
              />
              <button
                onClick={() => startConv.mutate()}
                disabled={!newPhone.trim() || !newBody.trim() || startConv.isPending}
                style={{
                  width: '100%', padding: '7px 0', fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: newPhone.trim() && newBody.trim() ? 'linear-gradient(135deg,#059669,#10b981)' : '#e2e8f0',
                  color: newPhone.trim() && newBody.trim() ? '#fff' : '#94a3b8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                {startConv.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Sending…</>
                  : <><Send size={13} /> Send Message</>
                }
              </button>
            </div>
          )}

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 8, marginTop: showCompose ? 8 : 0 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7,
                fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 9,
                outline: 'none', color: '#334155', background: '#f8fafc',
              }}
              placeholder="Search by name or number…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#10b981')}
              onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
            />
          </div>

          {/* Agent filter */}
          {agents.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
              <select
                value={agentFilter}
                onChange={e => setAgentFilter(e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  flex: 1, padding: '5px 8px', fontSize: 11,
                  border: '1.5px solid #e2e8f0', borderRadius: 8,
                  outline: 'none', color: agentFilter ? '#5b21b6' : '#94a3b8',
                  background: agentFilter ? '#f5f3ff' : '#f8fafc',
                  cursor: 'pointer',
                }}
                onFocus={e => (e.target.style.borderColor = '#7c3aed')}
                onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
              >
                <option value="">All agents</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <Loader2 size={22} style={{ color: '#cbd5e1', animation: 'spin 1s linear infinite' }} className="animate-spin" />
            </div>
          ) : !filtered.length ? (
            <div style={{ textAlign: 'center', padding: '48px 16px' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <MessageSquare size={22} style={{ color: '#cbd5e1' }} />
              </div>
              <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>No conversations found</p>
              {search && <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Try a different search</p>}
            </div>
          ) : (
            filtered.map(conv => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={activeId === conv.id}
                onClick={() => selectConv(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* RIGHT CHAT AREA                                                        */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {activeId == null ? (

        /* Empty state */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '0 24px' }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
              border: '1px solid #a7f3d0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <MessageSquare size={30} style={{ color: '#10b981' }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Select a conversation
            </p>
            <p style={{ fontSize: 13, color: '#94a3b8' }}>
              Choose a contact from the left to start messaging
            </p>
          </div>
        </div>

      ) : (

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chat header */}
          <div style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            padding: '10px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            flexShrink: 0,
          }}>
            <Avatar name={activeName} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeName}
              </p>
              {activeConv && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, flexWrap: 'wrap' }}>
                  <Phone size={10} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{formatPhone(activeConv.lead_phone)}</span>
                  {activeConv.agent_name && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                      background: '#ede9fe', color: '#5b21b6',
                      border: '1px solid #ddd6fe', marginLeft: 2,
                    }}>
                      {activeConv.agent_name}
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* Agent assign */}
            {agents.length > 0 && activeConv && (
              <AgentAssignDropdown
                agents={agents}
                currentAgentId={activeConv.agent_id}
                onAssign={agentId => assignAgent.mutate({ convId: activeConv.id, agentId })}
              />
            )}
            <ChevronRight size={16} style={{ color: '#cbd5e1' }} />
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: 'auto',
            padding: '16px 16px 8px',
            background: 'linear-gradient(180deg, #f0fdf4 0%, #f1f5f9 100%)',
          }}>
            {msgsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                <Loader2 size={24} style={{ color: '#a7f3d0' }} className="animate-spin" />
              </div>
            ) : !messages.length ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Circle size={20} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: '#94a3b8' }}>No messages yet — send one below</p>
              </div>
            ) : (
              msgsWithDay.map(({ msg, showDay, dayLabel }) => (
                <MessageBubble key={msg.id} msg={msg} showDay={showDay} dayLabel={dayLabel} />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div style={{
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            padding: '10px 14px 12px',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  ref={textareaRef}
                  rows={1}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    resize: 'none', overflowY: 'hidden',
                    padding: '10px 14px',
                    fontSize: 13.5, lineHeight: 1.5,
                    color: '#1e293b',
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = '#10b981')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                      e.preventDefault()
                      sendMsg.mutate()
                    }
                  }}
                />
              </div>

              <button
                onClick={() => sendMsg.mutate()}
                disabled={!body.trim() || sendMsg.isPending}
                style={{
                  width: 42, height: 42, borderRadius: 13,
                  border: 'none', cursor: body.trim() ? 'pointer' : 'not-allowed',
                  background: body.trim()
                    ? 'linear-gradient(135deg,#059669,#10b981)'
                    : '#e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: body.trim() ? '0 4px 12px rgba(5,150,105,0.35)' : 'none',
                  transition: 'all 0.15s ease',
                  transform: body.trim() ? 'scale(1)' : 'scale(0.96)',
                }}
              >
                {sendMsg.isPending
                  ? <Loader2 size={16} style={{ color: '#fff' }} className="animate-spin" />
                  : <Send size={16} style={{ color: body.trim() ? '#fff' : '#94a3b8', transform: 'translateX(1px)' }} />
                }
              </button>
            </div>

            {body.length > 120 && (
              <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 4 }}>
                {body.length} chars
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

export default CrmSmsInbox
