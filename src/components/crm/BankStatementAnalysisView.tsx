import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDown, ChevronUp, ShieldAlert, DollarSign, TrendingUp,
  ArrowUpRight, ArrowDownRight, Search, Receipt, Loader2,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '../../utils/cn'
import { bankStatementService, type BankStatementSession } from '../../services/bankStatement.service'

// ── Helpers ─────────────────────────────────────────────────────────────────────

function fmt(n: number | string | null | undefined, decimals = 0): string {
  if (n === null || n === undefined || n === '') return '$0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

function fmtNum(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === '') return '0'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '0'
  return new Intl.NumberFormat('en-US').format(num)
}

function num(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return isNaN(n) ? 0 : n
}

// ── Colored Section ─────────────────────────────────────────────────────────────

function ColoredSection({
  title,
  color,
  borderColor,
  children,
  defaultOpen = true,
}: {
  title: string
  color: string
  borderColor: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn('rounded-lg border-2 overflow-hidden', borderColor)}>
      <div
        className={cn(
          'px-4 py-2.5 flex items-center justify-between cursor-pointer select-none',
          color
        )}
        onClick={() => setOpen(!open)}
      >
        <h3 className="text-sm font-bold text-white">{title}</h3>
        {open ? (
          <ChevronUp size={16} className="text-white/80" />
        ) : (
          <ChevronDown size={16} className="text-white/80" />
        )}
      </div>
      {open && children}
    </div>
  )
}

// ── Stat Box ────────────────────────────────────────────────────────────────────

function StatBox({
  label,
  value,
  borderColor,
  className,
}: {
  label: string
  value: ReactNode
  borderColor?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'bg-gray-50 rounded-lg p-3 text-center border',
        borderColor ?? 'border-gray-200',
        className
      )}
    >
      <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  )
}

// ── Monthly Bank Details ────────────────────────────────────────────────────────

