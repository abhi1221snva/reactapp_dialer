import { useState, useRef, useEffect, useMemo } from 'react'
import {
  X, RotateCcw, Check, User, Calendar, Building2,
  Phone, Mail, Tag, ChevronDown, ChevronRight, Search, SlidersHorizontal,
} from 'lucide-react'
import type { LeadStatus } from '../../types/crm.types'
import { cn } from '../../utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Filters {
  lead_status:   string[]
  assigned_to:   string
  date_from:     string
  date_to:       string
  lead_type:     string
  company_name:  string
  phone_number:  string
  email:         string
  industry_type: string
}

export const EMPTY_FILTERS: Filters = {
  lead_status: [], assigned_to: '', date_from: '', date_to: '',
  lead_type: '', company_name: '', phone_number: '', email: '', industry_type: '',
}

interface Props {
  open:     boolean
  filters:  Filters                      // currently applied (used to init draft)
  onApply:  (filters: Filters) => void
  onClose:  () => void
  statuses: LeadStatus[]
  agents:   { id: number; name: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function countActive(f: Filters): number {
  return [
    f.lead_status.length > 0,
    !!f.assigned_to,
    !!f.date_from || !!f.date_to,
    !!f.lead_type,
    !!f.company_name,
    !!f.phone_number,
    !!f.email,
    !!f.industry_type,
  ].filter(Boolean).length
}

// ── Status grouping ──────────────────────────────────────────────────────────

const STATUS_GROUPS: { key: string; label: string; slugs: string[] }[] = [
  { key: 'new_initial',  label: 'New / Initial',  slugs: ['new_lead', 'application_acknowledgement', 'loc', 'app_out'] },
  { key: 'documents',    label: 'Documents',       slugs: ['missing_docs/info', 'docs_in', 'docs-requested', 'docs-received', 'needs-more-docs', 'documents_acknowledgment'] },
  { key: 'underwriting', label: 'Underwriting',    slugs: ['submitted', 'submitted-to-underwriting', 'in-underwriting', 'pre-qualified', 'conditionally-approved', 'submitted_to_non-mca', 'approved'] },
  { key: 'contracts',    label: 'Contracts',       slugs: ['contract-sent', 'contract-signed', 'contract_in', 'contract_out'] },
  { key: 'final',        label: 'Final Outcome',   slugs: ['funded', 'declined', 'not-interested', 'dead', 'merchant_declined_offer', 'in-default'] },
  { key: 'followup',     label: 'Follow-Up',       slugs: ['contacted', 'callback-scheduled', 'revisit', 'renewal', 'renewal-eligible', 'renewal-in-progress'] },
]

const ALL_KNOWN_SLUGS = new Set(STATUS_GROUPS.flatMap(g => g.slugs))

const QUICK_FILTERS: { label: string; slugs: string[] }[] = [
  { label: 'New',       slugs: ['new_lead'] },
  { label: 'Submitted', slugs: ['submitted', 'submitted-to-underwriting', 'submitted_to_non-mca'] },
  { label: 'Approved',  slugs: ['approved', 'conditionally-approved', 'pre-qualified'] },
  { label: 'Funded',    slugs: ['funded'] },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon, title, count }: {
  icon: React.ReactNode; title: string; count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {count}
        </span>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

// Selected status chips
function StatusChips({ selected, statuses, onRemove, onClearAll }: {
  selected: string[]
  statuses: LeadStatus[]
  onRemove: (slug: string) => void
  onClearAll: () => void
}) {
  if (selected.length === 0) return null
  const map = new Map(statuses.map(s => [s.lead_title_url, s]))
  return (
    <div className="flex flex-wrap items-center gap-1.5 mb-3">
      {selected.map(slug => {
        const s = map.get(slug)
        const raw = s as unknown as Record<string, unknown> | undefined
        const colorHex = raw ? (raw.color_code ?? raw.color) as string | undefined : undefined
        const pal = colorHex ? hexBadge(colorHex) : null
        return (
          <span
            key={slug}
            className="inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 border"
            style={pal
              ? { background: pal.bg, color: pal.text, borderColor: pal.border }
              : { background: '#EEF2FF', color: '#4F46E5', borderColor: '#C7D2FE' }}
          >
            {s?.lead_title ?? slug}
            <button
              type="button"
              onClick={() => onRemove(slug)}
              className="ml-0.5 hover:opacity-70 transition-opacity"
            >
              <X size={10} />
            </button>
          </span>
        )
      })}
      <button
        type="button"
        onClick={onClearAll}
        className="text-[11px] font-medium text-slate-400 hover:text-red-500 transition-colors ml-1"
      >
        Clear all
      </button>
    </div>
  )
}

// Collapsible status group accordion
function StatusGroupAccordion({ label, statuses, selectedSlugs, expanded, onToggleExpand, onToggleStatus }: {
  label: string
  statuses: LeadStatus[]
  selectedSlugs: Set<string>
  expanded: boolean
  onToggleExpand: () => void
  onToggleStatus: (slug: string) => void
}) {
  const count = statuses.filter(s => selectedSlugs.has(s.lead_title_url)).length
  return (
    <div className="border border-slate-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left"
      >
        <ChevronRight
          size={12}
          className={cn('text-slate-400 transition-transform duration-200', expanded && 'rotate-90')}
        />
        <span className="text-[11px] font-semibold text-slate-600 flex-1">{label}</span>
        {count > 0 && (
          <span className="w-4.5 h-4.5 min-w-[18px] rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {count}
          </span>
        )}
      </button>
      {expanded && (
        <div className="px-1 py-1">
          {statuses.map(s => {
            const active = selectedSlugs.has(s.lead_title_url)
            const raw = s as unknown as Record<string, unknown>
            const colorHex = (raw.color_code ?? raw.color) as string | undefined
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onToggleStatus(s.lead_title_url)}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors text-left group"
              >
                <div className={cn(
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                  active
                    ? 'bg-indigo-600 border-indigo-600'
                    : 'border-slate-300 group-hover:border-slate-400',
                )}>
                  {active && <Check size={10} className="text-white" />}
                </div>
                {colorHex && (
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colorHex }}
                  />
                )}
                <span className={cn(
                  'text-xs flex-1 truncate',
                  active ? 'text-slate-800 font-medium' : 'text-slate-600',
                )}>
                  {s.lead_title}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Searchable agent select
function AgentSelect({ agents, value, onChange }: {
  agents: { id: number; name: string }[]
  value: string
  onChange: (v: string) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = agents.filter(a =>
    a.name.toLowerCase().includes(query.toLowerCase())
  )
  const selected = agents.find(a => String(a.id) === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setQuery('') }}
        className={cn(
          'w-full flex items-center gap-2 h-9 px-3 rounded-lg border text-sm text-left transition-colors',
          open
            ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white'
            : 'border-slate-200 bg-white hover:border-slate-300',
        )}
      >
        <User size={13} className="text-slate-400 flex-shrink-0" />
        <span className={cn('flex-1 truncate', selected ? 'text-slate-800' : 'text-slate-400')}>
          {selected?.name ?? 'All agents'}
        </span>
        <ChevronDown size={13} className={cn('text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search agents…"
                className="w-full h-7 pl-7 pr-2 text-xs rounded-md border border-slate-200 focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          {/* Options */}
          <div className="max-h-44 overflow-y-auto py-1">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                !value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              <User size={12} className="flex-shrink-0" />
              <span className="text-xs">All agents</span>
            </button>
            {filtered.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => { onChange(String(a.id)); setOpen(false) }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors',
                  String(a.id) === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-[9px] font-bold text-white">
                    {a.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs flex-1 truncate">{a.name}</span>
                {String(a.id) === value && <Check size={11} className="text-indigo-600 flex-shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No agents match</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── LeadSearchFilters (slide-over drawer) ─────────────────────────────────────

export function LeadSearchFilters({ open, filters, onApply, onClose, statuses, agents }: Props) {
  const [draft, setDraft] = useState<Filters>({ ...filters })

  const [statusSearch, setStatusSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['new_initial']))

  // Re-init draft whenever the drawer opens (so it reflects current applied state)
  useEffect(() => {
    if (open) {
      setDraft({ ...filters })
      setStatusSearch('')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const set    = (key: keyof Filters, value: string) => setDraft(d => ({ ...d, [key]: value }))
  const setArr = (key: keyof Filters, value: string[]) => setDraft(d => ({ ...d, [key]: value }))

  const toggleStatus = (slug: string) => {
    const next = draft.lead_status.includes(slug)
      ? draft.lead_status.filter(s => s !== slug)
      : [...draft.lead_status, slug]
    setArr('lead_status', next)
  }

  // Build status groups from available statuses
  const statusMap = useMemo(() => new Map(statuses.map(s => [s.lead_title_url, s])), [statuses])

  const filteredGroups = useMemo(() => {
    const q = statusSearch.toLowerCase().trim()
    const groups: { key: string; label: string; items: LeadStatus[] }[] = []

    for (const g of STATUS_GROUPS) {
      const items = g.slugs
        .map(slug => statusMap.get(slug))
        .filter((s): s is LeadStatus => !!s)
        .filter(s => !q || s.lead_title.toLowerCase().includes(q))
      if (items.length > 0) groups.push({ key: g.key, label: g.label, items })
    }

    // "Other" group: statuses not in any defined group
    const otherItems = statuses
      .filter(s => !ALL_KNOWN_SLUGS.has(s.lead_title_url))
      .filter(s => !q || s.lead_title.toLowerCase().includes(q))
    if (otherItems.length > 0) groups.push({ key: 'other', label: 'Other', items: otherItems })

    return groups
  }, [statuses, statusMap, statusSearch])

  const selectedSet = useMemo(() => new Set(draft.lead_status), [draft.lead_status])

  const handleQuickFilter = (slugs: string[]) => {
    const allSelected = slugs.every(s => draft.lead_status.includes(s))
    if (allSelected) {
      // Deselect all slugs in this quick filter
      setArr('lead_status', draft.lead_status.filter(s => !slugs.includes(s)))
    } else {
      // Select all slugs (add missing ones)
      const combined = new Set([...draft.lead_status, ...slugs])
      setArr('lead_status', Array.from(combined))
    }
  }

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const isGroupExpanded = (key: string) => !!statusSearch.trim() || expandedGroups.has(key)

  const apply = () => { onApply(draft); onClose() }

  const reset = () => {
    setDraft(EMPTY_FILTERS)
    onApply(EMPTY_FILTERS)
    onClose()
  }

  const draftCount    = countActive(draft)
  const appliedCount  = countActive(filters)
  const hasChanges    = JSON.stringify(draft) !== JSON.stringify(filters)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-slate-900/40 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'absolute top-0 right-0 bottom-0 w-full max-w-[380px] bg-white flex flex-col shadow-2xl transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <SlidersHorizontal size={14} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Filter Leads</p>
              <p className="text-xs text-slate-400">
                {appliedCount > 0 ? `${appliedCount} filter${appliedCount > 1 ? 's' : ''} applied` : 'No filters applied'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Scrollable body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ── 1. Status ──────────────────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={<Tag size={12} className="text-indigo-500" />}
              title="Status"
              count={draft.lead_status.length}
            />

            {/* Selected chips */}
            <StatusChips
              selected={draft.lead_status}
              statuses={statuses}
              onRemove={slug => toggleStatus(slug)}
              onClearAll={() => setArr('lead_status', [])}
            />

            {/* Search input */}
            <div className="relative mb-3">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={statusSearch}
                onChange={e => setStatusSearch(e.target.value)}
                placeholder="Search statuses…"
                className="w-full h-8 pl-9 pr-8 rounded-lg border border-slate-200 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
              />
              {statusSearch && (
                <button
                  type="button"
                  onClick={() => setStatusSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Quick filter buttons */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_FILTERS.map(qf => {
                const allSelected = qf.slugs.every(s => draft.lead_status.includes(s))
                const someSelected = !allSelected && qf.slugs.some(s => draft.lead_status.includes(s))
                return (
                  <button
                    key={qf.label}
                    type="button"
                    onClick={() => handleQuickFilter(qf.slugs)}
                    className={cn(
                      'text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all',
                      allSelected
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : someSelected
                          ? 'bg-indigo-50 text-indigo-600 border-indigo-300'
                          : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600',
                    )}
                  >
                    {qf.label}
                  </button>
                )
              })}
            </div>

            {/* Grouped accordions */}
            <div className="space-y-1.5">
              {filteredGroups.map(g => (
                <StatusGroupAccordion
                  key={g.key}
                  label={g.label}
                  statuses={g.items}
                  selectedSlugs={selectedSet}
                  expanded={isGroupExpanded(g.key)}
                  onToggleExpand={() => toggleGroupExpanded(g.key)}
                  onToggleStatus={toggleStatus}
                />
              ))}
              {filteredGroups.length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  No statuses match &ldquo;{statusSearch}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* ── Divider ──────────────────────────────────────────────────────── */}
          <div className="border-t border-slate-100" />

          {/* ── 2. Assignment ────────────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={<User size={12} className="text-indigo-500" />}
              title="Assignment"
              count={draft.assigned_to || draft.lead_type ? 1 : 0}
            />
            <div className="grid grid-cols-1 gap-4">
              <div>
                <FieldLabel>Assigned Agent</FieldLabel>
                <AgentSelect
                  agents={agents}
                  value={draft.assigned_to}
                  onChange={v => set('assigned_to', v)}
                />
              </div>
              <div>
                <FieldLabel>Lead Type</FieldLabel>
                <div className="flex gap-2">
                  {(['hot', 'warm', 'cold'] as const).map(type => {
                    const colors = {
                      hot:  { active: 'bg-red-50 border-red-300 text-red-700',   dot: 'bg-red-500' },
                      warm: { active: 'bg-amber-50 border-amber-300 text-amber-700', dot: 'bg-amber-500' },
                      cold: { active: 'bg-sky-50 border-sky-300 text-sky-700',   dot: 'bg-sky-500' },
                    }
                    const isActive = draft.lead_type === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => set('lead_type', isActive ? '' : type)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-all',
                          isActive ? colors[type].active : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? colors[type].dot : 'bg-slate-300')} />
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ── 3. Date Range ────────────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={<Calendar size={12} className="text-indigo-500" />}
              title="Date Range"
              count={(draft.date_from || draft.date_to) ? 1 : 0}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>From</FieldLabel>
                <input
                  type="date"
                  value={draft.date_from}
                  max={draft.date_to || undefined}
                  onChange={e => set('date_from', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                />
              </div>
              <div>
                <FieldLabel>To</FieldLabel>
                <input
                  type="date"
                  value={draft.date_to}
                  min={draft.date_from || undefined}
                  onChange={e => set('date_to', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                />
              </div>
            </div>
            {/* Quick range presets */}
            <div className="flex gap-1.5 mt-2.5 flex-wrap">
              {[
                { label: 'Today',    days: 0 },
                { label: 'Last 7d',  days: 7 },
                { label: 'Last 30d', days: 30 },
                { label: 'Last 90d', days: 90 },
              ].map(({ label, days }) => {
                const to   = new Date()
                const from = new Date()
                if (days > 0) from.setDate(from.getDate() - days)
                const toStr   = to.toISOString().slice(0, 10)
                const fromStr = from.toISOString().slice(0, 10)
                const isActive = draft.date_from === fromStr && draft.date_to === toStr
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (isActive) { set('date_from', ''); set('date_to', '') }
                      else { setDraft(d => ({ ...d, date_from: fromStr, date_to: toStr })) }
                    }}
                    className={cn(
                      'text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors',
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600',
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ── 4. Contact Info ─────────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={<Phone size={12} className="text-indigo-500" />}
              title="Contact Info"
              count={(draft.phone_number || draft.email) ? 1 : 0}
            />
            <div className="space-y-3">
              <div>
                <FieldLabel>Phone Number</FieldLabel>
                <div className="relative">
                  <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={draft.phone_number}
                    onChange={e => set('phone_number', e.target.value)}
                    placeholder="Filter by phone…"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <div className="relative">
                  <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={draft.email}
                    onChange={e => set('email', e.target.value)}
                    placeholder="Filter by email…"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* ── 5. Business Info ─────────────────────────────────────────────── */}
          <div>
            <SectionHeader
              icon={<Building2 size={12} className="text-indigo-500" />}
              title="Business Info"
              count={(draft.company_name || draft.industry_type) ? 1 : 0}
            />
            <div className="space-y-3">
              <div>
                <FieldLabel>Company Name</FieldLabel>
                <div className="relative">
                  <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={draft.company_name}
                    onChange={e => set('company_name', e.target.value)}
                    placeholder="Filter by company…"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
              <div>
                <FieldLabel>Industry Type</FieldLabel>
                <div className="relative">
                  <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={draft.industry_type}
                    onChange={e => set('industry_type', e.target.value)}
                    placeholder="Filter by industry…"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100 bg-slate-50/60 space-y-2">
          {/* Apply button */}
          <button
            type="button"
            onClick={apply}
            className={cn(
              'w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-semibold transition-all',
              hasChanges || draftCount > 0
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white',
            )}
          >
            <Check size={15} />
            Apply Filters
            {draftCount > 0 && (
              <span className="ml-1 w-5 h-5 rounded-full bg-white/25 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                {draftCount}
              </span>
            )}
          </button>
          {/* Reset */}
          <button
            type="button"
            onClick={reset}
            className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <RotateCcw size={13} />
            Reset All Filters
          </button>
        </div>
      </div>
    </div>
  )
}
