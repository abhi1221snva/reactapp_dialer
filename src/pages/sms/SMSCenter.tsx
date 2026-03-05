import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, MessageSquare, Phone } from 'lucide-react'
import { smsService } from '../../services/sms.service'
import { formatPhoneNumber, timeAgo } from '../../utils/format'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'

interface Conversation { id: number; contact_number: string; last_message: string; unread_count: number; updated_at: string; [key: string]: unknown }
interface Message { id: number; message: string; direction: 'inbound' | 'outbound'; created_at: string; [key: string]: unknown }

function getInitial(num: string): string {
  const digits = num.replace(/\D/g, '')
  return digits.slice(-2, -1) || '#'
}

export function SMSCenter() {
  const { user } = useAuth()
  const [selectedDid, setSelectedDid] = useState<number | null>(null)
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  void user

  const { data: didsData } = useQuery({
    queryKey: ['sms-dids'],
    queryFn: () => smsService.getDids(),
  })

  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ['sms-conversations', selectedDid],
    queryFn: () => smsService.getConversations(selectedDid!),
    enabled: !!selectedDid,
  })

  const { data: threadData, refetch: refetchThread } = useQuery({
    queryKey: ['sms-thread', selectedDid, selectedContact],
    queryFn: () => smsService.getThread(selectedDid!, selectedContact!),
    enabled: !!selectedDid && !!selectedContact,
    refetchInterval: 5000,
  })

  const sendMutation = useMutation({
    mutationFn: () => smsService.send({ did_id: selectedDid!, to: selectedContact!, message: newMessage }),
    onSuccess: () => {
      setNewMessage('')
      refetchThread()
      refetchConversations()
    },
  })

  const dids = didsData?.data?.data || []
  const conversations: Conversation[] = conversationsData?.data?.data || []
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
    <div className="flex flex-col h-full -m-6">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">SMS Center</h1>
          <p className="text-sm text-slate-500">Manage your SMS conversations</p>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0">

        {/* DID selector — left-most column */}
        <div className="w-44 flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-3 py-3 border-b border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Numbers</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {dids.length === 0 && (
              <p className="text-xs text-slate-400 px-2 py-2">No numbers available</p>
            )}
            {dids.map((d: Record<string, unknown>) => {
              const isSelected = selectedDid === d.id
              return (
                <button
                  key={d.id as number}
                  onClick={() => { setSelectedDid(d.id as number); setSelectedContact(null) }}
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
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn('flex', msg.direction === 'outbound' ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn(
                      'max-w-[70%] group',
                      msg.direction === 'outbound' ? 'items-end' : 'items-start',
                    )}>
                      <div className={cn(
                        'px-4 py-2.5 text-sm leading-relaxed rounded-2xl',
                        msg.direction === 'outbound'
                          ? 'rounded-br-md text-white'
                          : 'rounded-bl-md bg-white text-slate-900 border border-slate-200',
                      )}
                        style={msg.direction === 'outbound' ? {
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
                        msg.direction === 'outbound' ? 'text-right text-slate-400' : 'text-slate-400'
                      )}>
                        {timeAgo(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
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