function MonthlySection({ monthly }: { monthly: Record<string, unknown>[] }) {
  const totals = useMemo(() => {
    const t = {
      deposits: 0,
      adjustments: 0,
      true_revenue: 0,
      avg_daily_balance: 0,
      nsf: 0,
      deposit_count: 0,
      negative_days: 0,
      debits: 0,
    }
    for (const m of monthly) {
      const row = m as Record<string, unknown>
      t.deposits += num(row.deposits)
      t.adjustments += num(row.adjustments)
      t.true_revenue += num(row.true_revenue)
      t.avg_daily_balance += num(row.avg_daily_balance ?? row.average_daily_balance)
      const nsfObj = row.nsf as Record<string, unknown> | undefined
      t.nsf += num(nsfObj?.nsf_fee_count ?? row.nsf_count)
      t.deposit_count += num(row.deposit_count ?? row.credit_count)
      t.negative_days += num(row.negative_days)
      t.debits += num(row.debits ?? row.total_debits)
    }
    return t
  }, [monthly])

  const avg = useMemo(() => {
    const n = monthly.length || 1
    return {
      deposits: totals.deposits / n,
      adjustments: totals.adjustments / n,
      true_revenue: totals.true_revenue / n,
      avg_daily_balance: totals.avg_daily_balance / n,
      nsf: totals.nsf / n,
      deposit_count: totals.deposit_count / n,
      negative_days: totals.negative_days / n,
      debits: totals.debits / n,
    }
  }, [totals, monthly.length])

  return (
    <ColoredSection title="Monthly Bank Details" color="bg-green-600" borderColor="border-green-500">
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-green-50 border-b border-green-200">
              <th className="px-4 py-2.5 text-left text-xs font-bold text-green-800 uppercase tracking-wide">Month</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Monthly Deposits</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Adjustments</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">True Revenue</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Average Daily Balance</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide">NSF / Overdraft</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide">Number of Deposits</th>
              <th className="px-3 py-2.5 text-center text-xs font-bold text-green-800 uppercase tracking-wide">Negative Days</th>
              <th className="px-3 py-2.5 text-right text-xs font-bold text-green-800 uppercase tracking-wide">Total Debits</th>
            </tr>
          </thead>
          <tbody>
            {monthly.map((mRaw, i) => {
              const m = mRaw as Record<string, unknown>
              const nsfObj = m.nsf as Record<string, unknown> | undefined
              const nsfCount = num(nsfObj?.nsf_fee_count ?? m.nsf_count)
              const negDays = num(m.negative_days)
              return (
                <tr
                  key={i}
                  className={cn(
                    'border-b border-gray-100 hover:bg-green-50/40 transition-colors',
                    i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  )}
                >
                  <td className="px-4 py-2.5 text-sm font-semibold text-gray-800">
                    {(m.month_name as string) ?? (m.month_key as string)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-700 font-medium">
                    {fmt(m.deposits as number)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-gray-600">
                    {fmt(m.adjustments as number)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-gray-900 font-bold">
                    {fmt(m.true_revenue as number)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-blue-700">
                    {fmt((m.avg_daily_balance as number) ?? (m.average_daily_balance as number))}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-block min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold',
                        nsfCount > 0 ? 'bg-amber-100 text-amber-800' : 'text-gray-400'
                      )}
                    >
                      {nsfCount}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-sm text-gray-600 font-medium">
                    {num(m.deposit_count ?? m.credit_count)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span
                      className={cn(
                        'inline-block min-w-[24px] px-1.5 py-0.5 rounded text-xs font-bold',
                        negDays > 0 ? 'bg-red-100 text-red-800' : 'text-gray-400'
                      )}
                    >
                      {negDays}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-600 font-medium">
                    {fmt((m.debits as number) ?? (m.total_debits as number))}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-green-100 border-t-2 border-green-300 font-bold">
              <td className="px-4 py-2.5 text-sm font-bold text-green-900">Total</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.deposits)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.adjustments)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.true_revenue)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">—</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.nsf}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.deposit_count}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-900 font-bold">{totals.negative_days}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-900">{fmt(totals.debits)}</td>
            </tr>
            <tr className="bg-green-50 font-semibold">
              <td className="px-4 py-2.5 text-sm font-semibold text-green-800">Monthly Average</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.deposits)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.adjustments)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.true_revenue)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.avg_daily_balance)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.nsf.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.deposit_count.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-center text-sm text-green-800 font-semibold">{avg.negative_days.toFixed(1)}</td>
              <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-green-800">{fmt(avg.debits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ColoredSection>
  )
}

// ── MCA Detection ───────────────────────────────────────────────────────────────

