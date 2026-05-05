import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Loader2, ToggleLeft, ToggleRight, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { campaignService } from '../../services/campaign.service'
import { cn } from '../../utils/cn'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CampaignType {
  id: number
  title: string
  title_url: string
  status: string
  created_at?: string
  updated_at?: string
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function CampaignTypes() {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { data: typesData, isLoading } = useQuery({
    queryKey: ['campaign-types-all'],
    queryFn: () => campaignService.getTypesAll(),
  })

  const types: CampaignType[] =
    ((typesData as { data?: { data?: unknown[] } })?.data?.data as CampaignType[] ?? [])

  const toggleMutation = useMutation({
    mutationFn: (id: number) => campaignService.toggleTypeStatus(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-types-all'] })
      qc.invalidateQueries({ queryKey: ['campaign-types'] })
      toast.success('Status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const createMutation = useMutation({
    mutationFn: (data: { title: string; title_url: string; status: string }) =>
      campaignService.createType(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign-types-all'] })
      qc.invalidateQueries({ queryKey: ['campaign-types'] })
      toast.success('Campaign type created')
      setNewTitle('')
      setShowAdd(false)
    },
    onError: () => toast.error('Failed to create campaign type'),
  })

  const handleCreate = () => {
    const title = newTitle.trim()
    if (!title) {
      toast.error('Title is required')
      return
    }
    const title_url = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    createMutation.mutate({ title, title_url, status: '1' })
  }

  return (
    <div className="p-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Zap size={20} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Campaign Types</h1>
            <p className="text-sm text-slate-500">Manage dial modes available for campaigns</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add Type
        </button>
      </div>

      {/* Add new type form */}
      {showAdd && (
        <div className="mb-4 p-4 border border-slate-200 rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Enter campaign type name (e.g. Power Dial)"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Save'}
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewTitle('') }}
              className="px-4 py-2 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-500" />
          </div>
        ) : types.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Zap size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No campaign types found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Slug</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {types.map(type => {
                const isActive = type.status === '1'
                return (
                  <tr key={type.id} className="border-b border-slate-50 hover:bg-slate-25 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{type.id}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-900">{type.title}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 font-mono">{type.title_url}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={cn(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      )}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => toggleMutation.mutate(type.id)}
                        disabled={toggleMutation.isPending}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          isActive
                            ? 'text-red-600 hover:bg-red-50 border border-red-200'
                            : 'text-emerald-600 hover:bg-emerald-50 border border-emerald-200'
                        )}
                        title={isActive ? 'Deactivate — will hide from campaign dropdown' : 'Activate — will show in campaign dropdown'}
                      >
                        {isActive
                          ? <><ToggleRight size={16} /> Deactivate</>
                          : <><ToggleLeft size={16} /> Activate</>
                        }
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info note */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-xs text-amber-800">
          <strong>Note:</strong> Only campaign types with <strong>Active</strong> status will appear in the dial mode dropdown when creating or editing campaigns.
        </p>
      </div>
    </div>
  )
}
