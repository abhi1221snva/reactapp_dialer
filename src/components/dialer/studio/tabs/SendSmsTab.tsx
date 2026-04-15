import { useState } from 'react'
import { MessageSquare, Send, Sparkles, Phone } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../../utils/cn'
import { MOCK_SMS_TEMPLATES } from '../mockData'
import type { StudioLead } from '../types'

interface Props {
  lead: StudioLead
}

export function SendSmsTab({ lead }: Props) {
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const pickTemplate = (id: number) => {
    const t = MOCK_SMS_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setSelected(id)
    setBody(t.body
      .replace('{first_name}', lead.firstName)
      .replace('{agent}', 'Priya')
      .replace('{company}', lead.company),
    )
  }

  const send = () => {
    if (!body.trim()) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      toast.success(`SMS sent to ${lead.phone}`)
      setBody('')
      setSelected(null)
    }, 700)
  }

  const charCount = body.length
  const smsCount = Math.ceil(charCount / 160) || 1

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
            <MessageSquare size={14} className="text-sky-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Send SMS</h3>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              To <Phone size={10} /> <span className="font-mono text-slate-600">{lead.phone}</span>
            </p>
          </div>
        </div>

        <div className="detail-section-body space-y-4">
          {/* Templates */}
          <div>
            <label className="label-xs">Quick Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_SMS_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  className={cn(
                    'chip',
                    selected === t.id && 'bg-indigo-100 text-indigo-700',
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="label-xs">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message…"
              rows={6}
              className="input resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                <Sparkles size={11} /> AI rewrite
              </button>
              <p className="text-[10px] text-slate-400">
                {charCount} chars · {smsCount} SMS
              </p>
            </div>
          </div>

          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="btn-primary w-full gap-2"
          >
            <Send size={14} /> {sending ? 'Sending…' : 'Send SMS'}
          </button>
        </div>
      </div>
    </div>
  )
}
