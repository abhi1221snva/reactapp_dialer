import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'

interface Props {
  listId: number
  onClose: () => void
}

export function ListEditModal({ listId, onClose }: Props) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState<number>(0)
  const [newCampaignId, setNewCampaignId] = useState<number>(0)

  const { data, isLoading } = useQuery({
    queryKey: ['list-detail', String(listId)],
    queryFn: () => listService.getById(listId),
  })

  const { data: campaignsData } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => campaignService.getAll(),
  })

  const rawData = (data as { data?: { data?: unknown } })?.data?.data
  const list = rawData && typeof rawData === 'object' && !Array.isArray(rawData)
    ? rawData as Record<string, unknown>
    : null

  const campaigns: Array<{ id: number; title?: string; campaign_name?: string }> =
    (campaignsData as { data?: { data?: unknown[] } })?.data?.data as Array<{ id: number; title?: string; campaign_name?: string }> ?? []

  useEffect(() => {
    if (list) {
      setTitle((list.l_title ?? list.title ?? '') as string)
      const cid = Number(list.campaign_id ?? 0)
      setCampaignId(cid)
      setNewCampaignId(cid)
    }
  }, [list])

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        list_id: listId,
        campaign_id: campaignId || 0,
        title: title.trim(),
      }
      if (newCampaignId && newCampaignId !== campaignId) {
        payload.new_campaign_id = newCampaignId
      }
      return listService.update(payload)
    },
    onSuccess: () => {
      toast.success('List updated')
      qc.invalidateQueries({ queryKey: ['lists'] })
      qc.invalidateQueries({ queryKey: ['list-detail', String(listId)] })
      onClose()
    },
    onError: () => toast.error('Failed to update list'),
  })

  const isValid = title.trim().length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Edit List</h2>
            <p className="text-xs text-slate-500 mt-0.5">List #{listId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              <div className="skeleton h-5 w-24 rounded" />
              <div className="skeleton h-10 w-full rounded-xl" />
              <div className="skeleton h-5 w-20 rounded mt-3" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ) : (
            <>
              <div className="form-group">
                <label className="label">List Name <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="List name"
                  autoFocus
                />
              </div>

              {campaigns.length > 0 && (
                <div className="form-group">
                  <label className="label">Campaign</label>
                  <select
                    className="input"
                    value={newCampaignId}
                    onChange={e => setNewCampaignId(Number(e.target.value))}
                  >
                    <option value={0}>— Select Campaign —</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title || c.campaign_name}
                      </option>
                    ))}
                  </select>
                  {newCampaignId !== campaignId && campaignId > 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      This will move the list to the selected campaign.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <button onClick={onClose} className="btn-outline flex-1">
            Cancel
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!isValid || saveMutation.isPending || isLoading}
            className="btn-primary flex-1"
          >
            <Save size={14} />
            {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
