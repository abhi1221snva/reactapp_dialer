import { Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
  fallbackTitle?: string
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
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
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
              An unexpected error occurred. Your call state has been preserved — try reloading this panel.
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
