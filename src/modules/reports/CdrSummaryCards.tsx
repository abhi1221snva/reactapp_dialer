import { Phone, Clock, DollarSign, PhoneCall } from 'lucide-react'
import { formatDuration } from '../../utils/format'

export interface CdrSummary {
  total_calls: number
  total_duration: number
  total_charge: string | number
  answered_calls: number
}

interface Props {
  summary: CdrSummary | null
  loading?: boolean
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
  loading?: boolean
}) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {loading ? (
          <div className="h-6 w-20 bg-slate-200 rounded animate-pulse mt-1" />
        ) : (
          <p className="text-xl font-bold text-slate-800 leading-tight">{value}</p>
        )}
        {sub && !loading && (
          <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  )
}

export function CdrSummaryCards({ summary, loading }: Props) {
  const totalCalls = summary?.total_calls ?? 0
  const totalDuration = Number(summary?.total_duration ?? 0)
  const totalCharge = Number(summary?.total_charge ?? 0)
  const answeredCalls = Number(summary?.answered_calls ?? 0)
  const answerRate = totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        icon={Phone}
        label="Total Calls"
        value={totalCalls.toLocaleString()}
        sub={`${answeredCalls.toLocaleString()} answered`}
        color="bg-blue-500"
        loading={loading}
      />
      <SummaryCard
        icon={PhoneCall}
        label="Answered Calls"
        value={answeredCalls.toLocaleString()}
        sub={`${answerRate}% answer rate`}
        color="bg-green-500"
        loading={loading}
      />
      <SummaryCard
        icon={Clock}
        label="Total Duration"
        value={formatDuration(totalDuration)}
        sub={totalCalls > 0 ? `avg ${formatDuration(Math.round(totalDuration / totalCalls))} / call` : undefined}
        color="bg-purple-500"
        loading={loading}
      />
      <SummaryCard
        icon={DollarSign}
        label="Total Charge"
        value={`$${totalCharge.toFixed(4)}`}
        sub={totalCalls > 0 ? `avg $${(totalCharge / totalCalls).toFixed(4)} / call` : undefined}
        color="bg-orange-500"
        loading={loading}
      />
    </div>
  )
}
