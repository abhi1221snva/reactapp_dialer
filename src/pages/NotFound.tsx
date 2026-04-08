import { useNavigate } from 'react-router-dom'
import { FileQuestion, ArrowLeft, Home } from 'lucide-react'

export function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
        <FileQuestion size={40} className="text-slate-400" />
      </div>
      <h1 className="text-3xl font-bold text-slate-800 mb-2">404</h1>
      <p className="text-lg font-semibold text-slate-600 mb-1">Page Not Found</p>
      <p className="text-sm text-slate-400 mb-8 max-w-md">
        The page you are looking for does not exist or you do not have permission to access it.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={15} /> Go Back
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Home size={15} /> Dashboard
        </button>
      </div>
    </div>
  )
}
