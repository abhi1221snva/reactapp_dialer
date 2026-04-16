import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Phone, Mail, Pencil, Trash2, Users,
  Link2, Copy, Check, ExternalLink, X, Loader2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ServerDataTable, type Column } from '../../components/ui/ServerDataTable'
import { Badge } from '../../components/ui/Badge'
import { leadService } from '../../services/lead.service'
import { initials, formatPhoneNumber } from '../../utils/format'
import { useServerTable } from '../../hooks/useServerTable'
import { cn } from '../../utils/cn'
import { confirmDelete } from '../../utils/confirmDelete'
import { RowActions } from '../../components/ui/RowActions'
import api from '../../api/axios'

const AVATAR_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
]
function avatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length] }

interface Lead {
  id: number
  phone_number: string
  first_name?: string
  last_name?: string
  email?: string
  lead_status?: string
  city?: string
  state?: string
  [key: string]: unknown
}

interface MyAffiliateLink {
  affiliate_code: string | null
  affiliate_url: string | null
  has_code: boolean
}

// ── Affiliate Link Modal ───────────────────────────────────────────────────────
function AffiliateLinkModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-affiliate-link'],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: MyAffiliateLink }>('/crm/affiliate/my-link')
      return res.data?.data
    },
  })

  const url = data?.affiliate_url ?? ''

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
                Go to <strong className="text-slate-600">Partners → Affiliate Links</strong> to generate your personal referral code.
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Link display */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Your Affiliate Link
                </label>
                <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 group">
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

// ── CRM Leads Page ─────────────────────────────────────────────────────────────
export function CrmLeads() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ defaultLimit: 20 })
  const [showAffiliateModal, setShowAffiliateModal] = useState(false)

  const { data: statusesData } = useQuery({
    queryKey: ['lead-statuses'],
    queryFn: () => leadService.getLeadStatuses(),
    staleTime: 5 * 60 * 1000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => leadService.delete(id),
    onSuccess: () => { toast.success('Lead deleted'); qc.invalidateQueries({ queryKey: ['leads'] }) },
    onError: () => toast.error('Failed to delete lead'),
  })

  const statuses: Array<{ id: number; lead_status: string; status?: string | number }> =
    (statusesData?.data?.data || statusesData?.data || [])
      .filter((s: { status?: string | number }) => String(s.status ?? '1') === '1')

  const statusFilterOptions = statuses.map((s: { id: number; lead_status: string }) => ({
    value: s.lead_status,
    label: s.lead_status,
  }))

  const columns: Column<Lead>[] = [
    {
      key: 'name', header: 'Contact', sortable: true,
      sortValue: (row) => [row.first_name, row.last_name].filter(Boolean).join(' ').toLowerCase() || 'unknown',
      render: (row) => {
        const name = [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Unknown'
        return (
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-9 h-9 rounded-xl bg-gradient-to-br text-white text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-sm',
              avatarColor(row.id)
            )}>
              {initials(name)}
            </div>
            <button onClick={() => navigate(`/crm/${row.id}`)} className="text-left">
              <p className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors">{name}</p>
              {(row.city || row.state) && (
                <p className="text-xs text-slate-400">{[row.city, row.state].filter(Boolean).join(', ')}</p>
              )}
            </button>
          </div>
        )
      },
    },
    {
      key: 'phone_number', header: 'Phone',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Phone size={12} className="text-slate-400 flex-shrink-0" />
          {formatPhoneNumber(row.phone_number)}
        </div>
      ),
    },
    {
      key: 'email', header: 'Email',
      render: (row) => row.email ? (
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Mail size={12} className="text-slate-400 flex-shrink-0" />
          <span className="truncate max-w-[160px]">{row.email as string}</span>
        </div>
      ) : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      key: 'lead_status', header: 'Status',
      render: (row) => row.lead_status
        ? <Badge variant="blue" className="capitalize">{row.lead_status as string}</Badge>
        : <Badge variant="gray">New</Badge>,
    },
    {
      key: 'actions', header: 'Action',
      headerClassName: 'text-right',
      className: 'w-px whitespace-nowrap',
      render: (row) => (
        <RowActions actions={[
          {
            label: 'Edit',
            icon: <Pencil size={13} />,
            variant: 'edit',
            onClick: () => navigate(`/crm/${row.id}/edit`),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={13} />,
            variant: 'delete',
            onClick: async () => { if (await confirmDelete()) deleteMutation.mutate(row.id) },
            disabled: deleteMutation.isPending,
          },
        ]} />
      ),
    },
  ]

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">CRM Leads</h1>
          <p className="page-subtitle">Manage contacts and prospects</p>
        </div>
      </div>

      <ServerDataTable<Lead>
        queryKey={['leads']}
        queryFn={(params) => leadService.list(params)}
        dataExtractor={(res: unknown) => {
          const r = res as { data?: { data?: Lead[] } }
          return r?.data?.data ?? []
        }}
        totalExtractor={(res: unknown) => {
          const r = res as { data?: { record_count?: number } }
          return r?.data?.record_count ?? 0
        }}
        columns={columns}
        searchPlaceholder="Search by name, phone, email…"
        filters={
          statusFilterOptions.length > 0
            ? [{ key: 'lead_status', label: 'All Status', options: statusFilterOptions }]
            : []
        }
        emptyText="No leads found"
        emptyIcon={<Users size={40} />}
        search={table.search}
        onSearchChange={table.setSearch}
        activeFilters={table.filters}
        onFilterChange={table.setFilter}
        onResetFilters={table.resetFilters}
        hasActiveFilters={table.hasActiveFilters}
        page={table.page}
        limit={table.limit}
        onPageChange={table.setPage}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAffiliateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              <Link2 size={14} /> Affiliate Link
            </button>
            <button onClick={() => navigate('/crm/create')} className="btn-success">
              <Plus size={15} /> Add Lead
            </button>
          </div>
        }
      />

      {showAffiliateModal && (
        <AffiliateLinkModal onClose={() => setShowAffiliateModal(false)} />
      )}
    </div>
  )
}
