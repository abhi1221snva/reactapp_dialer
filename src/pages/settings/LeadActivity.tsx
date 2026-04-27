import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, User, MessageSquare, Phone, Mail, FileText } from 'lucide-react'
import { Badge } from '../../components/ui/Badge'
import { leadService } from '../../services/lead.service'
import api from '../../api/axios'
import { formatPartialPhoneUS, formatPhoneNumber } from '../../utils/format'

interface LeadOption {
  id: number
  lead_id?: number
  first_name?: string
  last_name?: string
  phone_number?: string
  email?: string
  [key: string]: unknown
}

interface ActivityEntry {
  id: number
  type?: string
  subject?: string
  body?: string
  description?: string
  note?: string
  created_at?: string
  user_name?: string
  pinned?: boolean
  [key: string]: unknown
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  sms: MessageSquare,
  email: Mail,
  note: FileText,
  status_change: Activity,
}

const TYPE_COLORS: Record<string, string> = {
  call: 'bg-blue-50 text-blue-600 border-blue-200',
  sms: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  email: 'bg-violet-50 text-violet-600 border-violet-200',
  note: 'bg-amber-50 text-amber-600 border-amber-200',
  status_change: 'bg-slate-50 text-slate-600 border-slate-200',
}

// Local phone formatters replaced by centralized imports from utils/format

function formatTimestamp(ts?: string): string {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    })
  } catch {
    return ts
  }
}

export function LeadActivity() {
  const [rawDigits, setRawDigits] = useState('')
  const [displayValue, setDisplayValue] = useState('')
  const [debouncedDigits, setDebouncedDigits] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedDigits(rawDigits), 400)
    return () => clearTimeout(t)
  }, [rawDigits])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Handle phone input with formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const digits = input.replace(/\D/g, '').slice(0, 10)
    setRawDigits(digits)
    setDisplayValue(formatPartialPhoneUS(digits))
    setShowDropdown(true)
    if (!digits) setSelectedLead(null)
  }

  // Search leads by phone number only
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['lead-phone-search', debouncedDigits],
    queryFn: () => leadService.list({ page: 1, limit: 10, search: debouncedDigits, filters: {} }),
    enabled: debouncedDigits.length >= 3,
  })

  const leads: LeadOption[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = searchResults as any
    const arr = r?.data?.data
    return Array.isArray(arr) ? arr : []
  })()

  // Fetch activity for selected lead
  const { data: activityData, isLoading: loadingActivity } = useQuery({
    queryKey: ['lead-activity', selectedLead?.id],
    queryFn: () => api.get(`/crm/lead/${selectedLead!.id}/activity`),
    enabled: !!selectedLead,
  })

  const activities: ActivityEntry[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = activityData as any
    const items = r?.data?.items ?? r?.data?.data ?? r?.data
    return Array.isArray(items) ? items : []
  })()

  const selectLead = (lead: LeadOption) => {
    setSelectedLead(lead)
    setDisplayValue(formatPhoneNumber(lead.phone_number))
    setRawDigits((lead.phone_number || '').replace(/\D/g, '').slice(0, 10))
    setShowDropdown(false)
  }

  return (
    <div className="space-y-3">

      {/* Phone search bar */}
      <div className="card" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Phone size={16} className="text-slate-400" />
          </div>
          <input
            ref={searchRef}
            className="input pl-10"
            placeholder="(555) 123-4567"
            value={displayValue}
            onChange={handlePhoneChange}
            onFocus={() => { if (rawDigits.length >= 3) setShowDropdown(true) }}
            inputMode="tel"
          />
        </div>

        {/* Dropdown */}
        {showDropdown && debouncedDigits.length >= 3 && (
          <div className="absolute z-30 mt-1 w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {searching ? (
              <div className="px-4 py-3 text-sm text-slate-400">Searching…</div>
            ) : leads.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">No leads found</div>
            ) : (
              leads.slice(0, 8).map(lead => {
                const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
                return (
                  <button
                    key={lead.id}
                    onClick={() => selectLead(lead)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <User size={14} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatPhoneNumber(lead.phone_number)}
                        {lead.email ? ` · ${lead.email}` : ''}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Selected lead info */}
      {selectedLead && (
        <div className="card p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                {[selectedLead.first_name, selectedLead.last_name].filter(Boolean).join(' ') || 'Unknown'}
              </p>
              <p className="text-xs text-slate-500">
                {formatPhoneNumber(selectedLead.phone_number)}
                {selectedLead.email ? ` · ${selectedLead.email}` : ''}
              </p>
            </div>
            <button
              onClick={() => { setSelectedLead(null); setRawDigits(''); setDisplayValue('') }}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {!selectedLead ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Phone size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-600">Enter a Mobile Number</h3>
            <p className="text-sm text-slate-400 mt-1">Type a phone number above to find leads and view their activity</p>
          </div>
        </div>
      ) : loadingActivity ? (
        <div className="card">
          <div className="flex flex-col items-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3" />
            <p className="text-sm text-slate-400">Loading activity…</p>
          </div>
        </div>
      ) : activities.length === 0 ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Activity size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-600">No Activity</h3>
            <p className="text-sm text-slate-400 mt-1">No activity recorded for this lead yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((entry, idx) => {
            const type = String(entry.type || entry.activity_type || 'note').toLowerCase()
            const IconComponent = TYPE_ICONS[type] || Activity
            const colorClass = TYPE_COLORS[type] || TYPE_COLORS.note
            const content = entry.body || entry.description || entry.note || entry.subject || ''

            return (
              <div key={entry.id ?? idx} className="card p-0 overflow-hidden">
                <div className="flex gap-3 p-4">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${colorClass}`}>
                    <IconComponent size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {entry.subject && (
                        <span className="text-sm font-semibold text-slate-900">{entry.subject}</span>
                      )}
                      <Badge variant={
                        type === 'call' ? 'blue' :
                        type === 'sms' ? 'green' :
                        type === 'email' ? 'purple' : 'gray'
                      }>
                        {type.replace(/_/g, ' ')}
                      </Badge>
                      {!!(entry.pinned || entry.is_pinned) && <Badge variant="yellow">Pinned</Badge>}
                    </div>
                    {content && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-3">{content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {entry.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatTimestamp(entry.created_at)}
                        </span>
                      )}
                      {entry.user_name && (
                        <span className="flex items-center gap-1">
                          <User size={11} /> {entry.user_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
