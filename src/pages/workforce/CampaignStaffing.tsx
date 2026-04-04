import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { workforceService } from '../../services/workforce.service'
import api from '../../api/axios'
import { cn } from '../../utils/cn'
import { AlertTriangle, CheckCircle2, Save, Coffee, Users, Trash2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffingRow {
  id: number
  campaign_id: number
  campaign_name: string
  campaign_status: number
  required_agents: number
  min_agents: number
}

interface BreakPolicy {
  id: number
  campaign_id: number | null
  max_concurrent_breaks: number
  max_break_minutes: number
}

interface Campaign {
  id: number
  title: string
  status: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = ['Campaign Staffing', 'Break Policies']

export function CampaignStaffing() {
  const [tab, setTab] = useState('Campaign Staffing')
  const qc = useQueryClient()

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn('px-5 py-1.5 rounded-lg text-sm font-semibold transition-all',
              tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700')}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Campaign Staffing' && <StaffingTab qc={qc} />}
      {tab === 'Break Policies' && <BreakPolicyTab qc={qc} />}
    </div>
  )
}

// ─── Staffing Tab ─────────────────────────────────────────────────────────────

function StaffingTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [editing, setEditing] = useState<Record<number, { required: string; min: string }>>({})

  const { data: campaigns } = useQuery({
    queryKey: ['campaigns-all'],
    queryFn: () => api.get('/campaigns').then(r => (r.data?.data ?? r.data) as Campaign[]),
  })

  const { data, isLoading } = useQuery({
    queryKey: ['campaign-staffing'],
    queryFn: () => workforceService.getStaffing().then(r => r.data as { data: StaffingRow[] }),
  })

  const upsertMut = useMutation({
    mutationFn: (d: { campaign_id: number; required_agents: number; min_agents: number }) =>
      workforceService.upsertStaffing(d),
    onSuccess: () => { toast.success('Staffing saved'); qc.invalidateQueries({ queryKey: ['campaign-staffing'] }) },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMut = useMutation({
    mutationFn: (cid: number) => workforceService.deleteStaffing(cid),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['campaign-staffing'] }) },
  })

  const staffingMap = new Map<number, StaffingRow>((data?.data ?? []).map(r => [r.campaign_id, r]))
  const campaignList: Campaign[] = Array.isArray(campaigns) ? campaigns : []

  const getEdit = (id: number) => editing[id] ?? {
    required: String(staffingMap.get(id)?.required_agents ?? 0),
    min:      String(staffingMap.get(id)?.min_agents ?? 0),
  }

  const handleSave = (campaignId: number) => {
    const e = getEdit(campaignId)
    upsertMut.mutate({
      campaign_id:     campaignId,
      required_agents: parseInt(e.required) || 0,
      min_agents:      parseInt(e.min) || 0,
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Set required agent counts per campaign. The dashboard will warn supervisors when active agents fall below the threshold.
      </p>

      {isLoading ? (
        <div className="card animate-pulse h-48" />
      ) : campaignList.length === 0 ? (
        <div className="card text-center py-12 text-slate-400">No campaigns found.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Required Agents</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">Alert Below</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {campaignList.map(c => {
                const e = getEdit(c.id)
                const has = staffingMap.has(c.id)
                return (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.title}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-semibold px-2 py-1 rounded-full',
                        c.status ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>
                        {c.status ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        value={e.required}
                        onChange={ev => setEditing(p => ({ ...p, [c.id]: { ...getEdit(c.id), required: ev.target.value } }))}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={0}
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        value={e.min}
                        onChange={ev => setEditing(p => ({ ...p, [c.id]: { ...getEdit(c.id), min: ev.target.value } }))}
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => handleSave(c.id)}
                          disabled={upsertMut.isPending}
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                          title="Save"
                        >
                          <Save size={14} />
                        </button>
                        {has && (
                          <button
                            onClick={() => deleteMut.mutate(c.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Break Policy Tab ─────────────────────────────────────────────────────────

function BreakPolicyTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [form, setForm] = useState({ campaign_id: '', max_concurrent_breaks: '3', max_break_minutes: '60' })

  const { data, isLoading } = useQuery({
    queryKey: ['break-policies'],
    queryFn: () => workforceService.getBreakPolicies().then(r => r.data as { data: BreakPolicy[] }),
  })

  const upsertMut = useMutation({
    mutationFn: (d: { campaign_id?: number; max_concurrent_breaks: number; max_break_minutes: number }) =>
      workforceService.upsertBreakPolicy(d),
    onSuccess: () => { toast.success('Break policy saved'); qc.invalidateQueries({ queryKey: ['break-policies'] }); setForm({ campaign_id: '', max_concurrent_breaks: '3', max_break_minutes: '60' }) },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => workforceService.deleteBreakPolicy(id),
    onSuccess: () => { toast.success('Removed'); qc.invalidateQueries({ queryKey: ['break-policies'] }) },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const maxBreaks = parseInt(form.max_concurrent_breaks)
    const maxMins   = parseInt(form.max_break_minutes)
    if (!maxBreaks || maxBreaks < 1) { toast.error('Max concurrent breaks must be at least 1'); return }
    upsertMut.mutate({
      campaign_id:           form.campaign_id ? parseInt(form.campaign_id) : undefined,
      max_concurrent_breaks: maxBreaks,
      max_break_minutes:     maxMins,
    })
  }

  const policies: BreakPolicy[] = data?.data ?? []

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-500">
        Limit how many agents can be on break simultaneously. Leave Campaign ID blank to set a global default.
      </p>

      {/* Add form */}
      <div className="card">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Coffee size={16} className="text-amber-500" /> Add / Update Break Policy
        </h3>
        <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign ID</label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Leave blank for global"
              value={form.campaign_id}
              onChange={e => setForm(p => ({ ...p, campaign_id: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-0.5">Blank = global default</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Max Concurrent Breaks</label>
            <input
              type="number"
              min={1}
              max={50}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.max_concurrent_breaks}
              onChange={e => setForm(p => ({ ...p, max_concurrent_breaks: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Max Break Duration (min)</label>
            <input
              type="number"
              min={1}
              max={480}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={form.max_break_minutes}
              onChange={e => setForm(p => ({ ...p, max_break_minutes: e.target.value }))}
            />
          </div>
          <button type="submit" disabled={upsertMut.isPending} className="btn-primary">
            {upsertMut.isPending ? 'Saving…' : 'Save Policy'}
          </button>
        </form>
      </div>

      {/* Policies list */}
      {isLoading ? (
        <div className="card animate-pulse h-32" />
      ) : policies.length === 0 ? (
        <div className="card text-center py-10 text-slate-400">No break policies configured. The default allows 3 concurrent breaks.</div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Concurrent Breaks</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Max Break Duration</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {policies.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    {p.campaign_id == null ? (
                      <span className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                        <CheckCircle2 size={13} /> Global Default
                      </span>
                    ) : (
                      <span className="text-slate-700">Campaign #{p.campaign_id}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{p.max_concurrent_breaks} agents</td>
                  <td className="px-4 py-3 text-slate-600">{p.max_break_minutes} min</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteMut.mutate(p.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-semibold">How break throttling works</p>
            <p className="mt-1">When an agent tries to take a break, the system checks how many agents are currently on break for their campaign. If the limit is reached, the break request is blocked with a warning message until another agent returns from break.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
