import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Send, MessageSquare, Phone, Loader2, MessageSquarePlus, X, Image, Paperclip, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { smsService } from '../../services/sms.service'
import { formatPhoneNumber, timeAgo } from '../../utils/format'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'
import { useNotificationStore } from '../../stores/notification.store'

interface Conversation { id: number; contact_number: string; last_message: string; unread_count: number; updated_at: string; [key: string]: unknown }
interface Message { id: number; message: string; type?: string; direction?: string; date?: string; created_at?: string; mms_url?: string; sms_type?: number; [key: string]: unknown }
interface DidItem { id: number; did_number?: string; number?: string; cli?: string; voip_provider?: string; [key: string]: unknown }

const SMS_CHAR_LIMIT = 160
const SMS_CONCAT_LIMIT = 153 // concatenated SMS segments use 153 chars each

function getSmsSegmentInfo(text: string) {
  const len = text.length
  if (len === 0) return { length: 0, segments: 0, remaining: SMS_CHAR_LIMIT }
  if (len <= SMS_CHAR_LIMIT) return { length: len, segments: 1, remaining: SMS_CHAR_LIMIT - len }
  const segments = Math.ceil(len / SMS_CONCAT_LIMIT)
  const remaining = (segments * SMS_CONCAT_LIMIT) - len
  return { length: len, segments, remaining }
}

function getProviderLabel(provider?: string): string {
  if (!provider) return ''
  const p = provider.toLowerCase().trim()
  if (p === 'plivo') return 'Plivo'
  if (p === 'twilio') return 'Twilio'
  if (p === 'telnyx') return 'Telnyx'
  if (p === 'didforsale') return 'DIDForSale'
  return provider
}

