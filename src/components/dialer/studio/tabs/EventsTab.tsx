import { Activity, Phone, MessageSquare, Mail, StickyNote, Tag } from 'lucide-react'
import { cn } from '../../../../utils/cn'
import { MOCK_EVENTS } from '../mockData'
import type { StudioEvent } from '../types'

const ICON_MAP: Record<StudioEvent['type'], React.ElementType> = {
  call:        Phone,
  sms:         MessageSquare,
  email:       Mail,
  note:        StickyNote,
  disposition: Tag,
}
const COLOR_MAP: Record<StudioEvent['type'], string> = {
  call:        'bg-emerald-100 text-emerald-600 border-emerald-200',
  sms:         'bg-sky-100 text-sky-600 border-sky-200',
  email:       'bg-violet-100 text-violet-600 border-violet-200',
  note:        'bg-amber-100 text-amber-600 border-amber-200',
  disposition: 'bg-indigo-100 text-indigo-600 border-indigo-200',
}

export function EventsTab() {
  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Activity size={14} className="text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Activity Timeline</h3>
            <p className="text-[11px] text-slate-400">All touchpoints with this lead</p>
          </div>
          <span className="badge-indigo text-[10px]">{MOCK_EVENTS.length} events</span>
        </div>

        <div className="detail-section-body">
          <div className="relative pl-6">
            {/* Vertical rail */}
            <div className="absolute left-[11px] top-1 bottom-1 w-px bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />

            {MOCK_EVENTS.map((ev, i) => {
              const Icon = ICON_MAP[ev.type]
              const color = COLOR_MAP[ev.type]
              return (
                <div key={ev.id} className={cn('relative flex gap-3', i !== MOCK_EVENTS.length - 1 && 'pb-4')}>
                  <div className={cn(
                    'absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white shadow-sm',
                    color,
                  )}>
                    <Icon size={10} />
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900">{ev.title}</p>
                      {ev.duration && (
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                          {ev.duration}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ev.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{ev.timestamp}</span>
                      {ev.agent && (
                        <>
                          <span>·</span>
                          <span className="font-medium">{ev.agent}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
