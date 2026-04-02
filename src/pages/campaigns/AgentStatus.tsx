import { useState, useEffect, useCallback, useRef } from 'react'
import { Users, ArrowLeft, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const REFRESH_INTERVAL = 15

const COLUMNS = ['Name', 'Extension', 'Campaign', 'Lead ID', 'Status', 'Action']

export function AgentStatus() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL)
  const countdownRef = useRef(REFRESH_INTERVAL)

  // Auto-refresh: full page reload every REFRESH_INTERVAL seconds
  useEffect(() => {
    const timer = setInterval(() => {
      countdownRef.current -= 1
      if (countdownRef.current <= 0) {
        window.location.reload()
        return
      }
      setCountdown(countdownRef.current)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleManualRefresh = useCallback(() => {
    window.location.reload()
  }, [])

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/campaigns')} className="btn-ghost p-2 rounded-lg mt-0.5">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="page-header">
            <div>
              <h1 className="page-title">Agent Status</h1>
              <p className="page-subtitle">Live agent status overview</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Countdown timer */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
                <div className="relative w-5 h-5">
                  <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                    <circle cx="10" cy="10" r="8" fill="none" stroke="#e2e8f0" strokeWidth="2" />
                    <circle
                      cx="10" cy="10" r="8" fill="none" stroke="#6366f1" strokeWidth="2"
                      strokeDasharray={`${(countdown / REFRESH_INTERVAL) * 50.27} 50.27`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-600 tabular-nums w-4 text-center">{countdown}</span>
                <span className="text-[10px] text-slate-400">sec</span>
              </div>

              <button
                onClick={handleManualRefresh}
                className="btn-outline text-sm gap-1.5"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper bg-white">
        <table className="table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col} className="text-left">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={COLUMNS.length}>
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <div className="mb-3 opacity-40">
                    <Users size={40} />
                  </div>
                  <p className="font-medium text-slate-500">No data available in table</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
