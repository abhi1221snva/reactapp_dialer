import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, Mail, MapPin, Clock } from 'lucide-react'
import { leadService } from '../../services/lead.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { formatPhoneNumber, formatDateTime, initials } from '../../utils/format'

const TABS = ['Overview', 'Activity', 'Calls', 'Notes']

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Overview')

  const { data, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => leadService.getById(Number(id)),
  })

  const { data: activityData } = useQuery({
    queryKey: ['lead-activity', id],
    queryFn: () => leadService.getActivity(Number(id)),
    enabled: tab === 'Activity',
  })

  if (isLoading) return <PageLoader />

  const lead = data?.data?.data
  if (!lead) return <div className="card text-center py-16 text-slate-400">Lead not found</div>

  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/crm')} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">{name}</h1>
          <p className="page-subtitle">Lead #{id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left panel */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xl font-bold flex items-center justify-center shadow-sm">
              {initials(name)}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{name}</p>
              <p className="text-xs text-slate-500">Lead #{id}</p>
            </div>
          </div>
          <div className="divider" />
          <div className="space-y-2.5 text-sm">
            {lead.phone_number && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-slate-400" />
                <span>{formatPhoneNumber(lead.phone_number)}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {(lead.city || lead.state) && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span>{[lead.city, lead.state].filter(Boolean).join(', ')}</span>
              </div>
            )}
            {lead.created_at && (
              <div className="flex items-center gap-2 text-slate-500">
                <Clock size={14} className="text-slate-400" />
                <span>{formatDateTime(lead.created_at)}</span>
              </div>
            )}
          </div>
          <div className="divider" />
          <button className="btn-primary w-full text-sm gap-2">
            <Phone size={14} /> Call Now
          </button>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-slate-200">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'Overview' && (
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-4">Lead Details</h3>
              <div className="grid grid-cols-2 gap-4">
                {lead.address && <div><p className="label">Address</p><p className="text-sm text-slate-700">{lead.address}</p></div>}
                {lead.city && <div><p className="label">City</p><p className="text-sm text-slate-700">{lead.city}</p></div>}
                {lead.state && <div><p className="label">State</p><p className="text-sm text-slate-700">{lead.state}</p></div>}
                {lead.zip && <div><p className="label">ZIP</p><p className="text-sm text-slate-700">{lead.zip}</p></div>}
              </div>
            </div>
          )}

          {tab === 'Activity' && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-900">Activity Timeline</h3>
              {activityData?.data?.data?.length ? (
                activityData.data.data.map((item: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-slate-700">{String(item.description || item.action || 'Activity')}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(String(item.created_at || ''))}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-sm">No activity yet</p>
              )}
            </div>
          )}

          {tab === 'Calls' && (
            <div className="card text-center py-12 text-slate-400">
              <Phone size={32} className="mx-auto mb-2" />
              <p className="text-sm">No call history</p>
            </div>
          )}

          {tab === 'Notes' && (
            <div className="card space-y-3">
              <h3 className="font-semibold text-slate-900">Notes</h3>
              <textarea className="input resize-none" rows={4} placeholder="Add a note..." />
              <button className="btn-primary text-sm">Save Note</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