function getProviderColor(provider?: string): string {
  if (!provider) return 'bg-slate-100 text-slate-500'
  const p = provider.toLowerCase().trim()
  if (p === 'plivo') return 'bg-green-100 text-green-700'
  if (p === 'twilio') return 'bg-red-100 text-red-700'
  if (p === 'telnyx') return 'bg-blue-100 text-blue-700'
  if (p === 'didforsale') return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-500'
}

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
  const [composeMode, setComposeMode] = useState<'sms' | 'mms'>('sms')
  const [mmsFile, setMmsFile] = useState<File | null>(null)
  const [mmsPreview, setMmsPreview] = useState<string | null>(null)
  const mmsInputRef = useRef<HTMLInputElement>(null)
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
    mutationFn: (vars: { to: string; message: string; mmsFile?: File }) => {
      if (vars.mmsFile) {
        return smsService.sendMms({ from: selectedDidNumber!, to: vars.to, message: vars.message, mms_file: vars.mmsFile })
      }
      return smsService.send({ from: selectedDidNumber!, to: vars.to, message: vars.message })
    },
    onSuccess: (_, vars) => {
      toast.success('Message sent')
      setShowCompose(false)
      setComposeTo('')
      setComposeBody('')
      setComposeMode('sms')
      setMmsFile(null)
      setMmsPreview(null)
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
      toast.error('Enter a valid phone number (10-15 digits)')
      return
    }
    if (!composeBody.trim() && composeMode === 'sms') {
      toast.error('Message cannot be empty')
      return
    }
    if (composeMode === 'mms' && !mmsFile && !composeBody.trim()) {
      toast.error('Please add a message or attach a media file')
      return
    }
    composeMutation.mutate({
      to: digits,
      message: composeBody.trim(),
      mmsFile: composeMode === 'mms' ? mmsFile ?? undefined : undefined,
    })
  }

  const handleMmsFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toast.error('File size must be under 5MB')
      return
    }
    setMmsFile(file)
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (ev) => setMmsPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setMmsPreview(null)
    }
  }

  const clearMmsFile = () => {
    setMmsFile(null)
    setMmsPreview(null)
    if (mmsInputRef.current) mmsInputRef.current.value = ''
  }

  // Refetch thread + conversations whenever a new inbound SMS Pusher event fires
  useEffect(() => {
    if (!lastSmsAt) return
    if (selectedDid) refetchConversations()
    if (selectedDid && selectedContact) refetchThread()
  }, [lastSmsAt])

  const dids: DidItem[] = didsData?.data?.data || []
  // contact_number comes from bigint column — ensure it's always a string
  const conversations: Conversation[] = (conversationsData?.data?.data || []).map((c: Conversation) => ({
    ...c,
    contact_number: String(c.contact_number ?? ''),
  }))
  const messages: Message[] = threadData?.data?.data || []

  // Get current DID's provider
  const currentDid = dids.find((d) => d.id === selectedDid)
  const currentProvider = currentDid?.voip_provider

  // Compose modal segment info
  const composeSegment = getSmsSegmentInfo(composeBody)
  // Thread input segment info
  const threadSegment = getSmsSegmentInfo(newMessage)

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
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">SMS Center</h1>
            <p className="text-sm text-slate-500">Manage your SMS conversations</p>
          </div>
          {currentProvider && (
            <span className={cn('px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide', getProviderColor(currentProvider))}>
              {getProviderLabel(currentProvider)}
            </span>
          )}
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
            {dids.map((d) => {
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
                  <div className="flex items-center gap-2">
                    <Phone size={11} className={isSelected ? 'text-indigo-200' : 'text-slate-400'} />
                    <span className="truncate font-mono text-[11px]">
                      {formatPhoneNumber(String(d.did_number || d.number || ''))}
                    </span>
                  </div>
                  {d.voip_provider && (
                    <span className={cn(
                      'inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase',
                      isSelected ? 'bg-indigo-500/40 text-indigo-100' : getProviderColor(d.voip_provider as string)
                    )}>
                      {getProviderLabel(d.voip_provider as string)}
                    </span>
                  )}
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
                {/* From field */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">From</label>
                  <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono text-slate-700 flex items-center justify-between">
                    <span>{selectedDidNumber ? formatPhoneNumber(selectedDidNumber) : 'No number selected'}</span>
                    {currentProvider && (
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase', getProviderColor(currentProvider))}>
                        {getProviderLabel(currentProvider)}
                      </span>
                    )}
                  </div>
                </div>

                {/* To field */}
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

                {/* SMS / MMS toggle */}
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Type</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setComposeMode('sms'); clearMmsFile() }}
                      className={cn(
                        'flex-1 px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5',
                        composeMode === 'sms'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <MessageSquare size={14} />
                      SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => setComposeMode('mms')}
                      className={cn(
                        'flex-1 px-4 py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 border-l border-slate-200',
                        composeMode === 'mms'
                          ? 'bg-violet-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <Image size={14} />
                      MMS
                    </button>
                  </div>
                </div>

                {/* Message textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Message</label>
                    <div className="flex items-center gap-2">
                      {composeMode === 'sms' && composeSegment.segments > 1 && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          {composeSegment.segments} segments
                        </span>
                      )}
                      <span className={cn(
                        'text-[11px] font-mono tabular-nums',
                        composeMode === 'sms' && composeSegment.remaining < 20 ? 'text-red-500 font-semibold' : 'text-slate-400'
                      )}>
                        {composeBody.length}{composeMode === 'sms' ? ` / ${composeSegment.segments <= 1 ? SMS_CHAR_LIMIT : composeSegment.segments * SMS_CONCAT_LIMIT}` : ''}
                      </span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Type your message..."
                    className="w-full resize-none px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                  {composeMode === 'sms' && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Standard SMS: {SMS_CHAR_LIMIT} chars/message. Longer texts are split into {SMS_CONCAT_LIMIT}-char segments.
                    </p>
                  )}
                </div>

                {/* MMS file upload */}
                {composeMode === 'mms' && (
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                      Media Attachment
                    </label>
                    {!mmsFile ? (
                      <button
                        type="button"
                        onClick={() => mmsInputRef.current?.click()}
                        className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-slate-300 text-sm text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/30 transition-colors"
                      >
                        <Paperclip size={16} />
                        Click to attach image or media (max 5MB)
                      </button>
                    ) : (
                      <div className="relative rounded-xl border border-slate-200 overflow-hidden">
                        {mmsPreview ? (
                          <img src={mmsPreview} alt="MMS preview" className="w-full max-h-40 object-cover" />
                        ) : (
                          <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
                            <Paperclip size={14} className="text-slate-400" />
                            <span className="text-sm text-slate-700 truncate">{mmsFile.name}</span>
                            <span className="text-xs text-slate-400 ml-auto">
                              {(mmsFile.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={clearMmsFile}
                          className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow-sm hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    )}
                    <input
                      ref={mmsInputRef}
                      type="file"
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={handleMmsFileChange}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
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
                  style={{ background: composeMode === 'mms' ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                >
                  {composeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send {composeMode === 'mms' ? 'MMS' : 'SMS'}
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
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900 font-mono">{formatPhoneNumber(selectedContact)}</p>
                  <p className="text-[11px] text-emerald-500 font-medium">Active</p>
                </div>
                {currentProvider && (
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase', getProviderColor(currentProvider))}>
                    via {getProviderLabel(currentProvider)}
                  </span>
                )}
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
                  const isMms = msg.sms_type === 1 || !!msg.mms_url
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}
                    >
                      <div className={cn(
                        'max-w-[70%] group',
                        isOutbound ? 'items-end' : 'items-start',
                      )}>
                        {isMms && msg.mms_url && (
                          <div className={cn(
                            'rounded-2xl overflow-hidden mb-1',
                            isOutbound ? 'rounded-br-md' : 'rounded-bl-md'
                          )}>
                            <img src={msg.mms_url} alt="MMS" className="max-w-full max-h-48 object-cover rounded-2xl" />
                          </div>
                        )}
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
                        <div className={cn(
                          'flex items-center gap-1.5 mt-1 px-1',
                          isOutbound ? 'justify-end' : ''
                        )}>
                          {isMms && (
                            <span className="text-[10px] font-medium text-violet-400">MMS</span>
                          )}
                          <p className="text-[10px] text-slate-400">
                            {timeAgo(timestamp)}
                          </p>
                        </div>
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
                    placeholder="Type a message... (Enter to send)"
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
                {/* Character counter for thread input */}
                <div className="flex items-center justify-end mt-1 px-1 gap-2">
                  {threadSegment.segments > 1 && (
                    <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      {threadSegment.segments} segments
                    </span>
                  )}
                  <span className={cn(
                    'text-[10px] font-mono tabular-nums',
                    threadSegment.remaining < 20 && newMessage.length > 0 ? 'text-red-500 font-semibold' : 'text-slate-400'
                  )}>
                    {newMessage.length > 0 ? `${newMessage.length} / ${threadSegment.segments <= 1 ? SMS_CHAR_LIMIT : threadSegment.segments * SMS_CONCAT_LIMIT}` : `0 / ${SMS_CHAR_LIMIT}`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
