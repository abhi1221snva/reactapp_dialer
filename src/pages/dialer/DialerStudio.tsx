import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { AlertTriangle, CheckCircle2, PhoneCall, Loader2, ShieldAlert } from 'lucide-react'

import { CampaignPicker } from '../../components/dialer/studio/CampaignPicker'
import { DialerInterface } from '../../components/dialer/studio/DialerInterface'
import { dialerService } from '../../services/dialer.service'
import { campaignDialerService } from '../../services/campaignDialer.service'
import { useDialerStore } from '../../stores/dialer.store'
import { useFloatingStore } from '../../stores/floating.store'
import { useAuth } from '../../hooks/useAuth'
import type { StudioCampaign } from '../../components/dialer/studio/types'
import type { Campaign } from '../../types'

// Gradient palette cycled through campaign cards
const CAMPAIGN_COLORS = [
  'from-indigo-500 to-violet-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-cyan-600',
  'from-purple-500 to-fuchsia-600',
]

function mapCampaign(c: Campaign, idx: number): StudioCampaign {
  const dialMethodMap: Record<string, StudioCampaign['dialMethod']> = {
    predictive_dial:   'Predictive',
    preview_and_dial:  'Preview',
    power_dial:        'Power',
    super_power_dial:  'Super Dial',
    outbound_ai:       'Outbound AI',
  }
  return {
    id:          c.id,
    name:        c.campaign_name,
    dialMethod:  dialMethodMap[c.dial_mode] ?? 'Predictive',
    ratio:       c.dial_ratio ?? 1,
    totalLeads:  c.total_leads ?? 0,
    calledLeads: c.called_leads ?? 0,
    status:      c.status === 'active' ? 'active' : 'paused',
    color:       CAMPAIGN_COLORS[idx % CAMPAIGN_COLORS.length],
  }
}

/**
 * DialerStudio — parent page for the premium dialer UI.
 *
 * Responsibilities:
 *   • Loads real campaigns from the API
 *   • Calls extensionLogin when agent selects a campaign
 *   • Syncs selection with ?campaign=<id> query param
 *   • Swaps between <CampaignPicker /> and <DialerInterface /> without a route change
 */
