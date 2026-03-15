import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Loader2, CheckCheck, Search, Phone,
  Check, Circle, Clock, ChevronRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { SmsConversation, SmsMessage } from '../../types/crm.types'

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
            {conv.lead_phone}
          </span>
          {hasUnread && (
            <span style={{
              minWidth: 20, height: 20, padding: '0 5px',
              background: '#10b981', color: '#fff',
              fontSize: 10, fontWeight: 800,
              borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: 4,
            }}>
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, showDay, dayLabel }: {
  msg: SmsMessage; showDay: boolean; dayLabel: string
}) {
  const isOut = msg.direction === 'outbound'

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
    </>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function CrmSmsInbox() {
  const qc = useQueryClient()
  const [activeId, setActiveId]           = useState<number | null>(null)
  const [statusFilter, setStatusFilter]   = useState<'open' | 'closed' | 'archived' | ''>('')
  const [search, setSearch]               = useState('')
  const [body, setBody]                   = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['sms-conversations', statusFilter],
    queryFn:  () => crmService.getSmsConversations(statusFilter ? { status: statusFilter } : undefined).then(r => r.data.data),
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
    mutationFn: () => crmService.sendSmsMessage(activeId!, body),
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

  const FILTERS: { label: string; value: typeof statusFilter }[] = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'Closed', value: 'closed' },
  ]

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
          </div>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
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

          {/* Filter pills */}
          <div style={{ display: 'flex', gap: 4 }}>
            {FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                style={{
                  flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600, borderRadius: 7,
                  border: 'none', cursor: 'pointer',
                  background: statusFilter === f.value ? '#ecfdf5' : 'transparent',
                  color: statusFilter === f.value ? '#059669' : '#94a3b8',
                  transition: 'all 0.12s ease',
                  boxShadow: statusFilter === f.value ? 'inset 0 0 0 1.5px #6ee7b7' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Phone size={10} style={{ color: '#94a3b8' }} />
                  <span style={{ fontSize: 12, color: '#64748b' }}>{activeConv.lead_phone}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20,
                    background: activeConv.status === 'open' ? '#ecfdf5' : '#f8fafc',
                    color: activeConv.status === 'open' ? '#059669' : '#94a3b8',
                    border: `1px solid ${activeConv.status === 'open' ? '#a7f3d0' : '#e2e8f0'}`,
                    marginLeft: 4,
                  }}>
                    {activeConv.status ?? 'open'}
                  </span>
                </div>
              )}
            </div>
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
