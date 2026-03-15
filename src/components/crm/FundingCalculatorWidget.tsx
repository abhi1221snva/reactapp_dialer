import { useState } from 'react'
import { Calculator } from 'lucide-react'

interface CalcResult {
  totalPayback: number
  dailyPayment: number
  effectiveApr: number
  grossPoints: number
}

function calcDeal(amount: number, factorRate: number, termDays: number): CalcResult {
  const totalPayback = amount * factorRate
  const dailyPayment = totalPayback / termDays
  const cost = totalPayback - amount
  const effectiveApr = termDays > 0 ? (cost / amount) / (termDays / 365) * 100 : 0
  const grossPoints = (factorRate - 1) * 100
  return { totalPayback, dailyPayment, effectiveApr, grossPoints }
}

export function FundingCalculatorWidget() {
  const [amount, setAmount] = useState('')
  const [factorRate, setFactorRate] = useState('')
  const [termDays, setTermDays] = useState('')

  const result: CalcResult | null = (() => {
    const a = parseFloat(amount), f = parseFloat(factorRate), t = parseInt(termDays)
    if (isNaN(a) || isNaN(f) || isNaN(t) || a <= 0 || f <= 0 || t <= 0) return null
    return calcDeal(a, f, t)
  })()

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator size={16} className="text-emerald-600" />
        <h3 className="text-sm font-semibold text-slate-800">Funding Calculator</h3>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Funded Amount</label>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="50000"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Factor Rate</label>
          <input
            type="number"
            step="0.01"
            value={factorRate}
            onChange={e => setFactorRate(e.target.value)}
            placeholder="1.35"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1 block">Term (Days)</label>
          <input
            type="number"
            value={termDays}
            onChange={e => setTermDays(e.target.value)}
            placeholder="180"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {result ? (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Payback', value: fmt(result.totalPayback),               color: 'text-slate-800'   },
            { label: 'Daily Payment', value: fmt(result.dailyPayment),               color: 'text-emerald-700' },
            { label: 'Effective APR', value: result.effectiveApr.toFixed(1) + '%',  color: 'text-amber-700'   },
            { label: 'Gross Points',  value: result.grossPoints.toFixed(2) + ' pts', color: 'text-indigo-700'  },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-0.5">{label}</div>
              <div className={`text-sm font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-xs text-slate-400 py-3">
          Enter amount, factor rate, and term to calculate
        </div>
      )}
    </div>
  )
}
