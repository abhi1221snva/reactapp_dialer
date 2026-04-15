import { useState } from 'react'
import { Mail, Send, Sparkles, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../../utils/cn'
import { MOCK_EMAIL_TEMPLATES } from '../mockData'
import type { StudioLead } from '../types'

interface Props {
  lead: StudioLead
}

export function SendEmailTab({ lead }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [sending, setSending] = useState(false)

  const pickTemplate = (id: number) => {
    const t = MOCK_EMAIL_TEMPLATES.find((x) => x.id === id)
    if (!t) return
    setSelected(id)
    setSubject(t.subject)
    setBody(t.body.replace(/{first_name}/g, lead.firstName))
  }

  const send = () => {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      toast.success(`Email sent to ${lead.email}`)
      setSubject('')
      setBody('')
      setSelected(null)
    }, 700)
  }

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="detail-section">
        <div className="detail-section-header">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Mail size={14} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Send Email</h3>
            <p className="text-[11px] text-slate-400 truncate">To {lead.email}</p>
          </div>
        </div>

        <div className="detail-section-body space-y-4">
          {/* Templates */}
          <div>
            <label className="label-xs">Templates</label>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_EMAIL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pickTemplate(t.id)}
                  className={cn(
                    'chip',
                    selected === t.id && 'bg-violet-100 text-violet-700',
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="label-xs">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject…"
              className="input"
            />
          </div>

          {/* Body */}
          <div>
            <label className="label-xs">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi…"
              rows={8}
              className="input resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1.5">
                <button type="button" className="chip">
                  <Sparkles size={10} /> AI draft
                </button>
                <button type="button" className="chip">
                  <Paperclip size={10} /> Attach
                </button>
              </div>
              <p className="text-[10px] text-slate-400">{body.length} chars</p>
            </div>
          </div>

          <button
            onClick={send}
            disabled={!subject.trim() || !body.trim() || sending}
            className="btn-primary w-full gap-2"
          >
            <Send size={14} /> {sending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
