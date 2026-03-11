import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Wifi, Plus, Trash2, Edit2, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { twilioService } from '../../services/twilio.service'
import type { TwilioTrunk } from '../../types/twilio.types'
import { confirmDelete } from '../../utils/confirmDelete'

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
      status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
    }`}>
      {status}
    </span>
  )
}

export function TwilioTrunks() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]       = useState('')
  const [editUrl, setEditUrl]       = useState<{ sid: string; url: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['twilio-trunks'],
    queryFn:  () => twilioService.listTrunks(),
  })

  const createMutation = useMutation({
    mutationFn: () => twilioService.createTrunk(newName),
    onSuccess: () => {
      toast.success('SIP trunk created')
      setShowCreate(false)
      setNewName('')
      qc.invalidateQueries({ queryKey: ['twilio-trunks'] })
    },
    onError: () => toast.error('Failed to create trunk'),
  })

  const deleteMutation = useMutation({
    mutationFn: (sid: string) => twilioService.deleteTrunk(sid),
    onSuccess: () => {
      toast.success('Trunk deleted')
      qc.invalidateQueries({ queryKey: ['twilio-trunks'] })
    },
    onError: () => toast.error('Failed to delete trunk'),
  })

  const updateUrlMutation = useMutation({
    mutationFn: () => twilioService.updateTrunkUrl(editUrl!.sid, editUrl!.url),
    onSuccess: () => {
      toast.success('Origination URL updated')
      setEditUrl(null)
      qc.invalidateQueries({ queryKey: ['twilio-trunks'] })
    },
    onError: () => toast.error('Failed to update URL'),
  })

  const trunks: TwilioTrunk[] = data?.data?.data?.trunks ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">SIP Trunks</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage Twilio Elastic SIP Trunking</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
        >
          <Plus size={14} />
          New Trunk
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-indigo-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Create SIP Trunk</h3>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Friendly name (e.g. Main Trunk)"
              className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newName || createMutation.isPending}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-colors"
            >
              {createMutation.isPending ? 'Creating…' : 'Create'}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName('') }}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Trunks list */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trunks.length === 0 ? (
          <div className="py-12 text-center">
            <Wifi size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No SIP trunks yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-sm text-indigo-600 hover:underline"
            >
              Create your first trunk
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">SID</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Domain</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Origination URL</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600">Status</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trunks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{t.friendly_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.sid}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{t.domain_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {editUrl?.sid === t.sid ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editUrl.url}
                          onChange={(e) => setEditUrl({ ...editUrl, url: e.target.value })}
                          className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                          placeholder="sip:ip:5060"
                        />
                        <button
                          onClick={() => updateUrlMutation.mutate()}
                          disabled={updateUrlMutation.isPending}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditUrl(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-mono truncate max-w-[180px]">
                          {t.origination_url ?? <span className="text-slate-300">Not set</span>}
                        </span>
                        <button
                          onClick={() => setEditUrl({ sid: t.sid, url: t.origination_url ?? '' })}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Edit2 size={11} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={async () => {
                        if (await confirmDelete(t.friendly_name)) deleteMutation.mutate(t.sid)
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-800 font-medium mb-1">What is a SIP Trunk?</p>
        <p className="text-xs text-blue-700">
          Twilio Elastic SIP Trunks connect your SIP infrastructure (PBX, softswitch) directly to Twilio.
          Set the origination URL to your SIP server IP/domain. Assign Twilio phone numbers to the trunk for inbound routing.
        </p>
      </div>
    </div>
  )
}
