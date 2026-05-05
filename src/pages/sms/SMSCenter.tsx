import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, MessageSquare, Phone, Loader2, MessageSquarePlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { smsService } from '../../services/sms.service'
import { formatPhoneNumber, timeAgo } from '../../utils/format'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationStore } from '../../stores/notification.store'

interface Conversation { id: number; contact_number: string; last_message: string; unread_count: number; updated_at: string; [key: string]: unknown }
interface Message { id: number; message: string; type?: string; direction?: string; date?: string; created_at?: string; [key: string]: unknown }

function getInitial(num: string): string {
  const digits = (num || '').replace(/\D/g, '')
  return digits.slice(-2, -1) || '#'
}

export function SMSCenter() {
  const { user } = useAuth()
  const lastSmsAt = useNotificationStore((s) => s.lastSmsAt)
  const [selectedDid, setSelectedDid] = useState<number | null>(null)
  const [selectedDidNumber, setSelectedDidNumber] = useState<string | null>(null)
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  void user

  const { data: didsData, isLoading: didsLoading } = useQuery({
    queryKey: ['sms-dids'],
    queryFn: () => smsService.getDids(),
  })

  const { data: conversationsData, isLoading: convsLoading, refetch: refetchConversations } = useQuery({
    queryKey: ['sms-conversations', selectedDid],
    queryFn: () => smsService.getConversations(selectedDid!),
    enabled: !!selectedDid,
  })

  const { data: threadData, isLoading: threadLoading, refetch: refetchThread } = useQuery({
    queryKey: ['sms-thread', selectedDid, selectedContact],
    queryFn: () => smsService.getThread(selectedDid!, selectedContact!),
    enabled: !!selectedDid && !!selectedContact,
  })

  const sendMutation = useMutation({
    mutationFn: () => smsService.send({ from: selectedDidNumber!, to: selectedContact!, message: newMessage }),
    onSuccess: () => {
      setNewMessage('')
      refetchThread()
      refetchConversations()
    },
  })

  const composeMutation = useMutation({
    mutationFn: (vars: { to: string; message: string }) =>
      smsService.send({ from: selectedDidNumber!, to: vars.to, message: vars.message }),
    onSuccess: (_, vars) => {
      toast.success('Message sent')
      setShowCompose(false)
      setComposeTo('')
      setComposeBody('')
      setSelectedContact(vars.to)
      refetchConversations()
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to send message'
      toast.error(msg)
    },
  })

  const handleCompose = () => {
    const digits = composeTo.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 15) {
      toast.error('Enter a valid phone number (10–15 digits)')
      return
    }
    if (!composeBody.trim()) {
      toast.error('Message cannot be empty')
      return
    }
    composeMutation.mutate({ to: digits, message: composeBody.trim() })
  }

  // Refetch thread + conversations whenever a new inbound SMS Pusher event fires
  useEffect(() => {
    if (!lastSmsAt) return
    if (selectedDid) refetchConversations()
    if (selectedDid && selectedContact) refetchThread()
  }, [lastSmsAt])

  const dids = didsData?.data?.data || []
  // contact_number comes from bigint column — ensure it's always a string
  const conversations: Conversation[] = (conversationsData?.data?.data || []).map((c: Conversation) => ({
    ...c,
    contact_number: String(c.contact_number ?? ''),
  }))
  const messages: Message[] = threadData?.data?.data || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (newMessage.trim()) sendMutation.mutate()
    }
  }

  return (
    <div className="flex flex-col h-full -mx-5 -my-3 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">SMS Center</h1>
          <p className="text-sm text-slate-500">Manage your SMS conversations</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          disabled={!selectedDid}
          title={selectedDid ? 'Send a message to a new number' : 'Select a number on the left first'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:shadow-md"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
        >
          <MessageSquarePlus size={16} />
          New Message
        </button>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0">

        {/* DID selector — left-most column */}
        <div className="w-44 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Numbers</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {didsLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={16} className="animate-spin text-slate-400" />
              </div>
            )}
            {!didsLoading && dids.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-2">No numbers available</p>
            )}
            {dids.map((d: Record<string, unknown>) => {
              const isSelected = selectedDid === d.id
              return (
                <button
                  key={d.id as number}
                  onClick={() => { setSelectedDid(d.id as number); setSelectedDidNumber(String(d.did_number || d.number || d.cli || '')); setSelectedContact(null) }}
                  className={cn(
                    'w-full text-left px-2.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 group',
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:shadow-sm hover:text-slate-900'
                  )}
                >
                  <div className={cn(
                    'flex items-center gap-2',
                  )}>
                    <Phone size={11} className={isSelected ? 'text-indigo-200' : 'text-slate-400'} />
                    <span className="truncate font-mono text-[11px]">
                      {formatPhoneNumber(String(d.did_number || d.number || ''))}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Conversations list */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Conversations</p>
            {conversations.length > 0 && (
              <span className="text-xs text-slate-400">{conversations.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedDid && (
              <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
                <MessageSquare size={28} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">Select a number to view conversations</p>
              </div>
            )}
            {selectedDid && convsLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={20} className="animate-spin text-indigo-400" />
              </div>
            )}
            {selectedDid && !convsLoading && conversations.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 px-4 text-center">
                <MessageSquare size={24} className="text-slate-300 mb-2" />
                <p className="text-xs text-slate-400">No conversations yet</p>
              </div>
            )}
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedContact(conv.contact_number)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-slate-100 transition-colors',
                  selectedContact === conv.contact_number
                    ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                    : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {getInitial(conv.contact_number)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-semibold text-slate-900 truncate font-mono">
                        {formatPhoneNumber(conv.contact_number)}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="min-w-[18px] h-[18px] px-1 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.last_message}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{timeAgo(conv.updated_at)}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Compose new message modal */}
        {showCompose && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowCompose(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">New Message</h2>
                <button
                  onClick={() => setShowCompose(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">From</label>
                  <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-700">
                    {selectedDidNumber ? formatPhoneNumber(selectedDidNumber) : 'No number selected'}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">To</label>
                  <input
                    type="tel"
                    autoFocus
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Country code optional — digits only will be sent</p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Message</label>
                  <textarea
                    rows={4}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Type your message…"
                    className="w-full resize-none px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompose}
                  disabled={composeMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-50 transition-all hover:shadow-md"
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  {composeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message thread */}
        <div className="flex-1 bg-white flex flex-col overflow-hidden">
          {!selectedContact ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <MessageSquare size={28} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">No conversation selected</p>
                <p className="text-xs text-slate-400 mt-0.5">Choose a conversation from the list</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="px-5 py-3.5 border-b border-slate-200 bg-white flex items-center gap-3 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                  {getInitial(selectedContact)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 font-mono">{formatPhoneNumber(selectedContact)}</p>
                  <p className="text-[11px] text-emerald-500 font-medium">Active</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
                {threadLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                )}
                {messages.map((msg) => {
                  const isOutbound = msg.type === 'outgoing' || msg.direction === 'outbound'
                  const timestamp = msg.date || msg.created_at || ''
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[70%] group',
                        isOutbound ? 'items-end' : 'items-start',
                      )}>
                        <div className={cn(
                          'px-4 py-2.5 text-sm leading-relaxed rounded-2xl',
                          isOutbound
                            ? 'rounded-br-md text-white'
                            : 'rounded-bl-md bg-white text-slate-900 border border-slate-200',
                        )}
                          style={isOutbound ? {
                            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                            boxShadow: '0 2px 8px rgba(79,70,229,0.25)',
                          } : {
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                          }}
                        >
                          {msg.message}
                        </div>
                        <p className={cn(
                          'text-[10px] mt-1 px-1',
                          isOutbound ? 'text-right text-slate-400' : 'text-slate-400'
                        )}>
                          {timeAgo(timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="px-4 py-3 border-t border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    className="flex-1 resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 min-h-[40px] max-h-32"
                    rows={1}
                    placeholder="Type a message… (Enter to send)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button
                    onClick={() => newMessage.trim() && sendMutation.mutate()}
                    disabled={!newMessage.trim() || sendMutation.isPending}
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 transition-all"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
