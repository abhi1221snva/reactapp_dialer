import { useState, useEffect } from 'react'
import { MessageSquare, Send, Sparkles, Phone, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../../utils/cn'
import { smsTemplateService } from '../../../../services/smsTemplate.service'
import { crmService } from '../../../../services/crm.service'
import { useAuthStore } from '../../../../stores/auth.store'
import type { StudioLead } from '../types'

interface SmsTemplate {
  templete_id: number
  templete_name: string
  templete_desc: string
  status: number
}

/** Replace [[key]], {{key}}, and {key} placeholders with lead + agent data */
function resolvePlaceholders(text: string, lead: StudioLead, agent?: { first_name: string; last_name: string; name: string; email: string }): string {
  const map: Record<string, string> = {
    first_name: lead.firstName,
    last_name: lead.lastName,
    phone_number: lead.phone,
    email: lead.email,
    company_name: lead.company,
    company: lead.company,
    state: lead.state,
    country: lead.country,
  }
  // Agent / specialist placeholders
  if (agent) {
    map.agent = agent.name
    map.agent_name = agent.name
    map.agent_first_name = agent.first_name
    map.agent_last_name = agent.last_name
    map.agent_email = agent.email
    map.specialist_first_name = agent.first_name
    map.specialist_last_name = agent.last_name
    map.specialist_name = agent.name
  }
  // Include custom fields
  lead.customFields?.forEach((f) => {
    map[f.key] = f.value
  })

  return text
    .replace(/\[\[([^\]]+)\]\]/g, (m, key) => map[key] ?? m)
    .replace(/\{\{([^}]+)\}\}/g, (m, key) => map[key.trim()] ?? m)
    .replace(/\{([^{}]+)\}/g, (m, key) => map[key] ?? m)
}

interface Props {
  lead: StudioLead
}

export function SendSmsTab({ lead }: Props) {
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const authUser = useAuthStore((s) => s.user)

  // Fetch real SMS templates on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    smsTemplateService.list()
      .then((res) => {
        if (cancelled) return
        const list: SmsTemplate[] = res.data?.data ?? res.data ?? []
        // Only show active templates
        setTemplates(list.filter((t) => Number(t.status) === 1))
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load SMS templates')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const pickTemplate = (id: number) => {
    const t = templates.find((x) => x.templete_id === id)
    if (!t) return
    setSelected(id)
    const agent = authUser ? { first_name: authUser.first_name, last_name: authUser.last_name, name: `${authUser.first_name} ${authUser.last_name}`.trim(), email: authUser.email } : undefined
    setBody(resolvePlaceholders(t.templete_desc, lead, agent))
  }

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      if (lead.id) {
        await crmService.sendLeadSms(lead.id, { to: lead.phone, body: body.trim() })
      }
      toast.success(`SMS sent to ${lead.phone}`)
      setBody('')
      setSelected(null)
    } catch {
      toast.error('Failed to send SMS')
    } finally {
      setSending(false)
    }
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
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 size={12} className="animate-spin" /> Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">No SMS templates found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.templete_id}
                    onClick={() => pickTemplate(t.templete_id)}
                    className={cn(
                      'chip',
                      selected === t.templete_id && 'bg-indigo-100 text-indigo-700',
                    )}
                  >
                    {t.templete_name}
                  </button>
                ))}
              </div>
            )}
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
