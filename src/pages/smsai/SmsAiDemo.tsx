import { useQuery } from '@tanstack/react-query'
import {
  BrainCircuit, Wallet, ArrowRight, Radio, List, BarChart3, FileText,
  DollarSign, Clock, ArrowLeft,
} from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { smsAiService } from '../../services/smsAi.service'
import api from '../../api/axios'

interface WalletData {
  id?: number
  balance?: number | string
  currency_code?: string
  [key: string]: unknown
}

interface Transaction {
  id?: number
  amount?: number | string
  transaction_type?: string
  description?: string
  created_at?: string
  [key: string]: unknown
}

interface AiSetting {
  id?: number
  introduction?: string
  description?: string
  cli?: string
  webhook_url?: string
  sms_ai_api_url?: string
  [key: string]: unknown
}

export function SmsAiDemo() {
  const navigate = useNavigate()

  // Wallet balance
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['smsai-wallet'],
    queryFn: () => smsAiService.getWalletAmount(),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wallet: WalletData | null = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = walletData as any
    const arr = r?.data?.data ?? r?.data
    return Array.isArray(arr) ? arr[0] ?? null : arr ?? null
  })()

  // Recent transactions
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['smsai-wallet-tx'],
    queryFn: () => smsAiService.getWalletTransactions({ start: 0, limit: 5 }),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transactions: Transaction[] = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = txData as any
    return r?.data?.data ?? r?.data ?? []
  })()

  // AI settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ['sms-ai-setting'],
    queryFn: () => api.get('/open-ai-setting'),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setting: AiSetting | null = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = settingsData as any
    return r?.data?.data?.[0] ?? r?.data?.[0] ?? null
  })()

  // Campaign count
  const { data: campaignsData } = useQuery({
    queryKey: ['smsai-campaigns-count'],
    queryFn: () => smsAiService.listAll(),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const campaignCount = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = campaignsData as any
    const arr = r?.data?.data ?? r?.data ?? []
    return Array.isArray(arr) ? arr.length : 0
  })()

  const quickLinks = [
    { to: '/smsai/campaigns', label: 'Campaigns', icon: Radio, count: campaignCount, color: 'bg-indigo-50 text-indigo-600' },
    { to: '/smsai/lists', label: 'Lists', icon: List, color: 'bg-emerald-50 text-emerald-600' },
    { to: '/smsai/reports', label: 'Reports', icon: BarChart3, color: 'bg-amber-50 text-amber-600' },
    { to: '/smsai/templates', label: 'Templates', icon: FileText, color: 'bg-violet-50 text-violet-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/dashboard')} className="btn-ghost p-2 rounded-lg mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="page-header">
            <div>
              <h1 className="page-title">SMS AI Dashboard</h1>
              <p className="page-subtitle">Overview of your AI-powered SMS platform</p>
            </div>
            <Link to="/ai/settings" className="btn-outline text-sm">
              AI Settings <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {quickLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="card p-4 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${link.color}`}>
                <link.icon size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{link.label}</p>
                {link.count !== undefined && (
                  <p className="text-xs text-slate-400">{link.count} active</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Wallet Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Wallet size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">Wallet Balance</h2>
              <p className="text-xs text-slate-500">SMS AI credit balance</p>
            </div>
          </div>

          {walletLoading ? (
            <div className="h-12 bg-slate-100 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2 mb-4">
              <DollarSign size={20} className="text-emerald-600" />
              <span className="text-3xl font-bold text-slate-900">
                {wallet?.balance != null ? Number(wallet.balance).toFixed(2) : '0.00'}
              </span>
              <span className="text-sm text-slate-400">{wallet?.currency_code || 'USD'}</span>
            </div>
          )}

          {/* Recent Transactions */}
          <div className="border-t border-slate-100 pt-3 mt-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Recent Transactions</h3>
            {txLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-slate-400 py-3 text-center">No transactions yet</p>
            ) : (
              <div className="space-y-1.5">
                {transactions.map((tx, idx) => (
                  <div key={tx.id ?? idx} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        tx.transaction_type === 'credit' ? 'bg-emerald-500' : 'bg-red-400'
                      }`} />
                      <span className="text-sm text-slate-700 truncate">{tx.description || tx.transaction_type || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-semibold ${
                        tx.transaction_type === 'credit' ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {tx.transaction_type === 'credit' ? '+' : '-'}${Number(tx.amount ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI Configuration Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <BrainCircuit size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-base">AI Configuration</h2>
              <p className="text-xs text-slate-500">Current SMS AI settings</p>
            </div>
          </div>

          {settingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !setting ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <BrainCircuit size={24} className="text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 mb-3">No SMS AI settings configured yet</p>
              <Link to="/ai/settings" className="btn-primary text-sm">
                Configure AI Settings
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                <span className="text-xs font-medium text-slate-500">CLI / Phone Number</span>
                <p className="text-sm text-slate-800 font-mono mt-0.5">{setting.cli || '—'}</p>
              </div>
              {setting.introduction && (
                <div className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-500">Introduction</span>
                  <p className="text-sm text-slate-700 mt-0.5 line-clamp-2">{setting.introduction}</p>
                </div>
              )}
              {setting.description && (
                <div className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-500">System Description</span>
                  <p className="text-sm text-slate-700 mt-0.5 line-clamp-3">{setting.description}</p>
                </div>
              )}
              {setting.webhook_url && (
                <div className="px-3 py-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-500">Webhook URL</span>
                  <p className="text-sm text-slate-700 font-mono mt-0.5 truncate">{setting.webhook_url}</p>
                </div>
              )}
              <div className="pt-2">
                <Link to="/ai/settings" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Edit Settings <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
