import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ringlessService } from '../../services/ringless.service'
import { CampaignListsSection } from '../campaigns/CampaignListsSection'

export function RinglessEditLists() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const campaignId = Number(id)

  const { data: campaignData } = useQuery({
    queryKey: ['ringless-campaign', campaignId],
    queryFn: () => ringlessService.getById(campaignId),
    enabled: Boolean(campaignId),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (campaignData as any)?.data?.data ?? (campaignData as any)?.data ?? {}
  const campaignTitle = raw?.title

  const goToReview = () => navigate(`/ringless/${campaignId}/review`)

  return (
    <div className="w-full animate-fadeIn space-y-5">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(`/ringless/${campaignId}/edit`)}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm flex-shrink-0">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-none">Manage Lists</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {campaignTitle ? `${campaignTitle} — ` : ''}Ringless Campaign #{campaignId}
            </p>
          </div>
        </div>
        <button type="button" onClick={goToReview}
          className="btn-primary px-6">
          Next: Review
          <ArrowRight size={15} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">1</span>
          Details
          <CheckCircle2 size={13} className="text-emerald-500" />
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">2</span>
          Manage Lead Lists
        </span>
        <span className="w-6 h-px bg-slate-200" />
        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold">3</span>
          Review & Update
        </span>
      </div>

      {/* Lead Lists Management */}
      <CampaignListsSection campaignId={campaignId} onListsUpdated={goToReview} />
    </div>
  )
}
