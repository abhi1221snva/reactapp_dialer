import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Search, SlidersHorizontal, Loader2, X,
  Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Link2, Copy, Check, ExternalLink, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { leadService } from '../../services/lead.service'
import { LeadStatusBadge } from '../../components/crm/LeadStatusBadge'
import { BulkActionsBar } from '../../components/crm/BulkActionsBar'
import { LeadSearchFilters, Filters, EMPTY_FILTERS } from '../../components/crm/LeadSearchFilters'
import { RowActions } from '../../components/ui/RowActions'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { formatPhoneNumber } from '../../utils/format'
import { confirmDelete } from '../../utils/confirmDelete'
import { cn } from '../../utils/cn'
import { useAuth } from '../../hooks/useAuth'
import { LEVELS } from '../../utils/permissions'
import type { CrmLead, CrmSearchParams } from '../../types/crm.types'
import api from '../../api/axios'
import { PdfUploadModal } from './PdfUploadModal'

// ── Constants ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']
const PER_PAGE_OPTIONS = [10, 25, 50, 100]

// ── URL helpers ────────────────────────────────────────────────────────────────

function parseFiltersFromUrl(sp: URLSearchParams): Filters {
  return {
    lead_status:   sp.getAll('status'),
    assigned_to:   sp.get('agent_id')      || '',
    date_from:     sp.get('date_from')     || '',
    date_to:       sp.get('date_to')       || '',
    lead_type:     sp.get('lead_type')     || '',
    company_name:  sp.get('company_name')  || '',
    phone_number:  sp.get('phone_number')  || '',
    email:         sp.get('email')         || '',
    industry_type: sp.get('industry_type') || '',
  }
}

function filtersToSearchParams(f: Filters): URLSearchParams {
  const sp = new URLSearchParams()
  f.lead_status.forEach(s => sp.append('status', s))
  if (f.assigned_to)   sp.set('agent_id',      f.assigned_to)
  if (f.date_from)     sp.set('date_from',      f.date_from)
  if (f.date_to)       sp.set('date_to',        f.date_to)
  if (f.lead_type)     sp.set('lead_type',      f.lead_type)
  if (f.company_name)  sp.set('company_name',   f.company_name)
  if (f.phone_number)  sp.set('phone_number',   f.phone_number)
  if (f.email)         sp.set('email',          f.email)
  if (f.industry_type) sp.set('industry_type',  f.industry_type)
  return sp
}

// ── Affiliate Link Modal ───────────────────────────────────────────────────────

interface MyAffiliateLink {
  affiliate_code: string | null
  affiliate_url: string | null
  has_code: boolean
}

function AffiliateLinkModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-affiliate-link'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: MyAffiliateLink }>('/crm/affiliate/my-link')
      return res.data?.data
    },
  })

  const { data: companyData } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: { website_url: string | null; company_domain: string | null } }>('/crm/company-settings')
      return res.data?.data
    },
    staleTime: 5 * 60 * 1000,
  })

  const generateMutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; data: { affiliate_code: string; affiliate_url: string } }>('/crm/affiliate/generate-code', {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-affiliate-link'] })
      toast.success('Affiliate code generated!')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to generate code')
    },
  })

  // Build URL: prefer backend-provided url, fallback to company website_url + code
  const websiteUrl = companyData?.website_url || companyData?.company_domain || ''
  const affiliateCode = data?.affiliate_code ?? ''
  const url = data?.affiliate_url
    || (websiteUrl && affiliateCode ? `${websiteUrl.replace(/\/$/, '')}/apply/${affiliateCode}` : '')

  async function handleCopy() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Link copied to clipboard!')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md mx-4 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
              <Link2 size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">Affiliate Link</p>
              <p className="text-xs text-slate-400">Share to track leads from your referrals</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Loading your link…</span>
            </div>
          ) : !data?.has_code ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
                <Link2 size={24} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700">No affiliate code yet</p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                Generate your personal referral code to start tracking leads.
              </p>
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-sm disabled:opacity-60"
              >
                {generateMutation.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                  : <><Link2 size={14} /> Generate Affiliate Code</>
                }
              </button>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Link display */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Your Affiliate Link
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200">
                  <Link2 size={13} className="text-slate-400 flex-shrink-0" />
                  <p className="flex-1 text-sm font-medium text-slate-800 truncate select-all">{url}</p>
                </div>
              </div>

              {/* Affiliate code pill */}
              {data.affiliate_code && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                  <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wide">Code</span>
                  <div className="w-px h-3.5 bg-indigo-200" />
                  <code className="text-sm font-bold text-indigo-700 tracking-wide">{data.affiliate_code}</code>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-[0.97] ${
                    copied
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  {copied
                    ? <><Check size={14} /> Copied!</>
                    : <><Copy size={14} /> Copy Link</>
                  }
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-[0.97]"
                >
                  <ExternalLink size={14} /> Open Form
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({
  page, totalPages, total, perPage, onPageChange,
}: {
  page: number; totalPages: number; total: number; perPage: number; onPageChange: (p: number) => void
}) {
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to   = Math.min(page * perPage, total)

  const pages = (() => {
    const delta = 2
    const range: (number | '...')[] = []
    let prev = 0
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - delta && p <= page + delta)) {
        if (prev && p - prev > 1) range.push('...')
        range.push(p)
        prev = p
      }
    }
    return range
  })()

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-white">
      <span className="text-xs text-slate-500">
        {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()} leads`}
      </span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPageChange(1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="First">
          <ChevronsLeft size={13} />
        </button>
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Previous">
          <ChevronLeft size={13} />
        </button>
        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={cn(
                'min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors',
                p === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              {p}
            </button>
          )
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Next">
          <ChevronRight size={13} />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={page >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors" title="Last">
          <ChevronsRight size={13} />
        </button>
      </div>
    </div>
  )
}

// ── CrmLeadsList ───────────────────────────────────────────────────────────────

export function CrmLeadsList() {
  const navigate                        = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc                              = useQueryClient()
  const { setDescription, setActions, headerKey }  = useCrmHeader()
  const tableRef                        = useRef<HTMLDivElement>(null)

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)
  const [perPage, setPerPage]         = useState(25)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(() => parseFiltersFromUrl(searchParams))
  const [showFilters, setShowFilters]           = useState(false)
  const [selectedIds, setSelectedIds]           = useState<number[]>([])
  const [showAffiliateModal, setShowAffiliateModal] = useState(false)
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()
  const { user } = useAuth()
  const showAssigned = (user?.level ?? 1) >= LEVELS.MANAGER

  // ── Lookups ──────────────────────────────────────────────────────────────────

  const { data: statusesData } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn:  () => crmService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['crm-users'],
    queryFn:  () => crmService.getUsers(),
    staleTime: 5 * 60 * 1000,
  })

  const statuses = statusesData ?? []
  const agents   = usersData   ?? []

  // Map lead_title_url → status object (for badge colors + names)
  const statusMap = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.lead_title_url, s])),
    [statuses],
  )

  // ── Data fetch ───────────────────────────────────────────────────────────────

  const buildParams = (): CrmSearchParams => ({
    search:        search || undefined,
    lead_status:   appliedFilters.lead_status.length ? appliedFilters.lead_status : undefined,
    assigned_to:   appliedFilters.assigned_to ? [Number(appliedFilters.assigned_to)] : undefined,
    date_from:     appliedFilters.date_from || undefined,
    date_to:       appliedFilters.date_to   || undefined,
    lead_type:     appliedFilters.lead_type     || undefined,
    company_name:  appliedFilters.company_name  || undefined,
    phone_number:  appliedFilters.phone_number  || undefined,
    email:         appliedFilters.email         || undefined,
    industry_type: appliedFilters.industry_type || undefined,
    lower_limit:   (page - 1) * perPage,
    upper_limit:   perPage,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['crm-leads-search', search, appliedFilters, page, perPage],
    queryFn:  async () => {
      const res = await crmService.searchLeads(buildParams())
      return res.data?.data ?? res.data
    },
    placeholderData: prev => prev,
  })

  const leads: CrmLead[] = data?.records ?? data?.data ?? data?.items ?? data?.leads ?? []
  const total: number    = data?.pagination?.total ?? data?.total ?? 0
  const totalPages       = Math.max(1, data?.pagination?.last_page ?? Math.ceil(total / perPage))

  // ── Delete ───────────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: () => {
      toast.success('Lead deleted')
      qc.invalidateQueries({ queryKey: ['crm-leads-search'] })
    },
    onError: () => toast.error('Failed to delete lead'),
  })

  const handleDelete = async (id: number) => {
    const ok = await confirmDelete('this lead')
    if (ok) deleteMutation.mutate(id)
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearch(value)
      setPage(1)
    }, 300)
  }, [])

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  // ── Apply filters (from drawer) ───────────────────────────────────────────────

  const handleApplyFilters = useCallback((f: Filters) => {
    setAppliedFilters(f)
    setPage(1)
    setSearchParams(filtersToSearchParams(f), { replace: true })
    setTimeout(() => {
      tableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [setSearchParams])

  // ── Remove individual chip ────────────────────────────────────────────────────

  const removeChip = (patch: Partial<Filters>) => {
    handleApplyFilters({ ...appliedFilters, ...patch })
  }

  // ── Selection ────────────────────────────────────────────────────────────────

  // Clear selection when page/search/filters change (stale IDs from other pages)
  useEffect(() => { setSelectedIds([]) }, [page, search, appliedFilters, perPage])

  const currentPageIds = useMemo(() => new Set(leads.map(l => l.id)), [leads])

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const allOnPageSelected = leads.length > 0 && leads.every(l => selectedIds.includes(l.id))
  const someOnPageSelected = leads.length > 0 && leads.some(l => selectedIds.includes(l.id)) && !allOnPageSelected

  const selectAllRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someOnPageSelected
  }, [someOnPageSelected])

  const toggleAll = () => {
    if (allOnPageSelected) {
      // Deselect all on current page
      setSelectedIds(prev => prev.filter(id => !currentPageIds.has(id)))
    } else {
      // Select all on current page (merge with existing selections)
      setSelectedIds(prev => {
        const set = new Set(prev)
        leads.forEach(l => set.add(l.id))
        return Array.from(set)
      })
    }
  }

  // ── Active filter count ───────────────────────────────────────────────────────

  const activeFilterCount = [
    appliedFilters.lead_status.length > 0,
    !!appliedFilters.assigned_to,
    !!appliedFilters.date_from,
    !!appliedFilters.date_to,
    !!appliedFilters.lead_type,
    !!appliedFilters.company_name,
    !!appliedFilters.phone_number,
    !!appliedFilters.email,
    !!appliedFilters.industry_type,
  ].filter(Boolean).length

  // ── Filter chips (active filters row) ────────────────────────────────────────

  type Chip = { key: string; label: string; onRemove: () => void }

  const filterChips = useMemo<Chip[]>(() => {
    const chips: Chip[] = []

    appliedFilters.lead_status.forEach(slug => {
      const s = statusMap[slug] as (typeof statuses[number] & Record<string, unknown>) | undefined
      chips.push({
        key:      `status_${slug}`,
        label:    `Status: ${s?.lead_title ?? slug}`,
        onRemove: () => removeChip({ lead_status: appliedFilters.lead_status.filter(x => x !== slug) }),
      })
    })

    if (appliedFilters.assigned_to) {
      const agent = agents.find(a => String(a.id) === appliedFilters.assigned_to)
      chips.push({
        key:      'assigned_to',
        label:    `Agent: ${agent?.name ?? appliedFilters.assigned_to}`,
        onRemove: () => removeChip({ assigned_to: '' }),
      })
    }

    if (appliedFilters.date_from || appliedFilters.date_to) {
      const from = appliedFilters.date_from || '…'
      const to   = appliedFilters.date_to   || '…'
      chips.push({
        key:      'date',
        label:    `Date: ${from} – ${to}`,
        onRemove: () => removeChip({ date_from: '', date_to: '' }),
      })
    }

    if (appliedFilters.lead_type) {
      chips.push({
        key:      'lead_type',
        label:    `Type: ${appliedFilters.lead_type.charAt(0).toUpperCase() + appliedFilters.lead_type.slice(1)}`,
        onRemove: () => removeChip({ lead_type: '' }),
      })
    }

    if (appliedFilters.company_name) {
      chips.push({
        key:      'company_name',
        label:    `Company: ${appliedFilters.company_name}`,
        onRemove: () => removeChip({ company_name: '' }),
      })
    }

    if (appliedFilters.phone_number) {
      chips.push({
        key:      'phone_number',
        label:    `Phone: ${appliedFilters.phone_number}`,
        onRemove: () => removeChip({ phone_number: '' }),
      })
    }

    if (appliedFilters.email) {
      chips.push({
        key:      'email',
        label:    `Email: ${appliedFilters.email}`,
        onRemove: () => removeChip({ email: '' }),
      })
    }

    if (appliedFilters.industry_type) {
      chips.push({
        key:      'industry_type',
        label:    `Industry: ${appliedFilters.industry_type}`,
        onRemove: () => removeChip({ industry_type: '' }),
      })
    }

    return chips
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, statusMap, agents])

  // ── Header (CrmLayout) — hide layout title, we render our own inline ──────
  useEffect(() => {
    setDescription(undefined)
    setActions(undefined)
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerKey])

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Compact header toolbar ─────────────────────────────────────────── */}
      <div className="lt">
        {/* Title + count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginRight: 4 }}>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>Leads</h1>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, background: '#f1f5f9', padding: '1px 7px', borderRadius: 8, lineHeight: '16px' }}>
            {isLoading ? '…' : total.toLocaleString()}
          </span>
        </div>

        {/* Search */}
        <div className="lt-search">
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none', zIndex: 1 }} />
          <input
            type="text"
            value={searchInput}
            placeholder="Search name, email, phone…"
            onChange={e => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8', display: 'flex' }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`lt-b${activeFilterCount > 0 ? ' active' : ''}`}
        >
          <SlidersHorizontal size={12} />
          Filters
          {activeFilterCount > 0 && (
            <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 8, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Per-page selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>Show</span>
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="lt-sel"
          >
            {PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="lt-divider" />

        {/* Right group — Affiliate + Upload PDF + Add Lead */}
        <div className="lt-right">
          <button onClick={() => setShowAffiliateModal(true)} className="lt-b lt-og">
            <Link2 size={12} /> Affiliate
          </button>
          <button onClick={() => setShowPdfUploadModal(true)} className="lt-b lt-og">
            <FileText size={12} /> Upload PDF
          </button>
          <button onClick={() => navigate('/crm/leads/create')} className="lt-b lt-g">
            <Plus size={13} /> Add Lead
          </button>
        </div>
      </div>

      {/* Green accent line */}
      <div className="lt-accent lt-accent-green" />

      {/* ── Active filter chips ──────────────────────────────────────────────── */}
      {filterChips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5, paddingTop: 6 }}>
          {filterChips.map(chip => (
            <span
              key={chip.key}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 22, padding: '0 8px 0 10px', borderRadius: 11, background: '#eef2ff', border: '1px solid #c7d2fe', color: '#4338ca', fontSize: 10, fontWeight: 600 }}
            >
              {chip.label}
              <button
                onClick={chip.onRemove}
                style={{ width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: 0 }}
                title="Remove filter"
              >
                <X size={9} />
              </button>
            </span>
          ))}
          <button
            onClick={() => handleApplyFilters(EMPTY_FILTERS)}
            style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4, transition: 'color .12s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#94a3b8' }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Table card ──────────────────────────────────────────────────────── */}
      <div className="table-wrapper" ref={tableRef} style={{ marginTop: 8 }}>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="w-14 text-slate-400 font-medium">#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                {showAssigned && <th>Assigned</th>}
                <th>Created</th>
                <th className="w-12" />
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={showAssigned ? 10 : 9} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 size={22} className="animate-spin text-indigo-400" />
                      <span className="text-sm">Loading leads…</span>
                    </div>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={showAssigned ? 10 : 9} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Search size={28} className="opacity-30" />
                      <p className="text-sm font-medium">No leads found</p>
                      <p className="text-xs">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                leads.map(lead => {
                  const capitalize = (s: unknown) => s ? String(s).trim().replace(/\b\w/g, c => c.toUpperCase()) : ''
                  const name     = [capitalize(lead.first_name), capitalize(lead.last_name)].filter(Boolean).join(' ') || `Lead #${lead.id}`
                  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
                  const bg       = AVATAR_COLORS[lead.id % AVATAR_COLORS.length]
                  const selected = selectedIds.includes(lead.id)
                  const createdDate = lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'

                  return (
                    <tr
                      key={lead.id}
                      className={cn('cursor-pointer', selected && 'bg-indigo-50 hover:bg-indigo-50')}
                      onClick={() => navigate(`/crm/leads/${lead.id}`)}
                    >
                      {/* Checkbox */}
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded accent-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="text-slate-400 text-xs font-mono">
                        {lead.id}
                      </td>

                      {/* Name + Avatar */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                            style={{ background: bg }}
                          >
                            {initials}
                          </div>
                          <span className="font-medium text-slate-800 text-sm">{name}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="text-slate-500 text-xs">
                        {lead.email ? String(lead.email) : '—'}
                      </td>

                      {/* Phone */}
                      <td className="text-slate-700 text-xs">
                        {lead.phone_number ? formatPhoneNumber(String(lead.phone_number)) : '—'}
                      </td>

                      {/* Company */}
                      <td className="text-slate-500 text-xs">
                        {lead.company_name ? String(lead.company_name) : '—'}
                      </td>

                      {/* Status */}
                      <td>
                        {(() => {
                          const slug = String(lead.lead_status ?? '')
                          const s    = statusMap[slug] as (typeof statuses[number] & Record<string, unknown>) | undefined
                          return (
                            <LeadStatusBadge
                              status={slug}
                              statusName={s?.lead_title}
                              colorCode={(s?.color_code ?? s?.color) as string | undefined}
                              size="sm"
                            />
                          )
                        })()}
                      </td>

                      {/* Assigned */}
                      {showAssigned && (
                        <td className="text-slate-500 text-xs">
                          {(lead.assigned_name as string | undefined) ?? '—'}
                        </td>
                      )}

                      {/* Created date */}
                      <td className="text-slate-400 text-xs whitespace-nowrap">
                        {createdDate}
                      </td>

                      {/* Actions */}
                      <td onClick={e => e.stopPropagation()}>
                        <RowActions
                          actions={[
                            {
                              label: 'View Details',
                              icon:  <Eye size={13} />,
                              variant: 'view',
                              onClick: () => navigate(`/crm/leads/${lead.id}`),
                            },
                            {
                              label: 'Edit Lead',
                              icon:  <Pencil size={13} />,
                              variant: 'edit',
                              onClick: () => navigate(`/crm/leads/${lead.id}/edit`),
                            },
                            ...((user?.level ?? 1) >= LEVELS.ADMIN ? [{
                              label: 'Delete Lead',
                              icon:  <Trash2 size={13} />,
                              variant: 'delete' as const,
                              onClick: () => handleDelete(lead.id),
                            }] : []),
                          ]}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ──────────────────────────────────────────────────────── */}
        {totalPages >= 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            perPage={perPage}
            onPageChange={p => setPage(p)}
          />
        )}
      </div>

      {/* ── Bulk actions bar ─────────────────────────────────────────────────── */}
      <BulkActionsBar
        selectedIds={selectedIds}
        statuses={statuses}
        agents={agents}
        onClear={() => setSelectedIds([])}
        onRefresh={() => refetch()}
      />

      {/* ── Affiliate Link Modal ───────────────────────────────────��─────────── */}
      {showAffiliateModal && (
        <AffiliateLinkModal onClose={() => setShowAffiliateModal(false)} />
      )}

      {/* ── PDF Upload Modal ───────────────────────────────────────────────── */}
      {showPdfUploadModal && (
        <PdfUploadModal
          onClose={() => setShowPdfUploadModal(false)}
          onSuccess={(data) => {
            setShowPdfUploadModal(false)
            navigate('/crm/leads/create', { state: { prefillData: data } })
          }}
        />
      )}

      {/* ── Filter Drawer (slide-over) ───────────────────────────────────────── */}
      <LeadSearchFilters
        open={showFilters}
        filters={appliedFilters}
        onApply={handleApplyFilters}
        onClose={() => setShowFilters(false)}
        statuses={statuses}
        agents={agents}
      />
    </div>
  )
}
