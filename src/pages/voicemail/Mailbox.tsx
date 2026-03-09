import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox, Trash2, CheckCircle, Mail, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../../components/ui/Badge'
import { voicemailService } from '../../services/voicemail.service'
import { confirmDelete } from '../../utils/confirmDelete'

interface MailboxEntry {
  id: number
  ani?: string
  vm_file_location?: string
  status?: string
  extension?: string
  date?: string
  [key: string]: unknown
}

interface MailboxResponse {
  data?: {
    success?: boolean
    record_count?: number
    data?: MailboxEntry[]
  }
}

export function Mailbox() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({
    start_date: '', end_date: '', extension: '',
    lower_limit: 0, upper_limit: 20,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mailbox', filters],
    queryFn: () => voicemailService.getMailbox(filters),
  })

  const entries: MailboxEntry[] = (data as MailboxResponse)?.data?.data ?? []
  const total = (data as MailboxResponse)?.data?.record_count ?? 0

  const markReadMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      voicemailService.editMailbox(id, status),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['mailbox'] }) },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => voicemailService.deleteMailbox(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['mailbox'] }) },
    onError: () => toast.error('Failed to delete'),
  })

  const set = (k: string, v: string) => setFilters(p => ({ ...p, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mailbox</h1>
          <p className="page-subtitle">View and manage voicemail messages received by agents</p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label text-xs">Start Date</label>
            <input className="input text-sm" type="date" value={filters.start_date}
              onChange={e => set('start_date', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">End Date</label>
            <input className="input text-sm" type="date" value={filters.end_date}
              onChange={e => set('end_date', e.target.value)} />
          </div>
          <div>
            <label className="label text-xs">Extension</label>
            <input className="input text-sm w-32" value={filters.extension}
              onChange={e => set('extension', e.target.value)} placeholder="38080" />
          </div>
          <button onClick={() => refetch()} className="btn-outline flex items-center gap-2 text-sm">
            <RefreshCw size={14} /> Refresh
          </button>
          {(filters.start_date || filters.end_date || filters.extension) && (
            <button
              onClick={() => setFilters({ start_date: '', end_date: '', extension: '', lower_limit: 0, upper_limit: 20 })}
              className="text-sm text-slate-500 hover:text-slate-700 underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Inbox size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{total}</p>
            <p className="text-xs text-slate-500">Total Messages</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
            <Mail size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {entries.filter(e => e.status === 'unread' || e.status === '0').length}
            </p>
            <p className="text-xs text-slate-500">Unread</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">
              {entries.filter(e => e.status === 'read' || e.status === '1').length}
            </p>
            <p className="text-xs text-slate-500">Read</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Messages</h2>
          <span className="text-xs text-slate-400">{entries.length} shown</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">No messages found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Caller (ANI)', 'Extension', 'Date', 'Status', 'File', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const isRead = entry.status === 'read' || entry.status === '1'
                  return (
                    <tr key={entry.id} className={`hover:bg-slate-50 transition-colors ${!isRead ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {entry.ani || '—'}
                      </td>
                      <td className="px-5 py-3 font-mono text-indigo-600 text-xs font-semibold">
                        {entry.extension || '—'}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{entry.date || '—'}</td>
                      <td className="px-5 py-3">
                        <Badge variant={isRead ? 'green' : 'yellow'}>
                          {isRead ? 'Read' : 'Unread'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs font-mono truncate max-w-[140px]">
                        {entry.vm_file_location
                          ? <span title={String(entry.vm_file_location)}>{String(entry.vm_file_location).split('/').pop()}</span>
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {!isRead && (
                            <button
                              onClick={() => markReadMutation.mutate({ id: entry.id, status: 1 })}
                              disabled={markReadMutation.isPending}
                              title="Mark as read"
                              className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors">
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (await confirmDelete(`message from ${entry.ani ?? entry.id}`))
                                deleteMutation.mutate(entry.id)
                            }}
                            disabled={deleteMutation.isPending}
                            title="Delete"
                            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load more */}
        {entries.length > 0 && entries.length < total && (
          <div className="px-5 py-4 border-t border-slate-100 text-center">
            <button
              onClick={() => setFilters(p => ({ ...p, upper_limit: p.upper_limit + 20 }))}
              className="btn-outline text-sm">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
