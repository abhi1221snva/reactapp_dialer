import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Sparkles, X, AlertTriangle } from 'lucide-react'
import { useTrialStatus } from '../hooks/useTrialStatus'

const DISMISS_KEY = 'trial-banner-dismissed'

export function TrialBanner() {
  const { shouldShowBanner, isExpired, daysRemaining } = useTrialStatus()
  const navigate = useNavigate()

  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1',
  )

  if (!shouldShowBanner || dismissed) return null

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const handleUpgrade = () => navigate('/billing')

  if (isExpired) {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-2 bg-red-500 text-white text-sm font-medium flex-shrink-0">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>Your free trial has expired. Upgrade to continue using all features.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
          >
            <Sparkles size={12} /> Upgrade Now
          </button>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium flex-shrink-0">
      <div className="flex items-center gap-2">
        <Clock size={15} />
        <span>
          You are on a free trial &mdash;{' '}
          <strong>
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
          </strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleUpgrade}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
        >
          <Sparkles size={12} /> Upgrade Now
        </button>
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