function McaSection({
  mca,
  lenders,
}: {
  mca: Record<string, unknown>
  lenders: Record<string, unknown>[]
}) {
  const mcaCount = num(mca.total_mca_count) || lenders.length
  const riskLevel = mcaCount >= 3 ? 'High' : mcaCount >= 1 ? 'Medium' : 'Low'
  const totalPayments = num(mca.total_mca_payments)
  const totalAmount = num(mca.total_mca_amount)

  return (
    <ColoredSection title="MCA Detection" color="bg-red-600" borderColor="border-red-500">
      <div className="bg-white p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBox label="MCAs Detected" value={mcaCount} borderColor="border-red-300" />
          <StatBox label="Estimated Monthly Payments" value={fmt(totalPayments)} borderColor="border-red-300" />
          <StatBox label="Total MCA Amount" value={fmt(totalAmount)} borderColor="border-red-300" />
          <StatBox label="Risk Level" value={riskLevel} borderColor="border-red-300" />
        </div>

        {lenders.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-red-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-red-50">
                  <th className="px-4 py-2.5 text-left text-xs font-bold text-red-800 uppercase tracking-wide">Lender</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">Estimated Payment</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-red-800 uppercase tracking-wide">Total Amount</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-red-800 uppercase tracking-wide">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {lenders.map((lRaw, i) => {
                  const l = lRaw as Record<string, unknown>
                  return (
                    <tr
                      key={i}
                      className={cn(
                        'border-b border-red-100 last:border-0',
                        i % 2 === 0 ? 'bg-white' : 'bg-red-50/30'
                      )}
                    >
                      <td className="px-4 py-2.5 text-sm font-semibold text-red-800 flex items-center gap-2">
                        <ShieldAlert size={14} className="text-red-400 shrink-0" />
                        {(l.name as string) ?? (l.lender as string) ?? `Lender ${i + 1}`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-700 font-medium">
                        {l.estimated_payment ? fmt(l.estimated_payment as number) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-600">
                        {l.total_amount ? fmt(l.total_amount as number) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-sm text-red-600">
                        {(l.frequency as string) ?? 'Daily'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {(totalPayments > 0 || totalAmount > 0) && (
                <tfoot>
                  <tr className="bg-red-100 border-t-2 border-red-300 font-bold">
                    <td className="px-4 py-2.5 text-sm font-bold text-red-900">Total</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-900 font-bold">
                      {fmt(totalPayments)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-red-900 font-bold">
                      {fmt(totalAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm text-red-900">—</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </ColoredSection>
  )
}

// ── MCA Offer Calculator ────────────────────────────────────────────────────────

function McaCalculatorSection({
  capacity,
  revenue,
}: {
  capacity: Record<string, unknown>
  revenue: number
}) {
  const [offerAmount, setOfferAmount] = useState('')
  const [factorRate, setFactorRate] = useState('1.35')
  const [term, setTerm] = useState('6')

  const calc = useMemo(() => {
    const amt = parseFloat(offerAmount) || 0
    const factor = parseFloat(factorRate) || 1.35
    const months = parseInt(term) || 6
    const payback = amt * factor
    const dailyPayment = payback / (months * 22)
    const monthlyPayment = payback / months
    const maxDaily = num(capacity.max_daily_payment)
    const remainingCapacity = num(capacity.remaining_daily_capacity)
    const canTake = amt > 0 ? dailyPayment <= remainingCapacity : null
    return { payback, dailyPayment, monthlyPayment, maxDaily, remainingCapacity, canTake }
  }, [offerAmount, factorRate, term, capacity])

  return (
    <ColoredSection title="MCA Offer Calculator" color="bg-blue-600" borderColor="border-blue-500">
      <div className="bg-white p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Offer Amount ($)</label>
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Factor Rate</label>
                <input
                  type="number"
                  step="0.01"
                  value={factorRate}
                  onChange={(e) => setFactorRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Term (months)</label>
                <input
                  type="number"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-800">Revenue: {fmt(revenue)}/mo</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-800">Max Daily Payment: {fmt(calc.maxDaily)}</span>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Total Payback" value={fmt(calc.payback)} borderColor="border-blue-300" />
              <StatBox label="Daily Payment" value={fmt(calc.dailyPayment, 2)} borderColor="border-blue-300" />
              <StatBox label="Monthly Payment" value={fmt(calc.monthlyPayment)} borderColor="border-blue-300" />
              <StatBox label="Remaining Capacity" value={fmt(calc.remainingCapacity)} borderColor="border-blue-300" />
            </div>
            {calc.canTake !== null && (
              <div
                className={cn(
                  'rounded-lg p-3 border-2 text-center',
                  calc.canTake ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                )}
              >
                <span className={cn('text-sm font-bold', calc.canTake ? 'text-green-700' : 'text-red-700')}>
                  {calc.canTake ? 'Can Take This Position' : 'Exceeds Capacity'}
                </span>
                <p className={cn('text-xs mt-0.5', calc.canTake ? 'text-green-600' : 'text-red-600')}>
                  Withhold: {num(capacity.current_withhold_percent)}% / {num(capacity.max_withhold_percentage) || 25}% max
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ColoredSection>
  )
}

// ── Category Distribution ───────────────────────────────────────────────────────

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1']

function CategorySection({
  summary,
  transactions,
}: {
  summary: Record<string, unknown>
  transactions: Record<string, unknown>[]
}) {
  const [catView, setCatView] = useState<'all' | 'credit' | 'debit'>('all')

  const allCategories = useMemo(() => {
    const cats = (summary.categories ?? summary.category_breakdown ?? summary.transaction_categories) as unknown
    if (cats) {
      const list = Array.isArray(cats)
        ? (cats as Record<string, unknown>[]).map((c) => ({
            name: (c.name as string) ?? (c.category as string) ?? 'Other',
            count: num(c.count ?? c.total),
            amount: num(c.amount ?? c.total_amount),
            type: (c.type as string) ?? 'all',
          }))
        : Object.entries(cats as Record<string, unknown>).map(([name, val]) => {
            const v = val as Record<string, unknown> | number
            if (typeof v === 'number') {
              return { name, count: v, amount: 0, type: 'all' }
            }
            return {
              name,
              count: num(v?.count ?? v?.total ?? v),
              amount: num(v?.amount ?? v?.total_amount ?? 0),
              type: (v?.type as string) ?? 'all',
            }
          })
      return list.sort((a, b) => b.count - a.count)
    }
    if (!transactions.length) return []
    const map: Record<string, { count: number; amount: number; type: string }> = {}
    for (const tx of transactions) {
      const cat = ((tx.category as string) || 'Uncategorized')
      if (!map[cat]) map[cat] = { count: 0, amount: 0, type: (tx.type as string) ?? 'all' }
      map[cat].count++
      map[cat].amount += Math.abs(num(tx.amount))
    }
    return Object.entries(map).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count)
  }, [summary, transactions])

  const categories = useMemo(() => {
    if (catView === 'all') return allCategories
    return allCategories.filter((c) => c.type === catView || c.type === 'all')
  }, [allCategories, catView])

  if (allCategories.length === 0) return null

  const grandTotal = categories.reduce((s, c) => s + Math.abs(c.amount), 0)
  const grandCount = categories.reduce((s, c) => s + c.count, 0)
  const pieData = categories.slice(0, 10).map((c) => ({ name: c.name, value: Math.abs(c.amount) }))

  return (
    <div className="rounded-xl border-2 border-purple-500 overflow-hidden bg-white">
      <div className="bg-gradient-to-r from-purple-600 via-purple-600 to-violet-600 px-4 py-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Category Distribution</h3>
            <span className="text-[10px] text-purple-200 hidden sm:inline">
              — {categories.length} categories · {fmtNum(grandCount)} tx · {fmt(grandTotal, 2)}
            </span>
          </div>
          <div className="flex items-center bg-white/15 rounded-md p-0.5">
            {([
              { key: 'all', label: 'All', icon: null },
              { key: 'credit', label: 'Credits', icon: <ArrowDownRight size={11} /> },
              { key: 'debit', label: 'Debits', icon: <ArrowUpRight size={11} /> },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => setCatView(t.key)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded transition-all',
                  catView === t.key ? 'bg-white text-purple-700 shadow-sm' : 'text-white/80 hover:text-white hover:bg-white/10'
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={190} height={190}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => fmt(v as number, 2)}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-extrabold text-gray-900">{grandCount}</span>
                <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">Total Tx</span>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-14">Count</th>
                  <th className="px-2 py-1.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-2 py-1.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-16">Share</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c, i) => {
                  const pct = grandTotal > 0 ? (Math.abs(c.amount) / grandTotal) * 100 : 0
                  const color = PIE_COLORS[i % PIE_COLORS.length]
                  return (
                    <tr key={i} className="border-t border-gray-100 hover:bg-purple-50/30 transition-colors">
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-xs text-gray-900 font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs font-bold text-gray-800">{c.count}</td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums text-xs text-gray-700 font-medium">
                        {fmt(c.amount, 2)}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <span className="text-[11px] font-semibold text-gray-600">{pct.toFixed(1)}%</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-purple-50 border-t-2 border-purple-200">
                  <td className="px-3 py-1.5 text-xs font-bold text-purple-900">Total</td>
                  <td className="px-2 py-1.5 text-center text-xs font-bold text-purple-900">{grandCount}</td>
                  <td className="px-2 py-1.5 text-right font-mono tabular-nums text-xs font-bold text-purple-900">
                    {fmt(grandTotal, 2)}
                  </td>
                  <td className="px-2 py-1.5 text-center text-xs font-bold text-purple-900">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Transactions Section ────────────────────────────────────────────────────────

function TransactionsSection({
  transactions,
  isLoading: txLoading,
}: {
  transactions: Record<string, unknown>[]
  isLoading: boolean
}) {
  const [txTab, setTxTab] = useState<'all' | 'credit' | 'debit'>('all')
  const [txSearch, setTxSearch] = useState('')

  const viewTransactions = txTab === 'all'
    ? transactions
    : transactions.filter((tx) => (tx.type as string) === txTab)

  const filteredTx = txSearch
    ? viewTransactions.filter((tx) =>
        ((tx.description as string) ?? '').toLowerCase().includes(txSearch.toLowerCase())
      )
    : viewTransactions

  return (
    <div className="rounded-lg border-2 border-sky-500 overflow-hidden">
      <div className="bg-sky-600 px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-bold text-white">Transactions ({filteredTx.length})</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-200" />
            <input
              type="text"
              placeholder="Search..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="pl-7 pr-3 py-1.5 text-xs bg-sky-700/50 text-white placeholder-sky-200 border border-sky-400 rounded-lg w-40 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <div className="flex bg-sky-700/50 rounded-lg p-0.5 border border-sky-400">
            {([['all', 'All'], ['credit', 'Credit View'], ['debit', 'Debit View']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTxTab(key)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-semibold transition-all',
                  txTab === key ? 'bg-white text-sky-700 shadow-sm' : 'text-sky-100 hover:text-white'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-white">
        {txLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : !filteredTx.length ? (
          <div className="flex flex-col items-center py-12 gap-2">
            <Receipt size={24} className="text-gray-200" />
            <p className="text-sm text-gray-400">{txSearch ? 'No matches found' : 'No transactions'}</p>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-12">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Description</th>
                  <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2.5 text-right text-xs font-bold text-gray-500 uppercase">Amount</th>
                  <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-20">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map((tx, i) => {
                  const isCredit = tx.type === 'credit'
                  const txDate = (tx.transaction_date as string) ?? (tx.date as string) ?? null
                  const displayDate = txDate
                    ? new Date(txDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'
                  return (
                    <tr
                      key={(tx.id as number) ?? i}
                      className={cn(
                        'border-b border-gray-100 last:border-0 hover:bg-sky-50/40 transition-colors',
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                      )}
                    >
                      <td className="px-3 py-2 text-center text-xs text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{displayDate}</td>
                      <td className="px-3 py-2 text-sm text-gray-800 font-medium max-w-[260px] truncate">
                        {(tx.description as string) ?? '—'}
                      </td>
                      <td className="px-3 py-2">
                        {tx.category ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {tx.category as string}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          'px-3 py-2 text-right font-mono tabular-nums text-sm font-bold whitespace-nowrap',
                          isCredit ? 'text-green-700' : 'text-red-600'
                        )}
                      >
                        {isCredit ? '+' : '-'}
                        {fmt(tx.amount as number)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                            isCredit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          )}
                        >
                          {isCredit ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {isCredit ? 'Credit' : 'Debit'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Analysis View ──────────────────────────────────────────────────────────

export function BankStatementAnalysisView({
  session,
  leadId,
  title = 'Combined Analysis Summary',
}: {
  session: BankStatementSession
  leadId?: number
  title?: string
}) {
  const summary = (typeof session.summary_data === 'string'
    ? JSON.parse(session.summary_data)
    : session.summary_data) as Record<string, unknown> | null
  const mca = (typeof session.mca_analysis === 'string'
    ? JSON.parse(session.mca_analysis)
    : session.mca_analysis) as Record<string, unknown> | null
  const monthlyRaw = (typeof session.monthly_data === 'string'
    ? JSON.parse(session.monthly_data)
    : session.monthly_data) as Record<string, unknown> | Record<string, unknown>[] | null

  const monthlyObj = (!Array.isArray(monthlyRaw) ? monthlyRaw : null) as Record<string, unknown> | null
  const monthly = (Array.isArray(monthlyRaw)
    ? monthlyRaw
    : (monthlyObj?.months ?? [])) as Record<string, unknown>[]
  const mcaCapacity = monthlyObj?.mca_capacity as Record<string, unknown> | null | undefined

  const nsfObj = summary?.nsf as Record<string, unknown> | undefined
  const nsfCount = num(nsfObj?.nsf_fee_count ?? summary?.nsf_count ?? session.nsf_count)
  const mcaCount = num(mca?.total_mca_count)
  const mcaDetected = mcaCount > 0
  const mcaLenders = (mca?.lenders ?? []) as Record<string, unknown>[]
  const revenue = num(summary?.true_revenue ?? session.total_revenue)
  const deposits = num(summary?.total_credits ?? session.total_deposits)
  const totalDebits = num(summary?.total_debits)
  const avgDailyBal = num(summary?.average_daily_balance)
  const avgLedgerBal = num(summary?.average_ledger_balance ?? summary?.ending_balance)
  const adjustments = num(summary?.adjustments)
  const totalTx = num(summary?.total_transactions)

  const hasTransactions = !!leadId && !!session.session_id && leadId > 0 && session.session_id !== '__combined__'

  // Fetch transactions for this statement — used by both TransactionsSection
  // and as a fallback source for CategorySection when summary.categories is absent.
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ['bs-transactions-compliance', leadId, session.session_id],
    queryFn: async () => {
      const res = await bankStatementService.getTransactions(leadId!, session.session_id)
      return (res.data?.data ?? []) as Record<string, unknown>[]
    },
    enabled: hasTransactions,
  })
  const transactions = txData ?? []

  return (
    <div className="space-y-4">
      {/* ═══ Combined Analysis Summary ═══ */}
      <div className="rounded-lg border-2 border-green-500 overflow-hidden">
        <div className="bg-green-600 px-4 py-2.5">
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <div className="bg-white p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
            <StatBox label="Total Transactions" value={fmtNum(totalTx)} />
            <StatBox label="Total Deposits" value={fmt(deposits)} />
            <StatBox label="Adjustments" value={fmt(adjustments)} />
            <StatBox label="True Revenue" value={fmt(revenue)} borderColor="border-green-300" />
            <StatBox label="Total Debits" value={fmt(totalDebits)} />
            <StatBox
              label="NSF / Overdraft Fees"
              value={fmtNum(nsfCount)}
              borderColor={nsfCount > 0 ? 'border-amber-300' : undefined}
            />
            <StatBox label="Average Daily Balance" value={fmt(avgDailyBal)} borderColor="border-blue-300" />
            <StatBox label="Average Ledger Balance" value={fmt(avgLedgerBal)} borderColor="border-indigo-300" />
          </div>
        </div>
      </div>

      {/* ═══ Monthly Bank Details ═══ */}
      {monthly.length > 0 && <MonthlySection monthly={monthly} />}

      {/* ═══ MCA Detection ═══ */}
      {mcaDetected && mca && <McaSection mca={mca} lenders={mcaLenders} />}

      {/* ═══ MCA Offer Calculator ═══ */}
      {mcaDetected && mcaCapacity && (
        <McaCalculatorSection capacity={mcaCapacity} revenue={revenue} />
      )}

      {/* ═══ Category Distribution ═══ */}
      {summary && <CategorySection summary={summary} transactions={transactions} />}

      {/* ═══ Transactions ═══ */}
      {hasTransactions && (
        <TransactionsSection transactions={transactions} isLoading={txLoading} />
      )}
    </div>
  )
}
