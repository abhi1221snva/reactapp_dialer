import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Loader2, Check, Building2, Phone, Mail, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { RowActions } from '../../components/ui/RowActions'
import type { Lender } from '../../types/crm.types'
import { confirmDelete } from '../../utils/confirmDelete'

const LENDER_API_TYPES = [
  { value: 'ondeck',            label: 'OnDeck' },
  { value: 'credibly',          label: 'Credibly' },
  { value: 'cancapital',        label: 'CAN Capital' },
  { value: 'lendini',           label: 'Lendini' },
  { value: 'forward_financing', label: 'Forward Financing' },
  { value: 'bitty_advance',     label: 'Bitty Advance' },
  { value: 'fox_partner',       label: 'Fox Partner' },
  { value: 'specialty',         label: 'Specialty' },
  { value: 'biz2credit',        label: 'Biz2Credit' },
]

export function CrmLenders() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { setDescription, setActions } = useCrmHeader()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['lenders', page],
    queryFn: async () => {
      const res = await crmService.getLenders({ page, per_page: 25 })
      return res.data
    },
    staleTime: 30 * 1000,
  })

  const lenders: Lender[] = data?.data?.data ?? data?.data ?? data?.records ?? data ?? []
  const total: number = data?.data?.total ?? data?.total ?? 0
  const totalPages = data?.data?.last_page ?? data?.last_page ?? (Math.ceil(total / 25) || 1)

  useEffect(() => {
    setDescription(isLoading ? 'Loading...' : `${total.toLocaleString()} lenders`)
    setActions(
      <button
        onClick={() => navigate('/crm/lenders/create')}
        className="btn-primary flex items-center gap-2"
      >
        <Plus size={15} /> Add Lender
      </button>
    )
    return () => { setDescription(undefined); setActions(undefined) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, total])

  const toggleMutation = useMutation({
    mutationFn: (l: Lender) => crmService.toggleLender(l.id, Number(l.status) === 1 ? 0 : 1),
    onSuccess: () => { toast.success('Lender updated'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteLender(id),
    onSuccess: () => { toast.success('Lender deleted'); qc.invalidateQueries({ queryKey: ['lenders'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  return (
    <div className="space-y-5">
      <div className="table-wrapper">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                {['Lender', 'Contact', 'Location', 'API', 'Status', 'Action'].map(h => (
                  <th key={h} className={h === 'Action' ? 'text-right' : ''}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="py-12"><div className="flex justify-center"><Loader2 size={20} className="animate-spin text-indigo-500" /></div></td></tr>
              ) : lenders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12">
                    <div className="text-center">
                      <Building2 size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm text-slate-400">No lenders added yet</p>
                    </div>
                  </td>
                </tr>
              ) : lenders.map(l => {
                const apiType = LENDER_API_TYPES.find(t => t.value === l.lender_api_type)
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50">
                          <Building2 size={15} className="text-indigo-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{l.lender_name}</p>
                          {l.email && (
                            <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                              <Mail size={10} /> {l.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {l.contact_person && <p className="text-sm text-slate-700">{l.contact_person}</p>}
                      {l.phone && (
                        <p className="text-xs flex items-center gap-1 mt-0.5 text-slate-400">
                          <Phone size={10} /> {l.phone}
                        </p>
                      )}
                    </td>
                    <td className="text-slate-500">
                      {[l.city, l.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td>
                      {String(l.api_status) === '1' && apiType ? (
                        <span className="badge badge-indigo flex items-center gap-1 w-fit">
                          <Zap size={10} /> {apiType.label}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleMutation.mutate(l)}
                        className={Number(l.status) === 1
                          ? 'badge badge-green hover:opacity-80 transition-opacity'
                          : 'badge badge-gray hover:opacity-80 transition-opacity'
                        }
                      >
                        {Number(l.status) === 1 ? <><Check size={10} /> Active</> : 'Inactive'}
                      </button>
                    </td>
                    <td className="w-px whitespace-nowrap">
                      <RowActions actions={[
                        {
                          label: 'Edit',
                          icon: <Pencil size={13} />,
                          variant: 'edit',
                          onClick: () => navigate(`/crm/lenders/${l.id}/edit`),
                        },
                        {
                          label: 'Delete',
                          icon: <Trash2 size={13} />,
                          variant: 'delete',
                          onClick: async () => { if (await confirmDelete(l.lender_name)) deleteMutation.mutate(l.id) },
                          disabled: deleteMutation.isPending,
                        },
                      ]} />
                    </td>
                  </tr>
                )
              })}
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
    </div>
  )
}
