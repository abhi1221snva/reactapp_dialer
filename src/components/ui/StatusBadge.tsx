interface StatusBadgeProps {
  status: string
  label?: string
}

const variantMap: Record<string, string> = {
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-slate-100 text-slate-600',
  pending:   'bg-yellow-100 text-yellow-700',
  error:     'bg-red-100 text-red-700',
  failed:    'bg-red-100 text-red-700',
  warning:   'bg-orange-100 text-orange-700',
  info:      'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  running:   'bg-blue-100 text-blue-700',
  paused:    'bg-yellow-100 text-yellow-700',
  stopped:   'bg-slate-100 text-slate-600',
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const classes = variantMap[status.toLowerCase()] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {label ?? status}
    </span>
  )
}
