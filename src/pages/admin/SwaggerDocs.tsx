import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../../stores/auth.store'
import { LEVELS } from '../../utils/permissions'
import { PageHeader } from '../../components/ui/PageHeader'
import { ShieldOff, Loader2 } from 'lucide-react'

// ── SwaggerDocs ───────────────────────────────────────────────────────────────
// Renders the Swagger UI for the Rocket Dialer API.
// Accessible only to system_administrator (level 11).
// Uses swagger-ui-dist from CDN — no additional npm package required.
// ─────────────────────────────────────────────────────────────────────────────

const SWAGGER_CDN_VERSION = '5.17.14'
const SWAGGER_CSS = `https://unpkg.com/swagger-ui-dist@${SWAGGER_CDN_VERSION}/swagger-ui.css`
const SWAGGER_BUNDLE = `https://unpkg.com/swagger-ui-dist@${SWAGGER_CDN_VERSION}/swagger-ui-bundle.js`
const SWAGGER_PRESET = `https://unpkg.com/swagger-ui-dist@${SWAGGER_CDN_VERSION}/swagger-ui-standalone-preset.js`

export function SwaggerDocs() {
  const { user, token } = useAuthStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  const isAllowed = (user?.level ?? 0) >= LEVELS.SYSTEM_ADMIN

  useEffect(() => {
    if (!isAllowed) return

    // Derive the docs URL from the same base URL the axios instance uses
    const apiBase = (import.meta.env.VITE_API_URL as string) || window.location.origin
    const docsUrl = apiBase.replace(/\/$/, '') + '/docs'

    let cssLink: HTMLLinkElement | null = null
    const scripts: HTMLScriptElement[] = []
    let mounted = true

    function injectCss(): Promise<void> {
      return new Promise((resolve) => {
        // Avoid double-injecting
        if (document.querySelector(`link[data-swagger-ui]`)) {
          resolve()
          return
        }
        cssLink = document.createElement('link')
        cssLink.rel = 'stylesheet'
        cssLink.href = SWAGGER_CSS
        cssLink.setAttribute('data-swagger-ui', '1')
        cssLink.onload = () => resolve()
        cssLink.onerror = () => resolve() // continue even if CDN fails
        document.head.appendChild(cssLink)
      })
    }

    function loadScript(src: string): Promise<void> {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[data-swagger-src="${src}"]`)) {
          resolve()
          return
        }
        const s = document.createElement('script')
        s.src = src
        s.setAttribute('data-swagger-src', src)
        s.onload  = () => resolve()
        s.onerror = () => reject(new Error(`Failed to load ${src}`))
        document.body.appendChild(s)
        scripts.push(s)
      })
    }

    async function init() {
      try {
        await injectCss()
        await loadScript(SWAGGER_BUNDLE)
        await loadScript(SWAGGER_PRESET)

        if (!mounted || !containerRef.current) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SwaggerUIBundle = (window as any).SwaggerUIBundle
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SwaggerUIStandalonePreset = (window as any).SwaggerUIStandalonePreset

        if (!SwaggerUIBundle) {
          setError('Failed to load Swagger UI. Check your internet connection.')
          setLoading(false)
          return
        }

        SwaggerUIBundle({
          url: docsUrl,
          dom_id: '#swagger-ui-container',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIStandalonePreset ?? SwaggerUIBundle.SwaggerUIStandalonePreset,
          ],
          layout: 'StandaloneLayout',
          deepLinking: true,
          displayRequestDuration: true,
          tryItOutEnabled: true,
          requestInterceptor: (request: { headers: Record<string, string> }) => {
            if (token) {
              request.headers['Authorization'] = `Bearer ${token}`
            }
            return request
          },
        })

        if (mounted) setLoading(false)
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error loading Swagger UI')
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
    }
  }, [isAllowed, token])

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <ShieldOff size={48} className="text-red-400" />
        <h2 className="text-xl font-semibold text-slate-800">Access Denied</h2>
        <p className="text-slate-500 max-w-sm">
          Swagger API documentation is restricted to <strong>system_administrator</strong> accounts (level 11).
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-white">
      <div className="px-6 py-4 border-b border-slate-200">
        <PageHeader
          title="Swagger API Docs"
          subtitle="Full OpenAPI 3.0 documentation for the Rocket Dialer REST API"
        />
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-500">
          <Loader2 size={24} className="animate-spin" />
          <span>Loading Swagger UI…</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="m-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Swagger UI mount point */}
      <div
        ref={containerRef}
        id="swagger-ui-container"
        className={loading ? 'invisible h-0 overflow-hidden' : 'flex-1'}
      />
    </div>
  )
}
