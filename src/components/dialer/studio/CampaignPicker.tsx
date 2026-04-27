import { useState, useMemo } from 'react'
import {
  Radio, Zap, Search, ChevronRight,
  WifiOff, ShieldAlert, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import { cn } from '../../../utils/cn'
import type { StudioCampaign } from './types'

interface Props {
  campaigns: StudioCampaign[]
  onSelect: (c: StudioCampaign) => void
  isLoading?: boolean
  error?: string
  webphoneConfigured?: boolean
  webphoneOk?: boolean
}

type StatusFilter = 'all' | 'active' | 'paused'
type SortKey = 'name' | 'remaining' | 'progress' | 'totalLeads' | 'status'
type SortDir = 'asc' | 'desc'

function getRemaining(c: StudioCampaign) { return c.totalLeads - c.calledLeads }
function getProgress(c: StudioCampaign) { return c.totalLeads ? (c.calledLeads / c.totalLeads) * 100 : 0 }

/**
 * Pre-dialer campaign picker — full-width sortable table with status dropdown filter.
 */
export function CampaignPicker({ campaigns, onSelect, isLoading, error, webphoneConfigured = true, webphoneOk = true }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filtered = useMemo(() => {
    let list = campaigns
    if (query) list = list.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)

    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':       cmp = a.name.localeCompare(b.name); break
        case 'remaining':  cmp = getRemaining(a) - getRemaining(b); break
        case 'progress':   cmp = getProgress(a) - getProgress(b); break
        case 'totalLeads': cmp = a.totalLeads - b.totalLeads; break
        case 'status':     cmp = a.status.localeCompare(b.status); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [campaigns, query, statusFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const activeCt = campaigns.filter((c) => c.status === 'active').length
  const pausedCt = campaigns.length - activeCt
  const totalQueued = campaigns.reduce((s, c) => s + getRemaining(c), 0)

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="animate-fadeIn">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <p className="text-sm text-slate-400 mb-6">Loading your campaigns…</p>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="animate-fadeIn empty-dashed">
        <Radio size={28} className="text-slate-300 mb-3" />
        <p className="font-semibold text-slate-600">Could not load campaigns</p>
        <p className="text-xs text-slate-400 mt-1">{error}</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeIn">
      {/* Hero header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
              <Radio size={16} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dialer Studio</h1>
            <span className="badge-indigo">Beta</span>
          </div>
          <p className="text-sm text-slate-500">
            Pick a campaign to begin. Your workspace loads instantly — no page reloads.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
          <Zap size={14} className="text-indigo-600" />
          <span className="text-xs font-semibold text-slate-700">{activeCt} Active</span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-500">{totalQueued.toLocaleString()} leads queued</span>
        </div>
      </div>

      {/* Toolbar: Search + Status dropdown */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all cursor-pointer"
        >
          <option value="all">All ({campaigns.length})</option>
          <option value="active">Active ({activeCt})</option>
          <option value="paused">Paused ({pausedCt})</option>
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="empty-dashed">
          <Radio size={28} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">
            {campaigns.length === 0 ? 'No campaigns assigned' : 'No campaigns match your filters'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {campaigns.length === 0
              ? 'Contact your administrator to assign campaigns to your account.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <SortHeader label="Campaign" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} className="pl-4" />
                <SortHeader label="Status" sortKey="status" current={sortKey} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                <SortHeader label="Mode" sortKey="name" current={sortKey} dir={sortDir} onSort={toggleSort} sortable={false} className="hidden lg:table-cell" />
                <SortHeader label="Total" sortKey="totalLeads" current={sortKey} dir={sortDir} onSort={toggleSort} className="hidden md:table-cell text-right" />
                <SortHeader label="Remaining" sortKey="remaining" current={sortKey} dir={sortDir} onSort={toggleSort} className="text-right" />
                <SortHeader label="Progress" sortKey="progress" current={sortKey} dir={sortDir} onSort={toggleSort} className="hidden sm:table-cell" />
                <th className="py-3 px-4 text-right">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((c) => {
                const remaining = getRemaining(c)
                const progress = Math.round(getProgress(c))
                const isPaused = c.status === 'paused'
                const isBlocked = !webphoneOk
                const isDisabled = isPaused || isBlocked
                return (
                  <tr
                    key={c.id}
                    onClick={() => !isDisabled && onSelect(c)}
                    className={cn(
                      'group transition-colors',
                      isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:bg-indigo-50/40',
                    )}
                  >
                    {/* Campaign name + color dot */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-br', c.color)} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400 sm:hidden">
                            {c.dialMethod} · {isPaused ? 'Paused' : 'Live'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
                        isPaused
                          ? 'bg-slate-100 text-slate-500'
                          : 'bg-emerald-50 text-emerald-700',
                      )}>
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isPaused ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse',
                        )} />
                        {isPaused ? 'Paused' : 'Live'}
                      </span>
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-xs text-slate-500">{c.dialMethod} · {c.ratio}:1</span>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 text-right hidden md:table-cell">
                      <span className="text-slate-700 font-medium tabular-nums">
                        {c.totalLeads.toLocaleString()}
                      </span>
                    </td>

                    {/* Remaining */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-indigo-600 tabular-nums">
                        {remaining.toLocaleString()}
                      </span>
                    </td>

                    {/* Progress bar (inline) */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className={cn('h-full rounded-full bg-gradient-to-r', c.color)}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums w-8 text-right">{progress}%</span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {isPaused ? (
                        <span className="text-xs text-slate-400">Paused</span>
                      ) : isBlocked ? (
                        <span className="text-xs text-rose-500 flex items-center gap-1 justify-end">
                          {webphoneConfigured ? <WifiOff size={12} /> : <ShieldAlert size={12} />}
                          {webphoneConfigured ? 'No WebPhone' : 'Not Configured'}
                        </span>
                      ) : (
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                          Start
                          <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Footer summary */}
          <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/40 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {filtered.length} campaign{filtered.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-400">
              {filtered.reduce((s, c) => s + getRemaining(c), 0).toLocaleString()} total leads remaining
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sortable table header cell ─────────────────────────────────────────────── */

function SortHeader({
  label, sortKey, current, dir, onSort, sortable = true, className,
}: {
  label: string
  sortKey: SortKey
  current: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  sortable?: boolean
  className?: string
}) {
  const isActive = sortable && current === sortKey
  return (
    <th
      className={cn(
        'py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
        sortable && 'cursor-pointer select-none hover:text-slate-700 transition-colors',
        className,
      )}
      onClick={() => sortable && onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortable && (
          isActive
            ? (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)
            : <ArrowUpDown size={12} className="opacity-30" />
        )}
      </span>
    </th>
  )
}
