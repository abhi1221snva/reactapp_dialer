import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

/** Read persisted auth state from Zustand's localStorage store. */
function getAuthUser(): { secret?: string; parent_id?: number } {
  try {
    const stored = localStorage.getItem('auth-storage')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.user ?? {}
    }
  } catch { /* ignore */ }
  return {}
}

api.interceptors.request.use((config) => {
  const bearerToken = localStorage.getItem('auth_token')

  if (bearerToken) {
    config.headers.Authorization = `Bearer ${bearerToken}`
  }

  // Attach custom headers that the backend requires for mutation authorization.
  const user = getAuthUser()
  if (user.secret) {
    config.headers['X-Easify-User-Token'] = user.secret
  }
  if (user.parent_id != null) {
    config.headers['parent-id'] = String(user.parent_id)
  }

  // When sending FormData, remove the default 'application/json' Content-Type so the
  // browser can set 'multipart/form-data; boundary=...' automatically with the correct boundary.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }

  return config
})

/**
 * Sanitise a backend message before showing it in a toast.
 * 403 messages are usually short and safe (e.g. "You do not have permission").
 * 422 validation messages are safe by nature.
 * 500 messages are NEVER shown — they may contain SQL, stack traces, or raw PHP exceptions.
 */
function safeMsg(raw: string, fallback: string, max = 80): string {
  if (!raw || raw === 'An error occurred') return fallback
  // Block anything that looks like a database / server exception
  if (/SQLSTATE|Exception|Traceback|stack trace|at line \d|mysqli|PDO/i.test(raw)) return fallback
  return raw.length > max ? raw.slice(0, max) + '…' : raw
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message: string = error.response?.data?.message || 'An error occurred'

    if (status === 401) {
      // Skip logout for Gmail/integration routes — their 401s mean Gmail token expired, not JWT expired
      const url = error.config?.url ?? ''
      const skipLogout = ['/gmail/', '/integrations'].some(u => url.includes(u))
      if (!skipLogout) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth-storage')   // clear Zustand persist so /login doesn't bounce to /dashboard
        window.location.href = '/login'
      }
    } else if (status === 403) {
      if (!error.config?._silent403) {
        toast.error(safeMsg(message, 'You do not have permission to perform this action'))
      }
    } else if (status === 400 || status === 422) {
      // Skip generic toast for errors that the calling code handles with a custom modal
      const code: string = error.response?.data?.code ?? ''
      if (['ACCOUNT_NOT_FOUND'].includes(code)) {
        // Let the caller handle these with a SweetAlert — do not show a toast
      } else {
        const errors = error.response?.data?.errors
        if (errors) {
          const firstError = Object.values(errors)[0]
          const raw = Array.isArray(firstError) ? firstError[0] as string : message
          toast.error(safeMsg(raw, 'Please check your input and try again.'))
        } else {
          toast.error(safeMsg(message, 'Please check your input and try again.'))
        }
      }
    } else if (status >= 500) {
      // Log the full 500 response so errors[0] (SQL / exception detail) is
      // visible in the browser console for debugging without leaking to the UI.
      console.error('[API 500]', error.response?.data)
      // Try to surface errors[0] if it contains a user-friendly (non-technical) message.
      const errArr = error.response?.data?.errors
      const firstErr = Array.isArray(errArr) && errArr.length > 0 ? String(errArr[0]) : null
      const display = safeMsg(firstErr ?? message, 'Something went wrong on the server. Please try again.')
      toast.error(display)
    }

    return Promise.reject(error)
  }
)

export default api
