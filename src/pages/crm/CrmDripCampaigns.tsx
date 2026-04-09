import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Play, Pause, Copy, Archive, Trash2, MoreVertical,
  Mail, MessageSquare, Loader2, Zap, Search, BarChart3,
  Users, Send, Eye, Edit3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { dripService } from '../../services/drip.service'
import type { DripCampaign, DripCampaignStatus } from '../../types/drip.types'

const STATUS_TABS: { value: DripCampaignStatus | 'all'; label: string; icon: typeof Zap }[] = [
  { value: 'all',      label: 'All Campaigns', icon: Zap },
  { value: 'active',   label: 'Active',        icon: Play },
  { value: 'draft',    label: 'Drafts',        icon: Edit3 },
  { value: 'paused',   label: 'Paused',        icon: Pause },
  { value: 'archived', label: 'Archived',      icon: Archive },
]

const STATUS_BADGE: Record<DripCampaignStatus, { bg: string; dot: string }> = {
  draft:    { bg: 'bg-slate-50 text-slate-600 ring-1 ring-slate-200',     dot: 'bg-slate-400' },
  active:   { bg: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  paused:   { bg: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',     dot: 'bg-amber-500' },
  archived: { bg: 'bg-slate-50 text-slate-400 ring-1 ring-slate-200',     dot: 'bg-slate-300' },
}

const CHANNEL_LABEL: Record<string, { icon: typeof Mail; label: string; color: string }> = {
  email: { icon: Mail, label: 'Email', color: 'text-sky-600' },
  sms:   { icon: MessageSquare, label: 'SMS', color: 'text-violet-600' },
  both:  { icon: Zap, label: 'Email + SMS', color: 'text-indigo-600' },
}

export function CrmDripCampaigns() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DripCampaignStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 20
  const [menuOpen, setMenuOpen] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const menuBtnRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  // Close menu on outside click or scroll
  const closeMenu = useCallback(() => setMenuOpen(null), [])
  useEffect(() => {
    if (menuOpen !== null) {
      const handler = () => closeMenu()
      window.addEventListener('scroll', handler, true)
      window.addEventListener('click', handler)
      return () => { window.removeEventListener('scroll', handler, true); window.removeEventListener('click', handler) }
    }
  }, [menuOpen, closeMenu])

  const openMenu = (id: number) => {
    const btn = menuBtnRefs.current[id]
    if (btn) {
      const rect = btn.getBoundingClientRect()
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 170 })
    }
    setMenuOpen(menuOpen === id ? null : id)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['drip-campaigns', statusFilter, search, page],
    queryFn: () => dripService.listCampaigns({
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
      start: (page - 1) * perPage,
      limit: perPage,
    }).then(r => r.data.data),
  })

  const duplicateMut = useMutation({
    mutationFn: (id: number) => dripService.duplicateCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaigns'] }); toast.success('Campaign duplicated') },
    onError: () => toast.error('Failed to duplicate'),
  })
  const activateMut = useMutation({
    mutationFn: (id: number) => dripService.activateCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaigns'] }); toast.success('Campaign activated') },
    onError: (e: unknown) => toast.error((e as Error)?.message || 'Failed to activate'),
  })
  const pauseMut = useMutation({
    mutationFn: (id: number) => dripService.pauseCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaigns'] }); toast.success('Campaign paused') },
    onError: () => toast.error('Failed to pause'),
  })
  const archiveMut = useMutation({
    mutationFn: (id: number) => dripService.archiveCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaigns'] }); toast.success('Campaign archived') },
    onError: () => toast.error('Failed to archive'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: number) => dripService.deleteCampaign(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['drip-campaigns'] }); toast.success('Campaign deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  const campaigns = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="h-full flex flex-col">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Zap size={20} className="text-indigo-500" />
              Drip Campaigns
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Automated multi-step email &amp; SMS sequences</p>
          </div>
          <button onClick={() => navigate('/crm/drip-campaigns/create')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 shadow-sm transition-all hover:shadow">
            <Plus size={16} /> New Campaign
          </button>
        </div>

        {/* Status Tabs + Search */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {STATUS_TABS.map(t => {
              const isActive = statusFilter === t.value
              const Icon = t.icon
              return (
                <button key={t.value}
                  onClick={() => { setStatusFilter(t.value); setPage(1) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}>
                  <Icon size={13} /> {t.label}
                </button>
              )
            })}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search campaigns..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 w-56" />
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3">
              <Zap size={24} className="text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No drip campaigns yet</p>
            <p className="text-xs text-slate-400 mb-4 max-w-xs">Create your first automated campaign to engage leads with multi-step email &amp; SMS sequences.</p>
            <button onClick={() => navigate('/crm/drip-campaigns/create')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
              <Plus size={15} /> Create Campaign
            </button>
          </div>
        ) : (
          <>
            {/* Campaign Cards */}
            <div className="grid gap-3">
              {campaigns.map((c: DripCampaign) => {
                const status = STATUS_BADGE[c.status] || STATUS_BADGE.draft
                const ch = CHANNEL_LABEL[c.channel] || CHANNEL_LABEL.email
                const ChIcon = ch.icon
                const stats = c.stats as Record<string, number> | undefined
                return (
                  <div key={c.id}
                    className="bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => navigate(`/crm/drip-campaigns/${c.id}`)}>
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Status dot + Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5 mb-1">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${status.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                            {c.status}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${ch.color}`}>
                            <ChIcon size={12} /> {ch.label}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-800 truncate">{c.name}</h3>
                        {c.description && <p className="text-xs text-slate-400 truncate mt-0.5">{c.description as string}</p>}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-5 text-center shrink-0">
                        <div>
                          <div className="text-xs font-bold text-slate-700">{c.steps_count ?? 0}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Steps</div>
                        </div>
                        <div className="w-px h-8 bg-slate-100" />
                        <div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <Users size={11} className="text-slate-400" /> {stats?.enrolled ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Enrolled</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <Send size={11} className="text-slate-400" /> {stats?.total_sent ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Sent</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-700 flex items-center justify-center gap-0.5">
                            <Eye size={11} className="text-slate-400" /> {stats?.total_opened ?? 0}
                          </div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Opened</div>
                        </div>
                      </div>

                      {/* Date + Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 w-20 text-right">
                          {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>

                        <button
                          ref={el => { menuBtnRefs.current[c.id] = el }}
                          onClick={e => { e.stopPropagation(); openMenu(c.id) }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2">
                <span className="text-xs text-slate-400">
                  Showing {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of {total}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const p = i + 1
                    return (
                      <button key={p} onClick={() => setPage(p)}
                        className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
                          page === p ? 'bg-indigo-600 text-white' : 'hover:bg-slate-50 text-slate-600'
                        }`}>
                        {p}
                      </button>
                    )
                  })}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                    className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed-position action menu (portalled outside scroll container) */}
      {menuOpen !== null && (() => {
        const c = campaigns.find((x: DripCampaign) => x.id === menuOpen)
        if (!c) return null
        return (
          <div className="fixed inset-0 z-[9999]" onClick={() => setMenuOpen(null)}>
            <div
              className="fixed bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 w-[170px]"
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => { navigate(`/crm/drip-campaigns/${c.id}/edit`); setMenuOpen(null) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                <Edit3 size={13} /> Edit
              </button>
              <button onClick={() => { duplicateMut.mutate(c.id); setMenuOpen(null) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                <Copy size={13} /> Duplicate
              </button>
              {c.status === 'draft' || c.status === 'paused' ? (
                <button onClick={() => { activateMut.mutate(c.id); setMenuOpen(null) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-2.5 text-emerald-600">
                  <Play size={13} /> Activate
                </button>
              ) : c.status === 'active' ? (
                <button onClick={() => { pauseMut.mutate(c.id); setMenuOpen(null) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center gap-2.5 text-amber-600">
                  <Pause size={13} /> Pause
                </button>
              ) : null}
              <button onClick={() => { navigate(`/crm/drip-campaigns/${c.id}`); setMenuOpen(null) }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-700">
                <BarChart3 size={13} /> Analytics
              </button>
              {c.status !== 'archived' && (
                <button onClick={() => { archiveMut.mutate(c.id); setMenuOpen(null) }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2.5 text-slate-500">
                  <Archive size={13} /> Archive
                </button>
              )}
              <hr className="my-1.5 border-slate-100" />
              <button onClick={() => { if (confirm('Delete this campaign?')) { deleteMut.mutate(c.id); setMenuOpen(null) } }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 flex items-center gap-2.5 text-red-500">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
