import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Loader2, CheckCheck, Check, Clock,
  ArrowLeft, Search, Phone,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { DraggableWidget } from '../floating/DraggableWidget'
import { useFloatingStore, useWidgetPositions } from '../../stores/floating.store'
import { crmService } from '../../services/crm.service'
import type { SmsConversation, SmsMessage } from '../../types/crm.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ago(ts: string) {
  const d = Date.now() - new Date(ts).getTime()
  if (d < 60_000)    return 'now'
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m`
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const PALETTES = [
  ['#dbeafe','#1d4ed8'], ['#d1fae5','#065f46'], ['#ede9fe','#5b21b6'],
  ['#fce7f3','#9d174d'], ['#fef3c7','#92400e'], ['#e0e7ff','#3730a3'],
]
function palette(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}

function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const [bg, fg] = palette(name || '?')
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, color: fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 28 ? 9 : 12, fontWeight: 700,
    }}>
      {getInitials(name || '?') || '?'}
    </div>
  )
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConvRow({ conv, isActive, onClick }: {
  conv: SmsConversation; isActive: boolean; onClick: () => void
}) {
  const name = [conv.first_name, conv.last_name].filter(Boolean).join(' ') || conv.company_name || conv.lead_phone
  const unread = conv.unread_count > 0

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 9,
        padding: '8px 12px',
        background: isActive ? 'rgba(16,185,129,0.1)' : 'transparent',
        borderLeft: `3px solid ${isActive ? '#10b981' : 'transparent'}`,
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <Avatar name={name} size={34} />
        {unread && (
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '1.5px solid #0f172a' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 1 }}>
          <span style={{ fontSize: 12, fontWeight: unread ? 700 : 500, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
            {name}
          </span>
          <span style={{ fontSize: 10, color: unread ? '#10b981' : '#475569', flexShrink: 0, marginLeft: 4, fontWeight: unread ? 600 : 400 }}>
            {conv.last_message_at ? ago(conv.last_message_at) : ''}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
            {conv.lead_phone}
          </span>
          {unread && (
            <span style={{ minWidth: 16, height: 16, padding: '0 4px', background: '#10b981', color: '#fff', fontSize: 8, fontWeight: 800, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 4 }}>
              {conv.unread_count > 9 ? '9+' : conv.unread_count}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: SmsMessage }) {
  const out = msg.direction === 'outbound'
  const sys = msg.direction === 'system'

  if (sys) return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
      <div style={{ maxWidth: '85%', background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 10, padding: '5px 12px', textAlign: 'center' }}>
        <p style={{ fontSize: 11, lineHeight: 1.4, margin: 0, color: 'rgba(148,163,184,0.85)', fontStyle: 'italic', wordBreak: 'break-word' }}>{msg.body}</p>
        <span style={{ fontSize: 9, color: 'rgba(148,163,184,0.5)' }}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', justifyContent: out ? 'flex-end' : 'flex-start', marginBottom: 5, paddingLeft: out ? 32 : 0, paddingRight: out ? 0 : 32 }}>
      <div style={{
        maxWidth: '82%',
        background: out ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.1)',
        color: '#f1f5f9',
        padding: '7px 11px 5px',
        borderRadius: out ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
        boxShadow: out ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
        border: out ? 'none' : '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ fontSize: 12.5, lineHeight: 1.45, margin: 0, wordBreak: 'break-word' }}>{msg.body}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 3, justifyContent: out ? 'flex-end' : 'flex-start' }}>
          <span style={{ fontSize: 9.5, color: 'rgba(148,163,184,0.7)' }}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {out && (
            msg.status === 'delivered' ? <CheckCheck size={10} style={{ color: '#6ee7b7' }} />
            : msg.status === 'sent'    ? <Check      size={10} style={{ color: 'rgba(148,163,184,0.6)' }} />
            :                            <Clock      size={9}  style={{ color: 'rgba(148,163,184,0.4)' }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FloatingSms ──────────────────────────────────────────────────────────────

export function FloatingSms() {
  const isOpen     = useFloatingStore(s => s.smsOpen)
  const setSmsOpen = useFloatingStore(s => s.setSmsOpen)
  const setSmsUnread = useFloatingStore(s => s.setSmsUnread)
  const { smsRight } = useWidgetPositions()

  const qc = useQueryClient()
  const [activeId, setActiveId]   = useState<number | null>(null)
  const [body, setBody]           = useState('')
  const [search, setSearch]       = useState('')
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['sms-conversations-widget'],
    queryFn:  () => crmService.getSmsConversations().then(r => r.data.data),
    enabled:  isOpen,
    refetchInterval: isOpen ? 15_000 : false,
  })

  const conversations: SmsConversation[] = convsData?.data ?? []

  // Sync unread count to store badge
  useEffect(() => {
    const total = conversations.reduce((n, c) => n + (c.unread_count || 0), 0)
    setSmsUnread(total)
  }, [conversations, setSmsUnread])

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['sms-messages-widget', activeId],
    queryFn:  () => crmService.getSmsMessages(activeId!).then(r => r.data.data.messages as SmsMessage[]),
    enabled:  activeId != null && isOpen,
    refetchInterval: isOpen && activeId != null ? 5_000 : false,
  })

  const sendMsg = useMutation({
    mutationFn: () => crmService.sendSmsMessage(activeId!, body),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['sms-messages-widget', activeId] })
      qc.invalidateQueries({ queryKey: ['sms-conversations-widget'] })
      setBody('')
      textareaRef.current?.focus()
    },
    onError: () => toast.error('Failed to send message.'),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => crmService.markConversationRead(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['sms-conversations-widget'] }),
  })

  const selectConv = (id: number) => {
    setActiveId(id)
    const conv = conversations.find(c => c.id === id)
    if (conv?.unread_count) markRead.mutate(id)
  }

  // Reset to list when closed
  useEffect(() => { if (!isOpen) { setActiveId(null); setBody('') } }, [isOpen])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current; if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 90)}px`
  }, [body])

  const filtered = conversations.filter(c => {
    if (!search) return true
    return [c.first_name, c.last_name, c.company_name, c.lead_phone].join(' ').toLowerCase().includes(search.toLowerCase())
  })

  const activeConv = conversations.find(c => c.id === activeId)
  const activeName = activeConv
    ? [activeConv.first_name, activeConv.last_name].filter(Boolean).join(' ') || activeConv.company_name || activeConv.lead_phone
    : ''

  const totalUnread = conversations.reduce((n, c) => n + (c.unread_count || 0), 0)

  return (
    <DraggableWidget
      isOpen={isOpen}
      onClose={() => setSmsOpen(false)}
      headerGradient="linear-gradient(145deg, #064e3b 0%, #065f46 55%, #047857 100%)"
      defaultRight={smsRight}
      defaultBottom={20}
      width={340}
      zIndex={62}
      bodyHeight={470}
      headerLeft={
        <>
          {activeId != null ? (
            <>
              <button
                onClick={() => setActiveId(null)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
              >
                <ArrowLeft size={13} color="#fff" />
              </button>
              <Avatar name={activeName} size={26} />
              <div style={{ minWidth: 0 }}>
                <p style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{activeName}</p>
                {activeConv && <p style={{ color: 'rgba(167,243,208,0.8)', fontSize: 10, marginTop: 2, fontFamily: 'monospace' }}>{activeConv.lead_phone}</p>}
              </div>
            </>
          ) : (
            <>
              <div style={{ width: 26, height: 26, borderRadius: 8, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={13} color="#fff" />
              </div>
              <div>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>SMS</p>
                {totalUnread > 0 && <p style={{ color: '#6ee7b7', fontSize: 10, marginTop: 2, fontWeight: 600 }}>{totalUnread} unread</p>}
              </div>
            </>
          )}
        </>
      }
    >
      {/* ── Dark body ── */}
      <div style={{ background: '#0a1628', height: '100%', display: 'flex', flexDirection: 'column' }}>

        {/* ── CONVERSATION LIST ── */}
        {activeId == null && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
                <input
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    paddingLeft: 28, paddingRight: 10, paddingTop: 6, paddingBottom: 6,
                    fontSize: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', outline: 'none',
                  }}
                  placeholder="Search conversations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={e => (e.target.style.borderColor = '#10b981')}
                  onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {convsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Loader2 size={20} style={{ color: '#10b981' }} className="animate-spin" />
                </div>
              ) : !filtered.length ? (
                <div style={{ textAlign: 'center', padding: '36px 16px' }}>
                  <MessageSquare size={28} style={{ color: '#1e3a2f', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 12, color: '#475569' }}>No conversations</p>
                </div>
              ) : filtered.map(conv => (
                <ConvRow
                  key={conv.id}
                  conv={conv}
                  isActive={false}
                  onClick={() => selectConv(conv.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── MESSAGE THREAD ── */}
        {activeId != null && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px 6px' }}>
              {msgsLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                  <Loader2 size={20} style={{ color: '#10b981' }} className="animate-spin" />
                </div>
              ) : !messages.length ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <p style={{ fontSize: 12, color: '#475569' }}>No messages yet</p>
                </div>
              ) : messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
              <div ref={bottomRef} />
            </div>

            {/* Contact line */}
            {activeConv && (
              <div style={{ padding: '4px 12px 4px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Phone size={10} style={{ color: '#475569' }} />
                <span style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace' }}>{activeConv.lead_phone}</span>
              </div>
            )}

            {/* Compose */}
            <div style={{ padding: '6px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={textareaRef}
                rows={1}
                style={{
                  flex: 1, resize: 'none', overflowY: 'hidden',
                  padding: '8px 11px', fontSize: 12.5, lineHeight: 1.4,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 11, color: '#e2e8f0', outline: 'none',
                  fontFamily: 'inherit', transition: 'border-color 0.15s',
                }}
                placeholder="Type a message…"
                value={body}
                onChange={e => setBody(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#10b981')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                    e.preventDefault(); sendMsg.mutate()
                  }
                }}
              />
              <button
                onClick={() => sendMsg.mutate()}
                disabled={!body.trim() || sendMsg.isPending}
                style={{
                  width: 36, height: 36, borderRadius: 10, border: 'none',
                  cursor: body.trim() ? 'pointer' : 'not-allowed',
                  background: body.trim() ? 'linear-gradient(135deg,#059669,#10b981)' : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: body.trim() ? '0 3px 10px rgba(5,150,105,0.4)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {sendMsg.isPending
                  ? <Loader2 size={14} color="#fff" className="animate-spin" />
                  : <Send size={14} color={body.trim() ? '#fff' : '#475569'} style={{ transform: 'translateX(1px)' }} />
                }
              </button>
            </div>
          </div>
        )}

      </div>
    </DraggableWidget>
  )
}
