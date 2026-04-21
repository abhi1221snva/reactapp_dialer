interface IdleWarningModalProps {
  remaining: number // ms
  onStayActive: () => void
  onLogout: () => void
}

export function IdleWarningModal({ remaining, onStayActive, onLogout }: IdleWarningModalProps) {
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">Session Expiring</h3>
        <p className="text-sm text-slate-500 mb-4">
          You will be logged out in{' '}
          <span className="font-bold text-amber-600">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
          {' '}due to inactivity.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Log out
          </button>
          <button
            onClick={onStayActive}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Stay active
          </button>
        </div>
      </div>
    </div>
  )
}
