import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Search, ArrowLeft, Clock, User, MessageSquare, Phone, Mail, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../../components/ui/Badge'
import { leadService } from '../../services/lead.service'
import api from '../../api/axios'

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
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

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

  // Search leads
  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['lead-search', debouncedSearch],
    queryFn: () => leadService.list({ page: 1, limit: 10, search: debouncedSearch, filters: {} }),
    enabled: debouncedSearch.length >= 2,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities: ActivityEntry[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = activityData as any
    const arr = r?.data?.data ?? r?.data
    return Array.isArray(arr) ? arr : []
  })()

  const selectLead = (lead: LeadOption) => {
    setSelectedLead(lead)
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.phone_number || `Lead #${lead.id}`
    setSearchTerm(name)
    setShowDropdown(false)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <button onClick={() => navigate('/')} className="btn-ghost p-1.5 rounded-lg">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="page-title">Lead Activity</h1>
          <p className="page-subtitle">View activity timeline for individual leads</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="card" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-slate-400" />
          </div>
          <input
            ref={searchRef}
            className="input pl-10"
            placeholder="Search leads by name, phone, or email…"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value)
              setShowDropdown(true)
              if (!e.target.value) setSelectedLead(null)
            }}
            onFocus={() => { if (searchTerm.length >= 2) setShowDropdown(true) }}
          />
        </div>

        {/* Dropdown */}
        {showDropdown && debouncedSearch.length >= 2 && (
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
                        {[lead.phone_number, lead.email].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {!selectedLead ? (
        <div className="card">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Activity size={28} className="text-slate-300" />
            </div>
            <h3 className="text-base font-semibold text-slate-600">Select a Lead</h3>
            <p className="text-sm text-slate-400 mt-1">Search and select a lead above to view their activity timeline</p>
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
            const type = (entry.type || 'note').toLowerCase()
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
                      {entry.pinned && <Badge variant="yellow">Pinned</Badge>}
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
