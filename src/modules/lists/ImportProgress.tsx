import { useNavigate } from 'react-router-dom'
import { CheckCircle2, List, ArrowRight } from 'lucide-react'
import type { ImportResult } from './types'

interface Props {
  result: ImportResult
  listTitle: string
}

export function ImportProgress({ result, listTitle }: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col items-center text-center py-10 px-6 space-y-5">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Import Complete</h2>
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{listTitle}</span> was created successfully.
          </p>
        </div>

        {/* Stats */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-8 py-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{result.imported.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-0.5">Leads imported</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => navigate('/lists')}
            className="btn-outline flex items-center gap-2 text-xs px-4 py-2 h-auto"
          >
            <List size={14} />
            All Lists
          </button>
          <button
            onClick={() => navigate(`/lists/${result.list_id}/leads`)}
            className="btn-primary flex items-center gap-2 text-xs px-4 py-2 h-auto"
          >
            View Leads
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
