import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { listService } from '../../services/list.service'
import { campaignService } from '../../services/campaign.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { SearchableSelect } from '../../components/ui/SearchableSelect'

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
    mutationFn: async () => {
      // Confirm campaign move
      if (newCampaignId && newCampaignId !== campaignId && campaignId > 0) {
        const targetName = campaigns.find(c => c.id === newCampaignId)?.title
          || campaigns.find(c => c.id === newCampaignId)?.campaign_name
          || `Campaign #${newCampaignId}`
        if (!window.confirm(`Move this list to "${targetName}"? This cannot be undone.`)) {
          throw new Error('')
        }
      }
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
    onError: (err: Error) => {
      if (err.message) toast.error(err.message)
    },
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
            <SearchableSelect
              options={campaigns.map(c => ({ value: String(c.id), label: c.title || c.campaign_name || `Campaign #${c.id}` }))}
              value={String(newCampaignId)}
              onChange={v => setNewCampaignId(Number(v))}
              placeholder="Search campaigns…"
              emptyLabel="— Select Campaign —"
              className="input"
            />
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
