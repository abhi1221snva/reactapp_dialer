import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
  /** When true, renders a compact inline error instead of full-height centered fallback */
  compact?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary] ${this.props.fallbackTitle ?? 'Component error'}:`,
      error,
      info.componentStack
    )
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-red-700">
                {this.props.fallbackTitle ?? 'Something went wrong'}
              </p>
              {this.state.error && (
                <p className="text-[10px] text-red-500 font-mono truncate mt-0.5">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={this.reset}
              className="text-[11px] font-semibold text-red-600 hover:text-red-800 underline flex-shrink-0"
            >
              Retry
            </button>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900">
              {this.props.fallbackTitle ?? 'Something went wrong'}
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              An unexpected error occurred. Your data has been preserved — try reloading this panel.
            </p>
            {this.state.error && (
              <p className="text-xs text-slate-400 mt-2 font-mono">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button onClick={this.reset} className="btn-primary">
            Reload Panel
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
