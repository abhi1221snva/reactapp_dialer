import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Wifi, MessageSquare, Clock, DollarSign,
  CheckCircle, AlertTriangle, Settings, Unlink,
  Zap, Hash, BarChart3,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { plivoService } from '../../services/plivo.service'
import type { PlivoAccount } from '../../types/plivo.types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'indigo',
}: {
  icon: React.ComponentType<any>
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    rose:   'bg-rose-50 text-rose-600',
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] ?? colors.indigo}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function ConnectForm({ onConnected }: { onConnected: () => void }) {
  const [mode, setMode] = useState<'own' | 'platform'>('own')
  const [form, setForm] = useState({ auth_id: '', auth_token: '' })

  const connectMutation = useMutation({
    mutationFn: () => plivoService.connect(form),
    onSuccess: () => {
      toast.success('Plivo account connected!')
      onConnected()
    },
    onError: () => toast.error('Failed to connect. Check your credentials.'),
  })

  const subMutation = useMutation({
    mutationFn: () => plivoService.createSubaccount('My Dialer Account'),
    onSuccess: () => {
      toast.success('Platform subaccount created!')
      onConnected()
    },
    onError: () => toast.error('Failed to create subaccount.'),
  })

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Phone size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Connect Plivo</h2>
              <p className="text-xs text-slate-500">Enable phone numbers, SMS, and calling</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden mb-6">
            {(['own', 'platform'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {m === 'own' ? 'My Plivo Account' : 'Platform Subaccount'}
              </button>
            ))}
          </div>

          {mode === 'own' ? (
            <form
              onSubmit={(e) => { e.preventDefault(); connectMutation.mutate() }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Auth ID</label>
                <input
                  value={form.auth_id}
                  onChange={(e) => setForm({ ...form, auth_id: e.target.value })}
                  placeholder="MAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Auth Token</label>
                <input
                  type="password"
                  value={form.auth_token}
                  onChange={(e) => setForm({ ...form, auth_token: e.target.value })}
                  placeholder="Your Plivo Auth Token"
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={connectMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {connectMutation.isPending ? 'Verifying…' : 'Connect Account'}
              </button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-sm text-slate-600">
                We'll create a Plivo subaccount under the platform's master account.
                Your numbers and usage are fully isolated.
              </p>
              <button
                onClick={() => subMutation.mutate()}
                disabled={subMutation.isPending}
                className="w-full py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {subMutation.isPending ? 'Creating…' : 'Create Platform Subaccount'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AccountCard({ account, onDisconnect }: { account: PlivoAccount; onDisconnect: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
        <CheckCircle size={20} className="text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {account.name ?? 'Plivo Account'}
        </p>
        <p className="text-xs text-slate-500">
          {account.has_own_account ? 'Own account' : 'Platform subaccount'} •{' '}
          Token: {account.masked_token}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
          account.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {account.status}
        </span>
        <button
          onClick={() => navigate('/plivo/numbers')}
          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Manage numbers"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={onDisconnect}
          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Disconnect"
        >
          <Unlink size={14} />
        </button>
      </div>
    </div>
  )
}

export function PlivoDashboard() {
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data: accountData, isLoading: accountLoading } = useQuery({
    queryKey: ['plivo-account'],
    queryFn:  () => plivoService.getAccount(),
  })

  const { data: usageData } = useQuery({
    queryKey: ['plivo-usage'],
    queryFn:  () => plivoService.getUsage(),
    enabled:  !!accountData?.data?.data?.account,
  })

  const { data: numbersData } = useQuery({
    queryKey: ['plivo-numbers', { limit: 1 }],
    queryFn:  () => plivoService.listNumbers({ limit: 1 }),
    enabled:  !!accountData?.data?.data?.account,
  })

  const { data: callsData } = useQuery({
    queryKey: ['plivo-calls', { limit: 1 }],
    queryFn:  () => plivoService.listCalls({ limit: 1 }),
    enabled:  !!accountData?.data?.data?.account,
  })

  const { data: smsData } = useQuery({
    queryKey: ['plivo-sms', { limit: 1 }],
    queryFn:  () => plivoService.listSms({ limit: 1 }),
    enabled:  !!accountData?.data?.data?.account,
  })

  const disconnectMutation = useMutation({
    mutationFn: () => plivoService.disconnect(),
    onSuccess: () => {
      toast.success('Plivo account disconnected')
      qc.invalidateQueries({ queryKey: ['plivo-account'] })
    },
  })

  const account = accountData?.data?.data?.account
  const summary = usageData?.data?.data?.summary

  if (accountLoading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Plivo Telecom</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your Plivo telephony infrastructure</p>
        </div>
        {account && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/plivo/numbers')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <Hash size={14} />
              Numbers
            </button>
            <button
              onClick={() => navigate('/plivo/usage')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <BarChart3 size={14} />
              Usage
            </button>
          </div>
        )}
      </div>

      {/* Account card */}
      {account ? (
        <AccountCard
          account={account}
          onDisconnect={() => disconnectMutation.mutate()}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            No Plivo account connected. Connect below to start managing phone numbers and calling.
          </p>
        </div>
      )}

      {/* Stats grid */}
      {account && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Hash}
            label="Phone Numbers"
            value={numbersData?.data?.data?.total ?? 0}
            color="indigo"
          />
          <StatCard
            icon={Phone}
            label="Total Calls"
            value={summary?.total_calls ?? callsData?.data?.data?.total ?? 0}
            color="green"
          />
          <StatCard
            icon={MessageSquare}
            label="SMS Sent"
            value={summary?.total_sms ?? smsData?.data?.data?.total ?? 0}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Minutes Used"
            value={summary?.minutes_used ? `${summary.minutes_used.toFixed(1)}m` : '0m'}
            color="orange"
          />
        </div>
      )}

      {/* Spend card */}
      {account && summary && (
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200 text-xs font-medium uppercase tracking-wide">This Month's Spend</p>
              <p className="text-3xl font-bold mt-1">${summary.total_spend.toFixed(2)}</p>
              <p className="text-green-200 text-xs mt-1">
                {summary.total_calls} calls · {summary.total_sms} SMS · {summary.minutes_used.toFixed(1)} min
              </p>
            </div>
            <DollarSign size={40} className="text-green-300 opacity-60" />
          </div>
        </div>
      )}

      {/* Quick links */}
      {account && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Search & Buy Numbers',   icon: Hash,          path: '/plivo/numbers', color: 'indigo' },
              { label: 'SIP Trunks',             icon: Wifi,          path: '/plivo/trunks',  color: 'blue'   },
              { label: 'Call Logs',              icon: Phone,         path: '/plivo/calls',   color: 'green'  },
              { label: 'SMS Logs',               icon: MessageSquare, path: '/plivo/sms',     color: 'purple' },
              { label: 'Usage & Billing',        icon: BarChart3,     path: '/plivo/usage',   color: 'orange' },
              { label: 'AI Voice (Streaming)',   icon: Zap,           path: '/ai/coach',      color: 'rose'   },
            ].map(({ label, icon: Icon, path, color }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all text-left group"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-${color}-50 text-${color}-600 flex-shrink-0`}>
                  <Icon size={16} />
                </div>
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!account && (
        <ConnectForm onConnected={() => qc.invalidateQueries({ queryKey: ['plivo-account'] })} />
      )}
    </div>
  )
}
