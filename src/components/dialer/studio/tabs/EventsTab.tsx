import { useEffect, useState } from 'react'
import {
  Activity, Phone, PhoneIncoming, PhoneOutgoing, Tag, Loader2, PhoneOff,
} from 'lucide-react'
import { cn } from '../../../../utils/cn'
import { campaignDialerService } from '../../../../services/campaignDialer.service'
import type { CdrRecord } from '../../../../services/campaignDialer.service'

interface Props {
  leadId: number
}

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '0s'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function fmtDateTime(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export function EventsTab({ leadId }: Props) {
  const [records, setRecords] = useState<CdrRecord[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!leadId) return
    setLoading(true)
    campaignDialerService
      .getLeadCdr(leadId)
      .then((res) => setRecords(res.data?.data ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [leadId])

  return (
    <div className="space-y-5 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Activity size={13} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-slate-800">Call History</h3>
            <p className="text-[10px] text-slate-400">CDR records for this lead</p>
          </div>
          {!loading && (
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 rounded-md px-1.5 py-0.5">
              {records.length}
            </span>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-slate-400" />
          </div>
        )}

        {!loading && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <PhoneOff size={20} className="mb-2 opacity-40" />
            <p className="text-xs">No call records yet</p>
          </div>
        )}

        {!loading && records.length > 0 && (
          <div className="relative pl-6">
            {/* Vertical rail */}
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

            {records.map((cdr, i) => {
              const isInbound = cdr.route === 'IN'
              const Icon = isInbound ? PhoneIncoming : PhoneOutgoing
              const color = isInbound
                ? 'bg-sky-100 text-sky-600 border-sky-200'
                : 'bg-emerald-100 text-emerald-600 border-emerald-200'

              const title = isInbound ? 'Inbound Call' : 'Outbound Call'
              const number = cdr.number ? String(cdr.number).replace(/(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3') : 'Unknown'

              return (
                <div key={cdr.id} className={cn('relative flex gap-3', i !== records.length - 1 && 'pb-4')}>
                  <div className={cn(
                    'absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow-sm',
                    color,
                  )}>
                    <Icon size={10} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{title}</p>
                      {cdr.duration != null && cdr.duration > 0 && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                          {fmtDuration(cdr.duration)}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      <Phone size={9} className="inline mr-1 opacity-50" />
                      {number}
                      {cdr.extension && (
                        <span className="text-slate-400 ml-1.5">ext. {cdr.extension}</span>
                      )}
                    </p>

                    {cdr.disposition_title && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag size={9} className="text-indigo-500" />
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">
                          {cdr.disposition_title}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span title={fmtDateTime(cdr.start_time)}>{fmtDate(cdr.start_time)}</span>
                      <span>·</span>
                      <span className="font-medium">{cdr.type}</span>
                      {cdr.call_recording && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-medium">recorded</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
