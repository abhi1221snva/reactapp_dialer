import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, BarChart2, Copy, Trash2, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import type { AffiliateLink } from '../../types/crm.types'
import { showConfirm } from '../../utils/confirmDelete'

interface CreateForm {
  label: string
  extension_id: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
}

export function CrmAffiliateLinks() {
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [showCreate, setShowCreate] = useState(false)
  const [viewingStats, setViewingStats] = useState<AffiliateLink | null>(null)
  const [page, setPage] = useState(1)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>()

  const { data: rawData, isLoading, refetch } = useQuery({
    queryKey: ['crm-affiliate-links', page],
    queryFn: async () => {
      const res = await crmService.getAffiliateLinks({ page, per_page: 25 })
      return res.data?.data ?? res.data
    },
  })

  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['crm-affiliate-stats', viewingStats?.id],
    queryFn: async () => {
      const res = await crmService.getAffiliateLinkStats(viewingStats!.id)
      return res.data?.data ?? res.data
    },
    enabled: !!viewingStats,
  })

  const createMutation = useMutation({
    mutationFn: (form: CreateForm) =>
      crmService.createAffiliateLink({
        label: form.label || undefined,
        extension_id: form.extension_id,
        utm_source: form.utm_source || undefined,
        utm_medium: form.utm_medium || undefined,
        utm_campaign: form.utm_campaign || undefined,
      }),
    onSuccess: () => {
      toast.success('Affiliate link created')
      reset(); setShowCreate(false)
      qc.invalidateQueries({ queryKey: ['crm-affiliate-links'] })
    },
    onError: () => toast.error('Failed to create link'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => crmService.deactivateAffiliateLink(id),
    onSuccess: () => {
      toast.success('Link deactivated')
      refetch()
    },
    onError: () => toast.error('Failed to deactivate'),
  })

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Copied to clipboard'))
  }

  const links: AffiliateLink[] = rawData?.data ?? (Array.isArray(rawData) ? rawData : [])
  const totalPages: number = rawData?.last_page ?? 1

  useEffect(() => {
    setDescription(`${rawData?.total ?? links.length} links`)
    setActions(
      <button
        onClick={() => setShowCreate(true)}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={16} /> Create Link
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData?.total, links.length])

  return (
    <div className="space-y-5">

      {/* Create modal */}
      {showCreate && (
        <div className="modal-backdrop">
          <form
            onSubmit={handleSubmit(d => createMutation.mutate(d))}
            className="modal-card max-w-md p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">Create Affiliate Link</h3>
              <button type="button" onClick={() => { setShowCreate(false); reset() }} className="action-btn">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label">Label</label>
                <input {...register('label')} className="input w-full" placeholder="e.g. Facebook Campaign" />
              </div>
              <div>
                <label className="label">Extension ID <span className="text-red-500">*</span></label>
                <input {...register('extension_id', { required: 'Extension ID is required' })} className="input w-full" placeholder="1001" />
                {errors.extension_id && <p className="text-xs text-red-500 mt-1">{errors.extension_id.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-xs">UTM Source</label>
                  <input {...register('utm_source')} className="input w-full" placeholder="facebook" />
                </div>
                <div>
                  <label className="label-xs">UTM Medium</label>
                  <input {...register('utm_medium')} className="input w-full" placeholder="cpc" />
                </div>
              </div>
              <div>
                <label className="label-xs">UTM Campaign</label>
                <input {...register('utm_campaign')} className="input w-full" placeholder="summer2026" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button type="submit" disabled={createMutation.isPending} className="btn-primary text-sm disabled:opacity-50">
                {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); reset() }} className="btn-outline text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats modal */}
      {viewingStats && (
        <div className="modal-backdrop">
          <div className="modal-card max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-900">
                Stats: {viewingStats.label ?? viewingStats.token}
              </h3>
              <button onClick={() => setViewingStats(null)} className="action-btn">
                <X size={16} />
              </button>
            </div>
            {loadingStats ? (
              <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total Clicks', value: statsData?.total_clicks ?? viewingStats.total_clicks },
                    { label: 'Total Leads', value: statsData?.total_leads ?? viewingStats.total_leads },
                    { label: 'Conversion', value: `${statsData?.conversion_rate ?? 0}%` },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-3 text-center bg-slate-50 border border-slate-200">
                      <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <label className="label-xs">Full URL</label>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="flex-1 text-xs font-mono truncate text-slate-700">{viewingStats.full_path}</span>
                    <button onClick={() => copyUrl(viewingStats.full_path)} className="action-btn !p-1">
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-500" /></div>
      ) : links.length === 0 ? (
        <div className="table-wrapper py-16 text-center">
          <p className="text-sm text-slate-400">No affiliate links yet.</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-3 text-sm">Create your first link</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  {['Label', 'Token', 'Clicks', 'Leads', 'Status', 'Action'].map(h => (
                    <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {links.map(link => (
                  <tr key={link.id}>
                    <td>
                      <p className="font-medium text-slate-900">{link.label ?? '—'}</p>
                      {link.user_name && <p className="text-xs text-slate-400">{link.user_name}</p>}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono text-slate-700">{link.token}</code>
                        <button onClick={() => copyUrl(link.full_path)} className="action-btn !p-0.5">
                          <Copy size={11} />
                        </button>
                      </div>
                    </td>
                    <td className="text-slate-700">{link.total_clicks}</td>
                    <td className="text-slate-700">{link.total_leads}</td>
                    <td>
                      <span className={link.status ? 'badge badge-green' : 'badge badge-red'}>
                        {link.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="w-px whitespace-nowrap">
                      <RowActions actions={[
                        {
                          label: 'View Stats',
                          icon: <BarChart2 size={13} />,
                          variant: 'view',
                          onClick: () => setViewingStats(link),
                        },
                        {
                          label: 'Deactivate',
                          icon: <Trash2 size={13} />,
                          variant: 'delete',
                          onClick: async () => { if (await showConfirm({ message: 'Deactivate this link?', confirmText: 'Yes, deactivate' })) deactivateMutation.mutate(link.id) },
                          hidden: !link.status,
                          disabled: deactivateMutation.isPending,
                        },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="pagination-btn">Previous</button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="pagination-btn">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
