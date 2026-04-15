import { FileText, Maximize2, Copy, Check } from 'lucide-react'
import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { MOCK_SCRIPT } from '../mockData'
import type { StudioLead } from '../types'

interface Props {
  lead: StudioLead
}

export function AgentScriptTab({ lead }: Props) {
  const [copied, setCopied] = useState(false)

  const rendered = useMemo(() => {
    return MOCK_SCRIPT
      .replace(/\{\{first_name\}\}/g, lead.firstName)
      .replace(/\{\{last_name\}\}/g, lead.lastName)
      .replace(/\{\{company\}\}/g, lead.company)
      .replace(/\{\{agent_name\}\}/g, 'Priya')
  }, [lead])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(rendered)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
      toast.success('Script copied')
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <FileText size={14} className="text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Agent Script</h3>
            <p className="text-[11px] text-slate-400">Personalized with lead details</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={copy} className="btn-sm btn-outline gap-1.5">
              {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn-sm btn-ghost" title="Expand">
              <Maximize2 size={11} />
            </button>
          </div>
        </div>

        <div className="detail-section-body">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 max-h-[60vh] overflow-y-auto">
            {rendered.split(/\n\n+/).map((para, i) => (
              <p
                key={i}
                className="text-sm text-slate-700 leading-relaxed mb-3 last:mb-0 whitespace-pre-line"
              >
                {para}
              </p>
            ))}
          </div>

          <div className="mt-3 text-[11px] text-slate-400">
            Tip: Press <kbd className="font-mono bg-slate-100 border border-slate-200 rounded px-1 py-[1px]">4</kbd> to jump to this tab mid-call.
          </div>
        </div>
      </div>
    </div>
  )
}
