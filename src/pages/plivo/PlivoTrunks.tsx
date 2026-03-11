import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wifi, Plus, Trash2, X, RefreshCw, Edit2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { plivoService } from '../../services/plivo.service'
import type { PlivoTrunk } from '../../types/plivo.types'
import { confirmDelete } from '../../utils/confirmDelete'

function CreateTrunkModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({ app_name: '', answer_url: '', hangup_url: '', status_url: '' })

  const createMutation = useMutation({
    mutationFn: () => plivoService.createTrunk(form),
    onSuccess: () => {
      toast.success('Trunk (Application) created.')
      qc.invalidateQueries({ queryKey: ['plivo-trunks'] })
      onClose()
    },
    onError: () => toast.error('Failed to create trunk.'),
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.6)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Wifi size={16} className="text-blue-600" /></div>
            <h2 className="text-base font-bold text-slate-900">Create SIP Trunk</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Application Name *</label>
            <input value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })} placeholder="My SIP Trunk" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Answer URL</label>
            <input value={form.answer_url} onChange={(e) => setForm({ ...form, answer_url: e.target.value })} placeholder="https://yourapp.com/api/plivo/inbound-call" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hangup URL</label>
            <input value={form.hangup_url} onChange={(e) => setForm({ ...form, hangup_url: e.target.value })} placeholder="https://yourapp.com/api/plivo/call-status" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-60 transition-colors">
              {createMutation.isPending ? <><RefreshCw size={13} className="animate-spin" />Creating…</> : <><Plus size={13} />Create Trunk</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PlivoTrunks() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['plivo-trunks'],
    queryFn:  () => plivoService.listTrunks(),
  })

  const deleteMutation = useMutation({
    mutationFn: (appId: string) => plivoService.deleteTrunk(appId),
    onSuccess: () => { toast.success('Trunk deleted.'); qc.invalidateQueries({ queryKey: ['plivo-trunks'] }) },
    onError: () => toast.error('Failed to delete trunk.'),
  })

  const trunks: PlivoTrunk[] = data?.data?.data?.trunks ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plivo SIP Trunks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage Plivo Applications for SIP routing</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
          <Plus size={14} />Create Trunk
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : trunks.length === 0 ? (
          <div className="py-12 text-center">
            <Wifi size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No SIP trunks yet. Create one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">App Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">App ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Answer URL</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trunks.map((trunk) => (
                <tr key={trunk.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{trunk.app_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{trunk.app_id}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{trunk.answer_url ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${trunk.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{trunk.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => { if (await confirmDelete(trunk.app_name)) deleteMutation.mutate(trunk.app_id) }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete trunk"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateTrunkModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
