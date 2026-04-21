import axios from 'axios'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
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
function safeMsg(raw: string, fallback: string, max = 120): string {
  if (!raw || raw === 'An error occurred') return fallback
  // Block anything that looks like a database / server exception
  if (/SQLSTATE|Exception|Traceback|stack trace|at line \d|mysqli|PDO/i.test(raw)) return fallback
  return raw.length > max ? raw.slice(0, max) + '…' : raw
}

// ─── Refresh token queue ─────────────────────────────────────────────────────
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

function forceLogout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('auth_user')
  localStorage.removeItem('auth-storage')
  sessionStorage.clear()
  window.location.href = '/login'
}

/** Error codes that components handle themselves — do NOT show a generic toast */
const COMPONENT_HANDLED_CODES = [
  'ACCOUNT_NOT_FOUND',
  'EMAIL_ALREADY_REGISTERED',
  'PHONE_ALREADY_REGISTERED',
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_INACTIVE',
]

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message: string = error.response?.data?.message || 'An error occurred'
    const code: string = error.response?.data?.code ?? ''

    // If no auth token exists we're already logged out — suppress all error toasts
    // to avoid "Token not provided" flashing on the login page.
    const hasToken = !!localStorage.getItem('auth_token')
    const url = error.config?.url ?? ''
    // Login/auth endpoints — NEVER redirect or suppress errors
    const isAuthRequest = ['/authentication', '/verify_google_otp', '/2fa/verify', '/auth/google', '/merchant-auth'].some(u => url.includes(u))

    if (status === 401) {
      if (isAuthRequest || !hasToken) {
        // User is logging in — show the error so login failures are visible
        toast.error(safeMsg(message, 'Invalid email or password'))
      } else {
        // Skip logout for Gmail/integration routes — their 401s mean Gmail token expired, not JWT expired
        const skipLogout = ['/gmail/', '/integrations'].some(u => url.includes(u))
        if (skipLogout) {
          // Let the caller handle
        } else {
          // Attempt token refresh before logging out
          const storedRefreshToken = localStorage.getItem('refresh_token')
          const isRefreshRequest = url.includes('/auth/refresh')

          if (storedRefreshToken && !isRefreshRequest) {
            if (!isRefreshing) {
              isRefreshing = true
              axios.post(`${import.meta.env.VITE_API_URL || ''}/auth/refresh`, {
                refresh_token: storedRefreshToken,
              }).then(res => {
                const data = res.data?.data
                if (data?.token) {
                  localStorage.setItem('auth_token', data.token)
                  localStorage.setItem('refresh_token', data.refresh_token)
                  // Update Zustand persisted state
                  try {
                    const store = JSON.parse(localStorage.getItem('auth-storage') || '{}')
                    if (store?.state) {
                      store.state.token = data.token
                      store.state.refreshToken = data.refresh_token
                      localStorage.setItem('auth-storage', JSON.stringify(store))
                    }
                  } catch { /* ignore */ }
                  isRefreshing = false
                  onRefreshed(data.token)
                } else {
                  throw new Error('No token in refresh response')
                }
              }).catch(() => {
                isRefreshing = false
                refreshSubscribers = []
                forceLogout()
              })
            }
            // Queue the failed request to retry after refresh completes
            return new Promise((resolve, reject) => {
              refreshSubscribers.push((newToken: string) => {
                if (error.config) {
                  error.config.headers.Authorization = `Bearer ${newToken}`
                  resolve(axios(error.config))
                } else {
                  reject(error)
                }
              })
            })
          } else {
            // No refresh token or refresh itself failed
            forceLogout()
          }
        }
      }
    } else if (status === 403) {
      // Deactivated/inactive accounts: let component handle if code is set,
      // otherwise show the message (it's always user-safe from 403).
      if (COMPONENT_HANDLED_CODES.includes(code)) {
        // Let the caller handle — but if user is logged in, also force logout
        if (hasToken && ['ACCOUNT_DEACTIVATED', 'ACCOUNT_INACTIVE'].includes(code)) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          localStorage.removeItem('auth-storage')
          sessionStorage.clear()
          toast.error(safeMsg(message, 'Your account is not active. Please contact support.'))
          window.location.href = '/login'
        } else if (!hasToken) {
          // On login page — show inline (component handles it)
        }
      } else if (!hasToken) {
        // Login page 403s (deactivated account) — show toast for the user
        toast.error(safeMsg(message, 'Your account is not active. Please contact support.'))
      } else if (!error.config?._silent403) {
        toast.error(safeMsg(message, 'You do not have permission to perform this action'))
      }
    } else if (status === 429) {
      // Rate limited — always show regardless of auth state
      toast.error(safeMsg(message, 'Too many requests. Please wait a moment and try again.'))
    } else if (!hasToken && !isAuthRequest) {
      // Already logged out and not on login page — silently reject without toasts
    } else if (status === 400 || status === 422) {
      // Skip generic toast for errors that the calling code handles with a custom modal
      if (COMPONENT_HANDLED_CODES.includes(code)) {
        // Let the caller handle these — do not show a toast
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
