import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Check, RefreshCw, Loader2, Link2, Users, TrendingUp, ExternalLink, AlertCircle, Edit3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCrmHeader } from '../../layouts/CrmLayout'
import api from '../../api/axios'

// ── API types ─────────────────────────────────────────────────────────────────
interface MyAffiliateLink {
  affiliate_code: string | null
  affiliate_url: string | null
  has_code: boolean
}

interface AffiliateUser {
  id: number
  name: string
  email: string
  role: number
  affiliate_code: string | null
  affiliate_url: string | null
  leads_generated: number
}

const affiliateApi = {
  getMyLink: () => api.get<{ success: boolean; data: MyAffiliateLink }>('/crm/affiliate/my-link'),
  generateCode: (custom_code?: string) =>
    api.post<{ success: boolean; data: { affiliate_code: string; affiliate_url: string } }>('/crm/affiliate/generate-code', { custom_code }),
  listUsers: () => api.get<{ success: boolean; data: AffiliateUser[] }>('/crm/affiliate/users'),
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? 'Copied!' : label}
    </button>
  )
}

// ── My Affiliate Link card ────────────────────────────────────────────────────
function MyAffiliateLinkCard() {
  const qc = useQueryClient()
  const [customCode, setCustomCode] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['my-affiliate-link'],
    queryFn: async () => {
      const res = await affiliateApi.getMyLink()
      return res.data.data
    },
  })

  const mutation = useMutation({
    mutationFn: (code?: string) => affiliateApi.generateCode(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-affiliate-link'] })
      qc.invalidateQueries({ queryKey: ['affiliate-users'] })
      setShowCustom(false)
      setCustomCode('')
      toast.success('Affiliate code generated!')
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to generate code')
    },
  })

  return (
    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 text-white">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
          <Link2 size={18} />
        </div>
        <div>
          <h3 className="font-bold text-lg">My Affiliate Link</h3>
          <p className="text-emerald-100 text-xs">Share this link to generate leads</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-emerald-100"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : !data?.has_code ? (
        <div className="space-y-3">
          <p className="text-emerald-100 text-sm">You don't have an affiliate link yet.</p>
          <button
            onClick={() => mutation.mutate(undefined)}
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all text-sm"
          >
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
            Generate My Affiliate Link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current code */}
          <div className="bg-white/15 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">Your Code</p>
              <span className="text-lg font-mono font-bold">{data.affiliate_code}</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <p className="flex-1 text-xs font-mono truncate text-white">{data.affiliate_url}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {data.affiliate_url && <CopyButton text={data.affiliate_url} label="Copy Link" />}
            {data.affiliate_url && (
              <a
                href={data.affiliate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all"
              >
                <ExternalLink size={12} />
                Preview
              </a>
            )}
            <button
              onClick={() => setShowCustom(s => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all"
            >
              <Edit3 size={12} />
              Custom Code
            </button>
            <button
              onClick={() => mutation.mutate(undefined)}
              disabled={mutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-all"
            >
              {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              Regenerate
            </button>
          </div>

          {/* Custom code input */}
          {showCustom && (
            <div className="bg-white/15 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-emerald-100">Custom Code (letters & numbers only)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCode}
                  onChange={e => setCustomCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                  placeholder="e.g. johndoe or mycompany"
                  className="flex-1 bg-white/20 text-white placeholder-white/50 rounded-xl px-3 py-2 text-sm border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <button
                  disabled={!customCode || mutation.isPending}
                  onClick={() => mutation.mutate(customCode)}
                  className="px-4 py-2 bg-white text-emerald-700 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-emerald-50 transition-all"
                >
                  Set
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Team affiliate table ──────────────────────────────────────────────────────
function TeamAffiliateTable() {
  const { data, isLoading } = useQuery({
    queryKey: ['affiliate-users'],
    queryFn: async () => {
      const res = await affiliateApi.listUsers()
      return res.data.data
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 flex justify-center">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    )
  }

  if (!data?.length) return null

  const totalLeads = data.reduce((n, u) => n + u.leads_generated, 0)
  const withCodes  = data.filter(u => u.affiliate_code).length

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Users size={15} className="text-indigo-600" />
          </div>
          <h3 className="font-bold text-slate-800">Team Affiliate Links</h3>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-lg font-bold text-slate-900">{withCodes}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Active Links</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{totalLeads}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Leads</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-slate-400 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3">Agent</th>
              <th className="text-left px-5 py-3">Affiliate Code</th>
              <th className="text-left px-5 py-3">Affiliate Link</th>
              <th className="text-center px-5 py-3">Leads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map(u => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div>
                    <p className="font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  {u.affiliate_code ? (
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">{u.affiliate_code}</span>
                  ) : (
                    <span className="text-slate-300 italic text-xs">No code</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  {u.affiliate_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono truncate max-w-[180px]">{u.affiliate_url}</span>
                      <CopyButton text={u.affiliate_url} />
                    </div>
                  ) : (
                    <span className="text-slate-300 italic text-xs">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`font-bold ${u.leads_generated > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {u.leads_generated}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '1', title: 'Get Your Link',    desc: 'Generate your unique affiliate code above' },
    { num: '2', title: 'Share It',         desc: 'Send the link to potential clients via email, social, or SMS' },
    { num: '3', title: 'Client Applies',   desc: 'Client fills the application — no login required' },
    { num: '4', title: 'Lead Created',     desc: 'A new lead is automatically added to your CRM pipeline' },
  ]
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <TrendingUp size={15} className="text-amber-600" />
        </div>
        <h3 className="font-bold text-slate-800">How Affiliate Links Work</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {steps.map(s => (
          <div key={s.num} className="text-center">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center mx-auto mb-2">
              {s.num}
            </div>
            <p className="font-semibold text-slate-800 text-sm mb-1">{s.title}</p>
            <p className="text-xs text-slate-500">{s.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CrmAffiliateLinks() {
  useCrmHeader()

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Affiliate Links</h2>
        <p className="text-slate-500 text-sm mt-1">
          Share your unique link to collect applications without requiring clients to log in.
          All links use your company domain configured in{' '}
          <a href="/crm/company-settings" className="text-emerald-600 hover:underline font-medium">Company Settings</a>.
        </p>
      </div>

      <MyAffiliateLinkCard />
      <HowItWorks />
      <TeamAffiliateTable />
    </div>
  )
}
