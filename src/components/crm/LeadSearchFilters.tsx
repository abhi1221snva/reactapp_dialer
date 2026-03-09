import { useState } from 'react'
import { X, Filter, RotateCcw, Check } from 'lucide-react'
import type { LeadStatus } from '../../types/crm.types'
import { cn } from '../../utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Filters {
  lead_status: string[]
  assigned_to: string
  date_from: string
  date_to: string
  lead_type: string
  company_name: string
  phone_number: string
  email: string
  industry_type: string
}

const EMPTY_FILTERS: Filters = {
  lead_status: [], assigned_to: '', date_from: '', date_to: '',
  lead_type: '', company_name: '', phone_number: '', email: '', industry_type: '',
}

interface Props {
  filters: Filters
  onFilterChange: (filters: Filters) => void
  statuses: LeadStatus[]
  agents: { id: number; name: string }[]
  onClose: () => void
}

// ── Helper: derive badge-like colors from a hex color code ────────────────────

function hexBadge(hex: string): { bg: string; text: string; border: string } {
  const h    = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  if (full.length !== 6) return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' }
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return {
    bg:     `rgba(${r},${g},${b},0.10)`,
    text:   hex,
    border: `rgba(${r},${g},${b},0.28)`,
  }
}

// ── LeadSearchFilters ─────────────────────────────────────────────────────────

export function LeadSearchFilters({ filters, onFilterChange, statuses, agents, onClose }: Props) {
  // Buffer changes locally; only push to parent on Apply
  const [draft, setDraft] = useState<Filters>({ ...filters })

  const toggleStatus = (slug: string) => {
    const next = draft.lead_status.includes(slug)
      ? draft.lead_status.filter(s => s !== slug)
      : [...draft.lead_status, slug]
    setDraft(d => ({ ...d, lead_status: next }))
  }

  const set = (key: keyof Filters, value: string) =>
    setDraft(d => ({ ...d, [key]: value }))

  const apply = () => { onFilterChange(draft); onClose() }

  const reset = () => {
    setDraft(EMPTY_FILTERS)
    onFilterChange(EMPTY_FILTERS)
    onClose()
  }

  const hasChanges = JSON.stringify(draft) !== JSON.stringify(filters)

  const label = (text: string) => (
    <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
      {text}
    </label>
  )

  return (
    <div
      className="rounded-2xl border bg-white overflow-hidden"
      style={{ borderColor: '#E2E8F0', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-indigo-500" />
          <span className="text-sm font-semibold text-slate-800">Filter Leads</span>
          {draft.lead_status.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              {draft.lead_status.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-5 space-y-5">

        {/* ── Lead Status pills ──────────────────────────────────────────────── */}
        <div>
          {label('Lead Status')}
          <div className="flex flex-wrap gap-2">
            {statuses.map(s => {
              const active   = draft.lead_status.includes(s.lead_title_url)
              const raw      = s as unknown as Record<string, unknown>
              const colorHex = raw.color_code as string | undefined
                            ?? raw.color as string | undefined
              const pal = colorHex ? hexBadge(colorHex) : null

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStatus(s.lead_title_url)}
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-3 py-1 transition-all duration-150',
                    active
                      ? 'shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                  )}
                  style={active && pal ? {
                    background:   pal.bg,
                    color:        pal.text,
                    borderColor:  pal.border,
                  } : active ? {
                    background:  '#EEF2FF',
                    color:       '#4F46E5',
                    borderColor: '#C7D2FE',
                  } : undefined}
                >
                  {active && (
                    <Check size={11} className="flex-shrink-0" />
                  )}
                  {s.lead_title}
                </button>
              )
            })}
            {statuses.length === 0 && (
              <p className="text-xs text-slate-400 italic">No statuses available</p>
            )}
          </div>
        </div>

        {/* ── Grid fields ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-4">

          {/* Assigned To */}
          <div>
            {label('Assigned To')}
            <select
              value={draft.assigned_to}
              onChange={e => set('assigned_to', e.target.value)}
              className="input w-full"
            >
              <option value="">All agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Lead Type */}
          <div>
            {label('Lead Type')}
            <select
              value={draft.lead_type}
              onChange={e => set('lead_type', e.target.value)}
              className="input w-full"
            >
              <option value="">All types</option>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            {label('Date From')}
            <input
              type="date"
              value={draft.date_from}
              onChange={e => set('date_from', e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Date To */}
          <div>
            {label('Date To')}
            <input
              type="date"
              value={draft.date_to}
              onChange={e => set('date_to', e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Company */}
          <div>
            {label('Company Name')}
            <input
              type="text"
              value={draft.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Filter by company…"
              className="input w-full"
            />
          </div>

          {/* Phone */}
          <div>
            {label('Phone Number')}
            <input
              type="text"
              value={draft.phone_number}
              onChange={e => set('phone_number', e.target.value)}
              placeholder="Filter by phone…"
              className="input w-full"
            />
          </div>

          {/* Email */}
          <div>
            {label('Email Address')}
            <input
              type="text"
              value={draft.email}
              onChange={e => set('email', e.target.value)}
              placeholder="Filter by email…"
              className="input w-full"
            />
          </div>

          {/* Industry */}
          <div>
            {label('Industry Type')}
            <input
              type="text"
              value={draft.industry_type}
              onChange={e => set('industry_type', e.target.value)}
              placeholder="Filter by industry…"
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* ── Footer: Apply / Reset ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
        >
          <RotateCcw size={13} />
          Reset Filters
        </button>

        <button
          type="button"
          onClick={apply}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            hasChanges
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
              : 'bg-indigo-600 text-white hover:bg-indigo-700',
          )}
        >
          <Check size={14} />
          Apply Filters
        </button>
      </div>
    </div>
  )
}
