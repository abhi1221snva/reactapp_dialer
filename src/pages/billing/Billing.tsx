import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CreditCard, DollarSign, TrendingUp, Package, Plus, Zap, CheckCircle2, ReceiptText } from 'lucide-react'
import api from '../../api/axios'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Badge } from '../../components/ui/Badge'
import { formatDateTime } from '../../utils/format'
import { cn } from '../../utils/cn'

const TABS = ['Overview', 'Transactions', 'Packages']

const billingService = {
  getWallet: () => api.get('/billing/wallet'),
  getTransactions: (params?: Record<string, unknown>) => api.get('/billing/transactions', { params }),
  getPackages: () => api.get('/billing/packages'),
}

interface Transaction { id: number; type: string; amount: number; description: string; created_at: string; status: string; [key: string]: unknown }
interface Package { id: number; name: string; price: number; minutes: number; sms_credits: number; features?: string[]; popular?: boolean; [key: string]: unknown }

export function Billing() {
  const [tab, setTab] = useState('Overview')

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: billingService.getWallet,
  })

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => billingService.getTransactions(),
    enabled: tab === 'Transactions',
  })

  const { data: pkgData, isLoading: pkgLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: billingService.getPackages,
    enabled: tab === 'Packages',
  })

  const wallet = walletData?.data?.data || {}
  const transactions: Transaction[] = txData?.data?.data || []
  const packages: Package[] = pkgData?.data?.data || []

  const txColumns: Column<Transaction>[] = [
    {
      key: 'id', header: '#',
      render: r => <span className="text-xs font-mono text-slate-500">#{r.id}</span>,
    },
    {
      key: 'type', header: 'Type',
      render: r => <Badge variant={r.type === 'credit' ? 'green' : 'red'}>{r.type}</Badge>,
    },
    {
      key: 'description', header: 'Description',
      render: r => <span className="text-sm text-slate-700">{r.description}</span>,
    },
    {
      key: 'amount', header: 'Amount',
      render: r => (
        <span className={cn('text-sm font-bold', r.type === 'credit' ? 'text-emerald-700' : 'text-red-600')}>
          {r.type === 'credit' ? '+' : '-'}${Math.abs(Number(r.amount)).toFixed(2)}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => <Badge variant={r.status === 'completed' ? 'green' : r.status === 'pending' ? 'yellow' : 'gray'}>{r.status}</Badge>,
    },
    {
      key: 'created_at', header: 'Date',
      render: r => <span className="text-xs text-slate-500">{formatDateTime(r.created_at)}</span>,
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="page-subtitle">Manage your account balance and payments</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-sm shadow-md shadow-indigo-200 hover:shadow-indigo-300 transition-all">
          <Plus size={15} /> Add Credits
        </button>
      </div>

      {/* Wallet card */}
      <div
        className="rounded-2xl p-6 text-white overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #0ea5e9 100%)' }}
      >
        {/* Decorative circle */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative">
          <p className="text-white/70 text-sm font-medium uppercase tracking-wide">Current Balance</p>
          <p className="text-5xl font-bold mt-1 tabular-nums">${Number(wallet.balance ?? 0).toFixed(2)}</p>

          <div className="flex items-center gap-8 mt-6 pt-5 border-t border-white/20">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide font-medium">Minutes Used</p>
              <p className="font-bold text-lg mt-0.5">{wallet.minutes_used ?? 0}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide font-medium">SMS Sent</p>
              <p className="font-bold text-lg mt-0.5">{wallet.sms_used ?? 0}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wide font-medium">Plan</p>
              <p className="font-bold text-lg mt-0.5">{wallet.plan ?? 'Pay-as-you-go'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'This Month', value: `$${Number(wallet.month_spent ?? 0).toFixed(2)}`, icon: DollarSign, gradient: 'from-indigo-500 to-violet-600' },
          { label: 'Total Calls', value: wallet.total_calls ?? 0, icon: TrendingUp, gradient: 'from-sky-500 to-blue-600' },
          { label: 'Active Plan', value: wallet.plan ?? 'None', icon: Package, gradient: 'from-emerald-500 to-teal-600' },
        ].map(stat => (
          <div key={stat.label} className="card flex items-center gap-4">
            <div className={cn('w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0 shadow-sm', stat.gradient)}>
              <stat.icon size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className="font-bold text-slate-900 mt-0.5">{String(stat.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors',
              tab === t
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="card flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <CreditCard size={32} className="text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">No payment method added</p>
            <p className="text-sm text-slate-400 mt-1">Add a payment method to manage billing easily</p>
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors">
            <CreditCard size={15} /> Add Payment Method
          </button>
        </div>
      )}

      {tab === 'Transactions' && (
        <div className="card overflow-hidden p-0">
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
            <ReceiptText size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Transaction History</h3>
          </div>
          <DataTable columns={txColumns} data={transactions} loading={txLoading} emptyText="No transactions yet" />
        </div>
      )}

      {tab === 'Packages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {pkgLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card animate-pulse space-y-4">
              <div className="h-6 bg-slate-200 rounded w-2/3" />
              <div className="h-12 bg-slate-200 rounded" />
              <div className="space-y-2">
                {[1,2,3].map(j => <div key={j} className="h-4 bg-slate-200 rounded" />)}
              </div>
            </div>
          ))}
          {packages.map((pkg, i) => {
            const isPopular = pkg.popular || i === 1
            return (
              <div
                key={pkg.id}
                className={cn(
                  'card relative overflow-hidden transition-all hover:shadow-lg',
                  isPopular && 'ring-2 ring-indigo-500 shadow-indigo-100 shadow-lg'
                )}
              >
                {isPopular && (
                  <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-[11px] font-bold">
                      <Zap size={10} /> Popular
                    </span>
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4">
                  <Package size={20} className="text-white" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">{pkg.name}</h3>
                <div className="flex items-end gap-1 mt-2 mb-5">
                  <span className="text-4xl font-bold text-indigo-600">${pkg.price}</span>
                  <span className="text-slate-500 text-sm mb-1">/mo</span>
                </div>
                <div className="space-y-2.5 text-sm text-slate-600">
                  {[
                    `${pkg.minutes} minutes`,
                    `${pkg.sms_credits} SMS credits`,
                    ...(pkg.features ?? []),
                  ].map((f, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button className={cn(
                  'w-full mt-6 py-2.5 rounded-xl font-semibold text-sm transition-all',
                  isPopular
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-200 hover:shadow-indigo-300'
                    : 'border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-700'
                )}>
                  Subscribe
                </button>
              </div>
            )
          })}
          {!pkgLoading && packages.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Package size={36} className="text-slate-300" />
              <p className="text-sm">No packages available</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