export function DialerStudio() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [campaign, setCampaign] = useState<StudioCampaign | null>(null)
  const [urlCampaignNotFound, setUrlCampaignNotFound] = useState(false)
  const [failedCampaignId, setFailedCampaignId] = useState<number | null>(null)

  const { sipConfig } = useAuth()
  const phoneRegistered   = useFloatingStore(s => s.phoneRegistered)
  const setPhoneOpen      = useFloatingStore(s => s.setPhoneOpen)
  const phoneClickHandler = useFloatingStore(s => s.phoneClickHandler)

  const {
    setActiveCampaign, setExtensionLoggedIn, setCallState, setDispositions,
  } = useDialerStore()

  const webphoneConfigured = sipConfig?.isConfigured ?? false
  const webphoneOk = webphoneConfigured && phoneRegistered

  // ── Campaigns query ────────────────────────────────────────────────────────
  const { data: campaignsData, isLoading, error } = useQuery({
    queryKey: ['agent-campaigns-studio'],
    queryFn:  () => dialerService.getAgentCampaigns(),
  })

  const rawCampaigns: Campaign[] = (campaignsData?.data?.data || []).map(
    (c: Record<string, unknown>) => ({
      ...c,
      campaign_name: (c.campaign_name ?? c.title ?? '') as string,
      status:        (c.campaign_status ?? (Number(c.status) === 1 ? 'active' : 'inactive')) as 'active' | 'inactive',
      dial_mode:     (c.dial_mode ?? 'predictive_dial') as Campaign['dial_mode'],
      dial_ratio:    Number(c.dial_ratio ?? c.call_ratio ?? 1),
      total_leads:   c.total_leads  !== undefined ? Number(c.total_leads)  : undefined,
      called_leads:  c.called_leads !== undefined ? Number(c.called_leads) : undefined,
    }),
  )

  const allCampaigns: StudioCampaign[] = rawCampaigns.map(mapCampaign)

  // ── Hydrate campaign from URL once campaigns are loaded ────────────────────
  // Trigger extensionLogin so call state is properly initialised (not just set UI)
  useEffect(() => {
    const raw = searchParams.get('campaign')
    if (!raw || loginMutation.isPending) return
    // Wait until campaigns have finished loading before checking
    if (isLoading) return
    const id = Number(raw)
    if (Number.isNaN(id) || campaign?.id === id || failedCampaignId === id) return
    const match = allCampaigns.find((c) => c.id === id)
    if (match) {
      setUrlCampaignNotFound(false)
      loginMutation.mutate(match)
    } else if (!isLoading && allCampaigns.length >= 0) {
      // Campaigns loaded but this campaign ID not in user's list
      setUrlCampaignNotFound(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCampaigns, isLoading])

  // ── Extension login mutation ───────────────────────────────────────────────
  const loginMutation = useMutation({
    mutationFn: (c: StudioCampaign) => {
      // Block only when SIP credentials are not configured (no alt_extension/extension set).
      // When extension IS configured but WebPhone is not yet registered, allow the
      // extensionLogin to proceed — the extension_live row is inserted directly for WebRTC
      // mode without requiring an active SIP registration. The WebPhone readiness guard
      // is enforced at dial time (handleDial in DialerInterface).
      if (!webphoneConfigured) {
        return Promise.reject(new Error('WebPhone not configured. Contact your administrator to set up your SIP extension.'))
      }
      return dialerService.extensionLogin(c.id).then((res) => ({ res, campaign: c }))
    },
    onSuccess: ({ campaign: c }) => {
      setFailedCampaignId(null)
      const rawCamp = rawCampaigns.find((r) => r.id === c.id)
      if (rawCamp) setActiveCampaign(rawCamp)
      setExtensionLoggedIn(true)
      setCallState('ready')
      dialerService
        .getDispositionsByCampaign(c.id)
        .then((r) => setDispositions(r.data?.data || []))
        .catch(() => {})
      toast.success(`Joined "${c.name}"`)
      setCampaign(c)
      const next = new URLSearchParams(searchParams)
      next.set('campaign', String(c.id))
      next.set('mode', 'dialer')
      setSearchParams(next, { replace: false })
    },
    onError: (err: unknown, variables: StudioCampaign) => {
      setFailedCampaignId(variables.id)
      const backendMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      const localMsg   = (err as Error)?.message
      toast.error(backendMsg ?? localMsg ?? 'Failed to join campaign', { duration: 6000 })
    },
  })

  // ── Navigation handlers ────────────────────────────────────────────────────
  const handleSelectCampaign = useCallback(
    (c: StudioCampaign) => { setFailedCampaignId(null); loginMutation.mutate(c) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginMutation],
  )

  const handleBack = useCallback(() => {
    setCampaign(null)
    setExtensionLoggedIn(false)
    setCallState('idle')
    setActiveCampaign(null)
    dialerService.extensionLogout().catch(() => {})
    const next = new URLSearchParams(searchParams)
    next.delete('campaign')
    next.delete('mode')
    setSearchParams(next, { replace: false })
  }, [searchParams, setSearchParams, setExtensionLoggedIn, setCallState, setActiveCampaign])

  const handleSwitchCampaign = useCallback(
    (c: StudioCampaign) => { loginMutation.mutate(c) },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loginMutation],
  )

  // ── Poll auto-dialer status for the active campaign ───────────────────────
  // Determines whether Asterisk is actively dialing agents (auto-dial mode).
  const { data: dialerStatusData } = useQuery({
    queryKey: ['studio-dialer-status', campaign?.id],
    queryFn: () => campaignDialerService.getCampaignStatus(campaign!.id),
    enabled: !!campaign,
    refetchInterval: 10_000,
  })
  const isAutoDialMode = (dialerStatusData?.data?.dialer_status ?? '') === 'running'

  const errorMsg = error ? 'Failed to load campaigns. Please refresh.' : undefined
  // Show spinner while campaigns load and URL has a campaign param (pending auto-join)
  const urlCampaignPending = !campaign && !isLoading && loginMutation.isPending && !!searchParams.get('campaign')

  return (
    <div key={campaign ? `dialer-${campaign.id}` : 'picker'} className="animate-fadeIn">
      {campaign ? (
        <DialerInterface
          campaign={campaign}
          allCampaigns={allCampaigns}
          webphoneOk={webphoneOk}
          isAutoDialMode={isAutoDialMode}
          onBack={handleBack}
          onSwitchCampaign={handleSwitchCampaign}
        />
      ) : (
        <div className="py-4 space-y-4">
          {/* WebPhone not configured — hard block, can't dial at all */}
          {!webphoneConfigured && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
              <AlertTriangle size={18} className="text-slate-500 shrink-0" />
              <p className="text-sm text-slate-600">
                WebPhone not configured. Contact your administrator to set up your SIP extension.
              </p>
            </div>
          )}

          {/* WebPhone configured but not registered — soft warning, campaign join still works */}
          {webphoneConfigured && !webphoneOk && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle size={18} className="text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">WebPhone Not Connected</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  You can select a campaign, but you must connect WebPhone before making calls.
                </p>
              </div>
              <button
                onClick={() => { if (phoneClickHandler) phoneClickHandler(); else setPhoneOpen(true) }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
              >
                <PhoneCall size={13} /> Connect
              </button>
            </div>
          )}

          {/* WebPhone ready */}
          {webphoneOk && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                WebPhone Connected — select a campaign to begin
              </p>
            </div>
          )}

          {/* URL campaign auto-join in progress */}
          {urlCampaignPending && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <Loader2 size={18} className="text-indigo-500 shrink-0 animate-spin" />
              <p className="text-sm font-semibold text-indigo-800">
                Joining campaign…
              </p>
            </div>
          )}

          {/* URL campaign not found / no access */}
          {urlCampaignNotFound && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200">
              <ShieldAlert size={18} className="text-rose-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-rose-800">Campaign Not Accessible</p>
                <p className="text-xs text-rose-700 mt-0.5">
                  Campaign #{searchParams.get('campaign')} is not assigned to your account or is outside its calling hours.
                  Select a campaign below or contact your administrator.
                </p>
              </div>
            </div>
          )}

          <CampaignPicker
            campaigns={allCampaigns}
            onSelect={handleSelectCampaign}
            isLoading={isLoading || loginMutation.isPending}
            error={errorMsg}
            webphoneConfigured={webphoneConfigured}
            webphoneOk={webphoneOk}
          />
        </div>
      )}
    </div>
  )
}
