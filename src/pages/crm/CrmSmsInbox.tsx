import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Loader2, CheckCheck, Search, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { SmsConversation, SmsMessage } from '../../types/crm.types'

function ConversationItem({
  conv, isActive, onClick,
}: {
  conv: SmsConversation; isActive: boolean; onClick: () => void
}) {
  const leadName = [conv.first_name, conv.last_name].filter(Boolean).join(' ') || conv.company_name || conv.lead_phone
  const ago = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return new Date(ts).toLocaleDateString()
  }
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 hover:bg-slate-50 border-b transition-colors ${isActive ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-800 truncate">{leadName}</span>
        <span className="text-xs text-slate-400 ml-2 flex-shrink-0">{conv.last_message_at ? ago(conv.last_message_at) : ''}</span>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs text-slate-400 truncate">{conv.lead_phone}</span>
        {conv.unread_count > 0 && (
          <span className="ml-2 flex-shrink-0 bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {conv.unread_count > 9 ? '9+' : conv.unread_count}
          </span>
        )}
      </div>
    </button>
  )
}

function MessageBubble({ msg }: { msg: SmsMessage }) {
  const isOut = msg.direction === 'outbound'
  return (
    <div className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl ${isOut ? 'bg-emerald-600 text-white rounded-br-sm' : 'bg-white border text-slate-800 rounded-bl-sm'}`}>
        <p className="text-sm leading-relaxed">{msg.body}</p>
        <div className={`flex items-center gap-1 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-xs ${isOut ? 'text-emerald-200' : 'text-slate-400'}`}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOut && msg.status === 'delivered' && <CheckCheck size={12} className="text-emerald-200" />}
        </div>
      </div>
    </div>
  )
}

export function CrmSmsInbox() {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState<number | null>(null)
  const [statusFilter, setStatusFilter] = useState<'open' | 'closed' | 'archived' | ''>('')
  const [search, setSearch] = useState('')
  const [body, setBody] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ['sms-conversations', statusFilter],
    queryFn: () => crmService.getSmsConversations(statusFilter ? { status: statusFilter } : undefined).then(r => r.data.data),
    refetchInterval: 15000,
  })

  const conversations: SmsConversation[] = convsData?.data ?? []

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ['sms-messages', activeId],
    queryFn: () => crmService.getSmsMessages(activeId!).then(r => r.data.data.messages as SmsMessage[]),
    enabled: activeId != null,
    refetchInterval: 5000,
  })

  const sendMsg = useMutation({
    mutationFn: () => crmService.sendSmsMessage(activeId!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms-messages', activeId] })
      qc.invalidateQueries({ queryKey: ['sms-conversations'] })
      setBody('')
    },
    onError: () => toast.error('Failed to send message.'),
  })

  const markRead = useMutation({
    mutationFn: (id: number) => crmService.markConversationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sms-conversations'] }),
  })

  const selectConv = (id: number) => {
    setActiveId(id)
    const conv = conversations.find(c => c.id === id)
    if (conv && conv.unread_count > 0) markRead.mutate(id)
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = conversations.filter(c => {
    if (!search) return true
    const name = [c.first_name, c.last_name, c.company_name, c.lead_phone].join(' ').toLowerCase()
    return name.includes(search.toLowerCase())
  })

  const activeConv = conversations.find(c => c.id === activeId)

  return (
    <div className="h-[calc(100vh-64px)] flex overflow-hidden bg-slate-100">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-600" /> SMS Inbox
            </h1>
          </div>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Search conversations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(['', 'open', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as typeof statusFilter)}
                className={`flex-1 py-1 text-xs rounded-full font-medium transition-colors ${statusFilter === s ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
          ) : !filtered.length ? (
            <div className="text-center py-12">
              <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-400">No conversations</p>
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

      {/* Chat area */}
      {activeId == null ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">Select a conversation to start messaging</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b px-5 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {activeConv && (
                <>
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {[activeConv.first_name, activeConv.last_name].filter(Boolean).join(' ') || activeConv.company_name || activeConv.lead_phone}
                  </p>
                  <p className="text-xs text-slate-400 flex items-center gap-1"><Phone size={10} /> {activeConv.lead_phone}</p>
                </>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
            {msgsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : !messages.length ? (
              <p className="text-center text-slate-400 text-sm py-8">No messages yet.</p>
            ) : (
              messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Compose */}
          <div className="bg-white border-t p-4">
            <div className="flex gap-3">
              <textarea
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                rows={2}
                placeholder="Type a message..."
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && body.trim()) {
                    e.preventDefault()
                    sendMsg.mutate()
                  }
                }}
              />
              <button
                onClick={() => sendMsg.mutate()}
                disabled={!body.trim() || sendMsg.isPending}
                className="self-end px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sendMsg.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CrmSmsInbox
