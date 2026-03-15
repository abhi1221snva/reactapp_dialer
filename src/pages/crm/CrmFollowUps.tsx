import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Phone, Mail, Loader2, UserCheck } from 'lucide-react'
import { useCrmHeader } from '../../layouts/CrmLayout'
import api from '../../api/axios'
import type { CrmLead } from '../../types/crm.types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(date: string): string {
  if (!date) return '—'
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || '').toLowerCase().replace(/[\s]+/g, '_')
  const map: Record<string, string> = {
    new:           'bg-blue-100 text-blue-700',
    contacted:     'bg-indigo-100 text-indigo-700',
    in_progress:   'bg-amber-100 text-amber-700',
    follow_up:     'bg-orange-100 text-orange-700',
    funded:        'bg-emerald-100 text-emerald-700',
    declined:      'bg-red-100 text-red-600',
    closed:        'bg-slate-100 text-slate-600',
  }
  const cls = map[s] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  )
}

// ─── Lead + follow-up data shape ──────────────────────────────────────────────

interface FollowUpLead extends CrmLead {
  last_activity_at?: string
}

interface LeadsApiResponse {
  data?: FollowUpLead[] | { data?: FollowUpLead[] }
  records?: FollowUpLead[]
}

// ─── Page Component ───────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All Statuses',  value: '' },
  { label: 'New',           value: 'new' },
  { label: 'Contacted',     value: 'contacted' },
  { label: 'In Progress',   value: 'in_progress' },
  { label: 'Follow Up',     value: 'follow_up' },
]

export function CrmFollowUps() {
  const { setDescription, setActions } = useCrmHeader()
  const [statusFilter, setStatusFilter] = useState('')
  const [daysSince, setDaysSince] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['follow-up-leads', statusFilter, daysSince],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        sort:     'last_activity_at',
        order:    'asc',
        per_page: 50,
      }
      if (statusFilter) params.lead_status = statusFilter
      if (daysSince && Number(daysSince) > 0) params.days_inactive = Number(daysSince)
      const res = await api.get<LeadsApiResponse>('/crm/leads', { params })
      const payload = res.data
      // Handle various API response shapes
      if (Array.isArray(payload)) return payload as FollowUpLead[]
      if (Array.isArray(payload?.data)) return payload.data as FollowUpLead[]
      if (Array.isArray((payload?.data as Record<string, unknown>)?.data))
        return (payload.data as { data: FollowUpLead[] }).data
      if (Array.isArray(payload?.records)) return payload.records as FollowUpLead[]
      return [] as FollowUpLead[]
    },
    staleTime: 30 * 1000,
  })

  const leads: FollowUpLead[] = Array.isArray(data) ? data : []

  useEffect(() => {
    setDescription(
      isLoading ? 'Loading...' : `${leads.length} lead${leads.length !== 1 ? 's' : ''} requiring attention`
    )
    setActions(undefined)
    return () => {
      setDescription(undefined)
      setActions(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, leads.length])

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-slate-500">Leads requiring attention, sorted by least recent activity.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input text-sm py-1.5 pr-8"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">Days since contact:</label>
          <input
            type="number"
            min="1"
            value={daysSince}
            onChange={e => setDaysSince(e.target.value)}
            placeholder="e.g. 7"
            className="input text-sm py-1.5 w-24"
          />
        </div>

        {(statusFilter || daysSince) && (
          <button
            onClick={() => { setStatusFilter(''); setDaysSince('') }}
            className="text-sm text-slate-500 underline hover:text-slate-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lead Name', 'Company', 'Phone', 'Status', 'Last Updated', 'Assigned Agent', 'Contact'].map(h => (
                  <th key={h} className={h === 'Contact' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="flex justify-center">
                      <Loader2 size={22} className="animate-spin text-emerald-500" />
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <div className="text-center">
                      <p className="text-sm text-red-500">Failed to load follow-up queue.</p>
                      <button
                        onClick={() => refetch()}
                        className="mt-2 text-sm text-emerald-600 underline"
                      >
                        Try again
                      </button>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14">
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <UserCheck size={22} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-700">All caught up!</p>
                      <p className="text-xs text-slate-400 mt-1">
                        No leads need follow-up right now.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || `Lead #${lead.id}`
                  const lastUpdated = lead.last_activity_at || lead.updated_at || lead.created_at

                  return (
                    <tr key={lead.id}>
                      {/* Lead Name */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700 uppercase">
                            {(lead.first_name?.[0] ?? lead.company_name?.[0] ?? '?')}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">{fullName}</p>
                            {lead.email && (
                              <p className="text-xs text-slate-400 truncate max-w-[160px]">{lead.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td>
                        <span className="text-sm text-slate-600">{lead.company_name || '—'}</span>
                      </td>

                      {/* Phone */}
                      <td>
                        <span className="text-sm text-slate-600 font-mono">
                          {lead.phone_number || '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={lead.lead_status} />
                      </td>

                      {/* Last Updated */}
                      <td>
                        <span
                          className={[
                            'text-sm',
                            daysAgo(lastUpdated) === 'Today'
                              ? 'text-emerald-600 font-medium'
                              : parseInt(daysAgo(lastUpdated)) >= 7
                                ? 'text-red-500 font-medium'
                                : 'text-slate-600',
                          ].join(' ')}
                        >
                          {daysAgo(lastUpdated)}
                        </span>
                      </td>

                      {/* Assigned Agent */}
                      <td>
                        <span className="text-sm text-slate-600">{lead.assigned_name || '—'}</span>
                      </td>

                      {/* Contact Actions */}
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {lead.phone_number && (
                            <a
                              href={`tel:${lead.phone_number}`}
                              className="action-btn"
                              title={`Call ${lead.phone_number}`}
                            >
                              <Phone size={14} />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="action-btn"
                              title={`Email ${lead.email}`}
                            >
                              <Mail size={14} />
                            </a>
                          )}
                          {!lead.phone_number && !lead.email && (
                            <span className="text-xs text-slate-300">No contact</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
