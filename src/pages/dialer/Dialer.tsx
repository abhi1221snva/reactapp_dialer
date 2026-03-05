import { useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { LogIn, LogOut, Radio, Zap, TrendingUp, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { dialerService } from '../../services/dialer.service'
import { useDialerStore } from '../../stores/dialer.store'
import { CallControls } from '../../components/dialer/CallControls'
import { LeadInfoPanel } from '../../components/dialer/LeadInfoPanel'
import { DispositionForm } from '../../components/dialer/DispositionForm'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { cn } from '../../utils/cn'
import type { Campaign } from '../../types'

const statusConfig: Record<string, { label: string; classes: string }> = {
  idle: { label: 'Not Ready', classes: 'bg-slate-100 text-slate-500' },
  ready: { label: 'Ready', classes: 'bg-emerald-100 text-emerald-700' },
  ringing: { label: 'Ringing…', classes: 'bg-amber-100 text-amber-700' },
  'in-call': { label: 'In Call', classes: 'bg-blue-100 text-blue-700' },
  wrapping: { label: 'Wrap-up', classes: 'bg-violet-100 text-violet-700' },
}

export function Dialer() {
  const {
    callState, activeCampaign, isExtensionLoggedIn,
    setActiveCampaign, setExtensionLoggedIn, setCallState,
    setActiveLead, setDispositions, startCallTimer, resetDialer,
  } = useDialerStore()

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['agent-campaigns'],
    queryFn: () => dialerService.getAgentCampaigns(),
  })

  const campaigns: Campaign[] = campaignsData?.data?.data || []

  const loginMutation = useMutation({
    mutationFn: (id: number) => dialerService.extensionLogin(id),
    onSuccess: (_, id) => {
      const camp = campaigns.find(c => c.id === id)!
      setActiveCampaign(camp)
      setExtensionLoggedIn(true)
      setCallState('ready')
      toast.success(`Logged into ${camp.campaign_name}`)
      dialerService.getDispositionsByCampaign(id).then(r => setDispositions(r.data?.data || []))
    },
    onError: () => toast.error('Failed to log in to extension'),
  })

  const logoutMutation = useMutation({
    mutationFn: () => dialerService.extensionLogout(),
    onSuccess: () => {
      setExtensionLoggedIn(false)
      setCallState('idle')
      setActiveCampaign(null)
      toast.success('Logged out')
    },
  })

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const hangUpMutation = useMutation({
    mutationFn: () => dialerService.hangUp({ campaign_id: activeCampaign!.id, lead_id: 0 }),
    onSuccess: () => {
      stopTimer()
      setCallState('wrapping')
    },
  })

  const saveDispositionMutation = useMutation({
    mutationFn: (data: Parameters<typeof dialerService.saveDisposition>[0]) =>
      dialerService.saveDisposition(data),
    onSuccess: () => {
      toast.success('Disposition saved')
      resetDialer()
      if (activeCampaign) {
        dialerService.getLead(activeCampaign.id).then(r => {
          setActiveLead(r.data?.data || null)
        })
      }
    },
  })

  useEffect(() => {
    if (callState === 'in-call') {
      startCallTimer() // resets callDuration to 0 in store
      timerRef.current = setInterval(() => {
        useDialerStore.setState((s) => ({ callDuration: s.callDuration + 1 }))
      }, 1000)
    }
    return () => stopTimer()
  }, [callState])

  if (isLoading) return <PageLoader />

  // Pre-login: campaign selection
  if (!isExtensionLoggedIn) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dialer</h1>
            <p className="page-subtitle">Select a campaign to begin dialing</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full">
            <Zap size={13} className="text-indigo-600" />
            <span className="text-xs font-semibold text-indigo-600">{campaigns.length} Available</span>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Radio size={32} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">No campaigns assigned</p>
              <p className="text-sm text-slate-400 mt-1">Contact your administrator to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => {
              const progress = c.total_leads ? Math.round((c.called_leads! / c.total_leads) * 100) : 0
              return (
                <div
                  key={c.id}
                  className="card hover:shadow-lg transition-all duration-200 cursor-pointer group flex flex-col"
                >
                  {/* Card top */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
                      <Radio size={20} className="text-white" />
                    </div>
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-semibold',
                      c.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {c.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{c.campaign_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 capitalize">
                    {c.dial_method} &nbsp;·&nbsp; Ratio {c.dial_ratio}:1
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users size={11} />
                      <span>{c.total_leads ?? 0} leads</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <TrendingUp size={11} />
                      <span>{c.called_leads ?? 0} called</span>
                    </div>
                  </div>

                  {/* Progress */}
                  {c.total_leads !== undefined && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                        <span>Progress</span>
                        <span className="font-medium text-slate-600">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => loginMutation.mutate(c.id)}
                    disabled={loginMutation.isPending}
                    className="btn-primary w-full mt-5 gap-2"
                  >
                    <LogIn size={15} />
                    {loginMutation.isPending ? 'Joining…' : 'Join Campaign'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Active dialer: 2-column layout
  const status = statusConfig[callState] ?? statusConfig.idle

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <Radio size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">{activeCampaign?.campaign_name}</h1>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {activeCampaign?.dial_method} &nbsp;·&nbsp; Ratio {activeCampaign?.dial_ratio}:1
            </p>
          </div>
          <span className={cn('ml-2 px-3 py-1 rounded-full text-xs font-semibold', status.classes)}>
            {status.label}
          </span>
        </div>
        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="btn-outline gap-2 text-sm"
        >
          <LogOut size={15} /> {logoutMutation.isPending ? 'Logging out…' : 'Logout'}
        </button>
      </div>

      {/* 3-panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Lead info */}
        <div className="card">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Lead Information</h3>
          <LeadInfoPanel />
        </div>

        {/* Call controls */}
        <div className="card flex flex-col items-center justify-center min-h-[420px] bg-gradient-to-b from-slate-50 to-white">
          <CallControls
            onDial={() => {}}
            onHangUp={() => hangUpMutation.mutate()}
            onMute={() => {}}
            onHold={() => {}}
          />
        </div>

        {/* Disposition */}
        <div className="card">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Disposition</h3>
          {callState === 'wrapping' ? (
            <DispositionForm
              loading={saveDispositionMutation.isPending}
              onSave={(d) => saveDispositionMutation.mutate({
                lead_id: useDialerStore.getState().activeLead?.id ?? 0,
                campaign_id: activeCampaign!.id,
                ...d,
              })}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Radio size={20} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-400 text-center">
                Complete the call to<br />save a disposition
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
