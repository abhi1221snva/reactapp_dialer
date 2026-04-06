import { useState } from 'react'
import { Phone, Mail, MapPin, User, Copy, Check, FileText, Clock, MessageSquare, Send, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDialerStore } from '../../stores/dialer.store'
import { formatPhoneNumber } from '../../utils/format'
import { cn } from '../../utils/cn'
import { smsService } from '../../services/sms.service'
import { crmService } from '../../services/crm.service'

type Tab = 'info' | 'history' | 'notes' | 'sms' | 'email'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'info', label: 'Info', icon: User },
  { id: 'sms', label: 'SMS', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notes', label: 'Notes', icon: FileText },
]

function CopyField({ value, children }: { value: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex items-center gap-2 group">
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-slate-100"
        title="Copy"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
      </button>
    </div>
  )
}

function QuickSmsForm({ phone, leadId }: { phone: string; leadId?: number }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      if (leadId) {
        await crmService.sendLeadSms(leadId, { to: phone, body: message.trim() })
      } else {
        await smsService.send({ did_id: 0, to: phone, message: message.trim() })
      }
      toast.success('SMS sent')
      setMessage('')
    } catch {
      toast.error('Failed to send SMS')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <MessageSquare size={12} />
        <span>To: <span className="font-mono font-medium text-slate-700">{formatPhoneNumber(phone)}</span></span>
      </div>
      <textarea
        className="input resize-none text-sm"
        rows={3}
        placeholder="Type your SMS message…"
        maxLength={320}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-medium', message.length > 300 ? 'text-amber-500' : 'text-slate-400')}>
          {message.length}/320
        </span>
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="btn-primary py-1.5 px-4 text-xs gap-1.5"
        >
          <Send size={12} />
          {sending ? 'Sending…' : 'Send SMS'}
        </button>
      </div>
    </div>
  )
}

function QuickEmailForm({ email, leadId }: { email: string; leadId?: number }) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || !leadId) return
    setSending(true)
    try {
      await crmService.sendMerchantEmail(leadId, {
        to: email,
        subject: subject.trim(),
        body: body.trim(),
      })
      toast.success('Email sent')
      setSubject('')
      setBody('')
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Mail size={12} />
        <span>To: <span className="font-medium text-slate-700">{email}</span></span>
      </div>
      <input
        type="text"
        className="input text-sm"
        placeholder="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      />
      <textarea
        className="input resize-none text-sm"
        rows={3}
        placeholder="Email body…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={!subject.trim() || !body.trim() || !leadId || sending}
          className="btn-primary py-1.5 px-4 text-xs gap-1.5"
        >
          <Send size={12} />
          {sending ? 'Sending…' : 'Send Email'}
        </button>
      </div>
    </div>
  )
}

export function LeadInfoPanel() {
  const { activeLead } = useDialerStore()
  const [activeTab, setActiveTab] = useState<Tab>('info')

  if (!activeLead) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
          <User size={28} className="text-slate-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500">No active lead</p>
          <p className="text-xs text-slate-400 mt-0.5">Dial to load lead info</p>
        </div>
      </div>
    )
  }

  const name = [activeLead.first_name, activeLead.last_name].filter(Boolean).join(' ') || 'Unknown'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
  const leadId = activeLead.lead_id ?? activeLead.id

  return (
    <div className="space-y-4">
      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-base flex items-center justify-center shadow-sm">
            {initials}
          </div>
          {/* Online dot */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold text-slate-900 leading-none truncate">{name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Lead #{activeLead.id}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          // Disable SMS tab if no phone, Email tab if no email
          const disabled =
            (tab.id === 'sms' && !activeLead.phone_number) ||
            (tab.id === 'email' && !activeLead.email)
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              disabled={disabled}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : disabled
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon size={10} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div className="space-y-3">
          <CopyField value={activeLead.phone_number ?? ''}>
            <div className="flex items-center gap-2.5 text-sm">
              <Phone size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700 font-medium font-mono">
                {formatPhoneNumber(activeLead.phone_number)}
              </span>
            </div>
          </CopyField>

          {activeLead.email && (
            <CopyField value={activeLead.email}>
              <div className="flex items-center gap-2.5 text-sm">
                <Mail size={13} className="text-slate-400 flex-shrink-0" />
                <span className="text-slate-700 truncate">{activeLead.email}</span>
              </div>
            </CopyField>
          )}

          {(activeLead.city || activeLead.state) && (
            <div className="flex items-center gap-2.5 text-sm">
              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-700">
                {[activeLead.city, activeLead.state].filter(Boolean).join(', ')}
              </span>
            </div>
          )}

          {/* Custom fields */}
          {activeLead.fields && Object.keys(activeLead.fields as object).length > 0 && (
            <div className="border-t border-slate-100 pt-3 space-y-2 mt-3">
              {Object.entries(activeLead.fields as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="text-slate-700 font-medium">{String(value ?? '—')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sms' && activeLead.phone_number && (
        <QuickSmsForm phone={activeLead.phone_number} leadId={leadId} />
      )}

      {activeTab === 'email' && activeLead.email && (
        <QuickEmailForm email={activeLead.email} leadId={leadId} />
      )}

      {activeTab === 'notes' && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <FileText size={24} className="text-slate-300" />
          <p className="text-xs text-slate-400">No notes for this lead</p>
        </div>
      )}
    </div>
  )
}
