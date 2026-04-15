import { useState } from 'react'
import { Radio, Users, TrendingUp, Zap, Search, ChevronRight, PlayCircle, WifiOff, ShieldAlert } from 'lucide-react'
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

/**
 * Pre-dialer campaign picker.
 * Displayed when no campaign is selected yet. Clean premium SaaS card grid.
 */
export function CampaignPicker({ campaigns, onSelect, isLoading, error, webphoneConfigured = true, webphoneOk = true }: Props) {
  const [query, setQuery] = useState('')
  const filtered = campaigns.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  )

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="animate-fadeIn">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse" />
        </div>
        <p className="text-sm text-slate-400 mb-6">Loading your campaigns…</p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-3">
              <div className="h-11 w-11 rounded-xl bg-slate-200" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-3 w-1/2 bg-slate-100 rounded" />
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[0,1,2].map((j) => <div key={j} className="h-8 bg-slate-100 rounded-lg" />)}
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full" />
              <div className="h-10 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
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
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
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
          <span className="text-xs font-semibold text-slate-700">
            {campaigns.filter((c) => c.status === 'active').length} Active
          </span>
          <span className="text-slate-200">·</span>
          <span className="text-xs text-slate-500">
            {campaigns.reduce((sum, c) => sum + (c.totalLeads - c.calledLeads), 0).toLocaleString()} leads queued
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search campaigns…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="empty-dashed">
          <Radio size={28} className="text-slate-300 mb-3" />
          <p className="font-semibold text-slate-600">No campaigns match your search</p>
          <p className="text-xs text-slate-400 mt-1">Try a different keyword</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c, i) => {
            const remaining = c.totalLeads - c.calledLeads
            const progress = c.totalLeads ? Math.round((c.calledLeads / c.totalLeads) * 100) : 0
            const isPaused = c.status === 'paused'
            const isBlocked = !webphoneOk
            const isDisabled = isPaused || isBlocked
            return (
              <button
                key={c.id}
                onClick={() => !isDisabled && onSelect(c)}
                disabled={isDisabled}
                style={{ animationDelay: `${i * 40}ms` }}
                className={cn(
                  'text-left card-hover animate-slideUp group relative overflow-hidden',
                  isDisabled && 'opacity-60 cursor-not-allowed hover:shadow-none hover:translate-y-0',
                )}
              >
                {/* Gradient accent bar */}
                <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', c.color)} />

                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center shadow-sm bg-gradient-to-br',
                    c.color,
                  )}>
                    <Radio size={18} className="text-white" />
                  </div>
                  <span className={cn(
                    'badge text-[10px]',
                    isPaused ? 'badge-gray' : 'badge-green',
                  )}>
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      isPaused ? 'bg-slate-400' : 'bg-emerald-500 animate-pulse',
                    )} />
                    {isPaused ? 'Paused' : 'Live'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug mb-1 line-clamp-2">
                  {c.name}
                </h3>
                <p className="text-xs text-slate-500 capitalize mb-4">
                  {c.dialMethod} &middot; Ratio {c.ratio}:1
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
                      <Users size={9} /> Total
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {c.totalLeads.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
                      <TrendingUp size={9} /> Called
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {c.calledLeads.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
                      <Zap size={9} /> Left
                    </div>
                    <p className="text-sm font-bold text-indigo-600 mt-0.5">
                      {remaining.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span>Progress</span>
                    <span className="font-semibold text-slate-600">{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div
                      className={cn('progress-fill bg-gradient-to-r', c.color)}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* CTA */}
                <div className={cn(
                  'mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all',
                  isPaused
                    ? 'bg-slate-100 text-slate-400'
                    : isBlocked
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white',
                )}>
                  {isPaused ? (
                    <><PlayCircle size={15} /> Campaign Paused</>
                  ) : isBlocked ? (
                    <>
                      {webphoneConfigured
                        ? <><WifiOff size={15} /> WebPhone Not Connected</>
                        : <><ShieldAlert size={15} /> WebPhone Not Configured</>
                      }
                    </>
                  ) : (
                    <>
                      <PlayCircle size={15} />
                      Start Dialing
                      <ChevronRight size={14} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
