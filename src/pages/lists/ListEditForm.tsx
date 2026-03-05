import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'

export function ListEditForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const listId = Number(id)

  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState<number>(0)
  const [newCampaignId, setNewCampaignId] = useState<number>(0)

  const { data, isLoading } = useQuery({
    queryKey: ['list-detail', id],
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
      navigate(`/lists/${id}`)
    },
    onError: () => toast.error('Failed to update list'),
  })

  if (isLoading) return <PageLoader />

  if (!list) {
    return (
      <div className="card text-center py-16 text-slate-400">
        <p>List not found</p>
        <button onClick={() => navigate('/lists')} className="btn-outline mt-3 mx-auto">Back to Lists</button>
      </div>
    )
  }

  const isValid = title.trim().length > 0

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/lists/${id}`)} className="btn-ghost p-2 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="page-title">Edit List</h1>
          <p className="page-subtitle">List #{id}</p>
        </div>
      </div>

      <div className="card space-y-5">
        <h3 className="font-semibold text-slate-900 border-b border-slate-100 pb-3">List Details</h3>

        <div className="form-group">
          <label className="label">List Name *</label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="List name"
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
      </div>

      <div className="flex gap-3">
        <button onClick={() => navigate(`/lists/${id}`)} className="btn-outline flex-1">
          Cancel
        </button>
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!isValid || saveMutation.isPending}
          className="btn-primary flex-1"
        >
          <Save size={16} />
          {saveMutation.isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}
