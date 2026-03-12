import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// ── Route → Page title ────────────────────────────────────────────────────────
const CRM_TITLES: Record<string, string> = {
  '/crm/dashboard':       'CRM Dashboard',
  '/crm/pipeline':        'Pipeline Board',
  '/crm/leads':           'Leads',
  '/crm/leads/create':    'Add Lead',
  '/crm/lead-status':     'Lead Status',
  '/crm/email-templates': 'Email Templates',
  '/crm/sms-templates':   'SMS Templates',
  '/crm/lenders':         'Lenders',
  '/crm/affiliate-links': 'Affiliate Links',
  '/crm/approvals':       'Approvals',
}

function titleFromPath(pathname: string): string {
  if (CRM_TITLES[pathname]) return CRM_TITLES[pathname]
  if (/^\/crm\/leads\/\d+\/edit$/.test(pathname)) return 'Edit Lead'
  if (/^\/crm\/leads\/\d+$/.test(pathname)) return 'Lead Detail'
  return 'CRM'
}

// ── Context ───────────────────────────────────────────────────────────────────
interface CrmHeaderCtx {
  setDescription: (d: ReactNode) => void
  setActions:     (a: ReactNode) => void
}

const CrmHeaderContext = createContext<CrmHeaderCtx>({
  setDescription: () => {},
  setActions:     () => {},
})

/** Call inside any CRM page to push description text and/or action buttons into the page header. */
export function useCrmHeader() {
  return useContext(CrmHeaderContext)
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function CrmLayout() {
  const { pathname } = useLocation()
  const title = titleFromPath(pathname)

  const [description, setDescription] = useState<ReactNode>(undefined)
  const [actions,     setActions    ] = useState<ReactNode>(undefined)

  // Clear injected content on every route change
  useEffect(() => {
    setDescription(undefined)
    setActions(undefined)
  }, [pathname])

  return (
    <CrmHeaderContext.Provider value={{ setDescription, setActions }}>
      <div className="space-y-4">

        {/* ── Page title row ────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
            {description && (
              <p className="text-sm mt-0.5 text-slate-500">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          )}
        </div>

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <Outlet />

      </div>
    </CrmHeaderContext.Provider>
  )
}
