import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, RefreshCw, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { crmService } from '../../services/crm.service'
import type { MerchantPortal } from '../../types/crm.types'

interface Props {
  leadId: number
}

export function MerchantPortalSection({ leadId }: Props) {
  const qc = useQueryClient()
  const [revoking, setRevoking] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['merchant-portal', leadId],
    queryFn: async () => {
      try {
        const res = await crmService.getMerchantPortal(leadId)
        return (res.data?.data ?? null) as MerchantPortal | null
      } catch {
        return null
      }
    },
    retry: false,
    staleTime: 60_000,
  })

  const generateMutation = useMutation({
    mutationFn: () => crmService.generateMerchantPortal(leadId),
    onSuccess: () => {
      toast.success('Portal link generated')
      qc.invalidateQueries({ queryKey: ['merchant-portal', leadId] })
    },
    onError: () => toast.error('Failed to generate portal link'),
  })

  const revokeMutation = useMutation({
    mutationFn: (portalId: number) => crmService.revokeMerchantPortal(leadId, portalId),
    onSuccess: () => {
      toast.success('Portal link revoked')
      setRevoking(false)
      qc.invalidateQueries({ queryKey: ['merchant-portal', leadId] })
    },
    onError: () => toast.error('Failed to revoke portal link'),
  })

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success('Copied to clipboard'))
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: '#111827' }}>Merchant Portal</h3>
        {!isLoading && !data && (
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
            style={{ background: '#EEF2FF', color: '#4F46E5' }}
          >
            {generateMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
            Generate Link
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 size={16} className="animate-spin" style={{ color: '#6366F1' }} />
        </div>
      ) : !data ? (
        <p className="text-sm" style={{ color: '#9CA3AF' }}>No portal link generated yet.</p>
      ) : (
        <div>
          <div
            className="flex items-center gap-2 rounded-lg p-3 mb-3"
            style={{ background: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <p className="flex-1 text-sm font-mono truncate" style={{ color: '#374151' }}>
              {data.url}
            </p>
            <button onClick={() => copyUrl(data.url)} title="Copy URL" className="p-1 rounded hover:bg-gray-200">
              <Copy size={14} style={{ color: '#6B7280' }} />
            </button>
            <a href={data.url} target="_blank" rel="noreferrer" title="Open" className="p-1 rounded hover:bg-gray-200">
              <ExternalLink size={14} style={{ color: '#6B7280' }} />
            </a>
          </div>

          <div className="flex items-center gap-3 text-xs" style={{ color: '#9CA3AF' }}>
            <span>
              Status: <span className="font-medium" style={{ color: data.status ? '#10B981' : '#EF4444' }}>
                {data.status ? 'Active' : 'Inactive'}
              </span>
            </span>
            <span>· Accessed {data.access_count} times</span>
            {data.last_accessed_at && (
              <span>· Last: {new Date(data.last_accessed_at).toLocaleDateString()}</span>
            )}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
            >
              <RefreshCw size={12} /> Regenerate
            </button>

            {data.status === 1 && !revoking && (
              <button
                onClick={() => setRevoking(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium"
                style={{ borderColor: '#FECDD3', color: '#BE123C', background: '#FFF1F2' }}
              >
                <Trash2 size={12} /> Revoke
              </button>
            )}

            {revoking && (
              <div className="flex items-center gap-2 text-xs">
                <span style={{ color: '#374151' }}>Confirm revoke?</span>
                <button
                  onClick={() => revokeMutation.mutate(data.id)}
                  disabled={revokeMutation.isPending}
                  className="px-3 py-1.5 rounded-lg font-medium"
                  style={{ background: '#FEF2F2', color: '#DC2626' }}
                >
                  {revokeMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : 'Yes, Revoke'}
                </button>
                <button onClick={() => setRevoking(false)} className="px-2 py-1.5" style={{ color: '#6B7280' }}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
