import { useState } from 'react'
import { Phone, Mail, MapPin, User, Copy, Check, FileText, Clock } from 'lucide-react'
import { useDialerStore } from '../../stores/dialer.store'
import { formatPhoneNumber } from '../../utils/format'
import { cn } from '../../utils/cn'

type Tab = 'info' | 'history' | 'notes'

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'info', label: 'Info', icon: User },
  { id: 'history', label: 'History', icon: Clock },
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
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Icon size={11} /> {tab.label}
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

      {activeTab === 'history' && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Clock size={24} className="text-slate-300" />
          <p className="text-xs text-slate-400">Call history unavailable</p>
        </div>
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
