import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Loader2, ShieldAlert, Wifi, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../../stores/auth.store'
import { userService } from '../../services/user.service'
import { LEVELS } from '../../utils/permissions'
import { cn } from '../../utils/cn'

export function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const authUser = useAuthStore(s => s.user)

  const hasAccess = (authUser?.level ?? 0) >= LEVELS.ADMIN

  const { data, isLoading, error } = useQuery({
    queryKey: ['user-details', Number(id)],
    queryFn: () => userService.getDetails(Number(id)),
    enabled: !!id && hasAccess,
  })

  const u = data?.data?.data as Record<string, unknown> | undefined
  const sipExts = (u?.sip_extensions ?? {}) as Record<string, Record<string, unknown>>

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <ShieldAlert size={32} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-700 text-lg">Access Denied</p>
          <p className="text-sm text-slate-400 mt-1">You don't have permission to view user details.</p>
        </div>
        <button onClick={() => navigate('/users')} className="btn-primary mt-2 gap-2">
          <ArrowLeft size={15} /> Back to Users
        </button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    )
  }

  if (error || !u) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="font-semibold text-slate-600">Failed to load user details</p>
        <button onClick={() => navigate('/users')} className="btn-outline gap-2">
          <ArrowLeft size={15} /> Back to Users
        </button>
      </div>
    )
  }

  const sipRows = [
    { label: 'Primary', key: 'extension', ext: String(u.extension || '—') },
    { label: 'Alternate', key: 'alt_extension', ext: String(u.alt_extension || '—') },
    { label: 'App', key: 'app_extension', ext: String(u.app_extension || '—') },
  ]

  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || String(u.email || `User #${id}`)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/users')}
          className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
        >
          <ArrowLeft size={14} />
          Users
        </button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-900 font-medium truncate">{fullName}</span>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50/70 border-b border-slate-100">
          <Wifi size={14} className="text-blue-500" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">SIP Extension Mappings</span>
        </div>
        <div className="px-4 py-1">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-xs mt-2 mb-2">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Type</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Extension</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Username</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Secret</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Context</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Host</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">Type</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">NAT</th>
                  <th className="text-left py-2 font-semibold text-slate-500 pr-4">WebRTC</th>
                  <th className="text-left py-2 font-semibold text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {sipRows.map((row) => {
                  const sip = sipExts[row.key] as Record<string, unknown> | undefined
                  const configured = !!sip
                  return (
                    <tr key={row.key} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 pr-4 font-semibold text-slate-700">{row.label}</td>
                      <td className="py-2.5 pr-4">
                        <code className="font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {row.ext}
                        </code>
                      </td>
                      {configured ? (
                        <>
                          <td className="py-2.5 pr-4 text-slate-600">{String(sip.username || '—')}</td>
                          <td className="py-2.5 pr-4 text-slate-600 font-mono text-[11px]">{String(sip.secret || '—')}</td>
                          <td className="py-2.5 pr-4 text-slate-600">{String(sip.context || '—')}</td>
                          <td className="py-2.5 pr-4 text-slate-600">{String(sip.host || '—')}</td>
                          <td className="py-2.5 pr-4 text-slate-600">{String(sip.type || '—')}</td>
                          <td className="py-2.5 pr-4 text-slate-600 font-mono text-[11px]">{String(sip.nat || '—')}</td>
                          <td className="py-2.5 pr-4">
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-semibold',
                              sip.webrtc === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                            )}>
                              {sip.webrtc === 'yes' ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              Configured
                            </span>
                          </td>
                        </>
                      ) : (
                        <td colSpan={8} className="py-2.5 text-slate-400 italic">
                          {row.ext === '—' ? 'Not assigned' : 'No SIP record found'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
