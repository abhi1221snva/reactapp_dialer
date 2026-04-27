import { useState, useEffect } from 'react'
import { Mail, Send, Sparkles, Paperclip, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../../utils/cn'
import { emailTemplateService } from '../../../../services/emailTemplate.service'
import { crmService } from '../../../../services/crm.service'
import { useAuthStore } from '../../../../stores/auth.store'
import type { StudioLead } from '../types'

interface EmailTemplate {
  id: number
  template_name: string
  template_html: string
  subject: string
  status: string | number
}

/** Strip HTML tags to plain text */
function stripHtml(html: string): string {
  // Replace <br>, <br/>, </p>, </div>, </li> with newlines
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
  // Remove remaining tags
  text = text.replace(/<[^>]+>/g, '')
  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n').trim()
  return text
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

export function SendEmailTab({ lead }: Props) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const authUser = useAuthStore((s) => s.user)

  // Fetch real email templates on mount
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    emailTemplateService.list()
      .then((res) => {
        if (cancelled) return
        const list: EmailTemplate[] = res.data?.data ?? res.data ?? []
        setTemplates(list.filter((t) => Number(t.status) === 1))
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load email templates')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const pickTemplate = (id: number) => {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    setSelected(id)
    const agent = authUser ? { first_name: authUser.first_name, last_name: authUser.last_name, name: `${authUser.first_name} ${authUser.last_name}`.trim(), email: authUser.email } : undefined
    setSubject(resolvePlaceholders(t.subject ?? '', lead, agent))
    setBody(resolvePlaceholders(stripHtml(t.template_html ?? ''), lead, agent))
  }

  const send = async () => {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    try {
      if (lead.id) {
        await crmService.sendMerchantEmail(lead.id, {
          to: lead.email,
          subject: subject.trim(),
          body: body.trim(),
        })
      }
      toast.success(`Email sent to ${lead.email}`)
      setSubject('')
      setBody('')
      setSelected(null)
    } catch {
      toast.error('Failed to send email')
    } finally {
      setSending(false)
    }
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
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 size={12} className="animate-spin" /> Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">No email templates found.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => pickTemplate(t.id)}
                    className={cn(
                      'chip',
                      selected === t.id && 'bg-violet-100 text-violet-700',
                    )}
                  >
                    {t.template_name}
                  </button>
                ))}
              </div>
            )}
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
