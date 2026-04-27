import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// ── Route → Page title ────────────────────────────────────────────────────────
const CRM_TITLES: Record<string, string> = {
  '/crm/dashboard':           'Dashboard',
  '/crm/pipeline':            'Pipeline Board',
  '/crm/leads':               'Leads',
  '/crm/leads/create':        'Add Lead',
  '/crm/lead-fields':         'Labels',
  '/crm/lead-status':         'Lead Status',
  '/crm/document-types':      'Document Types',
  '/crm/email-settings':      'Email Settings',
  '/crm/email-templates':     'Email Templates',
  '/crm/sms-templates':       'SMS Templates',
  '/crm/lenders':             'Lenders',
  '/crm/affiliate-links':     'Affiliate Links',
  '/crm/approvals':           'Approvals',
  '/crm/agent-performance':   'Agent Performance',
  '/crm/commissions':         'Commissions',
  '/crm/renewals':            'Renewal Pipeline',
  '/crm/integrations':        'API Integrations',
  '/crm/bank-statements':       'Bank Statement Analysis',
  '/crm/bank-statements/logs':  'API Logs',
  '/crm/balji/api-explorer':    'Balji API Explorer',
  '/crm/drip-campaigns':         'Drip Campaigns',
  '/crm/drip-campaigns/create':  'Create Drip Campaign',
}

function titleFromPath(pathname: string): string {
  if (CRM_TITLES[pathname]) return CRM_TITLES[pathname]
  if (/^\/crm\/leads\/\d+\/edit$/.test(pathname)) return 'Edit Lead'
  if (/^\/crm\/leads\/\d+$/.test(pathname)) return 'Lead Detail'
  if (/^\/crm\/bank-statements\/[a-f0-9-]+$/.test(pathname)) return 'Statement Analysis'
  if (/^\/crm\/drip-campaigns\/\d+\/edit$/.test(pathname)) return 'Edit Drip Campaign'
  if (/^\/crm\/drip-campaigns\/\d+$/.test(pathname)) return 'Campaign Detail'
  return 'CRM'
}

// ── Context ───────────────────────────────────────────────────────────────────
interface CrmHeaderCtx {
  setDescription: (d: ReactNode) => void
  setActions:     (a: ReactNode) => void
  /** Incremented on every route change — include in useEffect deps to guarantee re-run after layout clears header. */
  headerKey:      number
}

const CrmHeaderContext = createContext<CrmHeaderCtx>({
  setDescription: () => {},
  setActions:     () => {},
  headerKey:      0,
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

  // Bump a counter on route change so children can re-run their header effects
  const [headerKey, setHeaderKey] = useState(0)
  useEffect(() => {
    setDescription(undefined)
    setActions(undefined)
    setHeaderKey(k => k + 1)
  }, [pathname])

  // Pages that render their own toolbar header
  const OWN_HEADER = new Set([
    '/crm/dashboard', '/crm/sms-inbox', '/crm/leads', '/crm/leads/create',
    '/crm/lead-fields', '/crm/lead-status', '/crm/document-types',
    '/crm/email-templates', '/crm/sms-templates', '/crm/pdf-templates', '/crm/pdf-reader-settings', '/crm/lenders',
    '/crm/drip-campaigns', '/crm/drip-campaigns/create',
  ])
  const showHeader = !OWN_HEADER.has(pathname)
    && !/^\/crm\/leads\/\d+$/.test(pathname)
    && !/^\/crm\/leads\/\d+\/edit$/.test(pathname)
    && !/^\/crm\/lenders\//.test(pathname)
    && !/^\/crm\/drip-campaigns\//.test(pathname)
    && !/^\/crm\/leads-new\/\d+$/.test(pathname)

  return (
    <CrmHeaderContext.Provider value={{ setDescription, setActions, headerKey }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ── Compact title bar (hidden on pages with own header) */}
        {showHeader && (
          <>
            <div className="lt">
              <div className="lt-title">
                <h1>{title}</h1>
              </div>
              {description && <span className="lt-desc">{description}</span>}
              {actions && <div className="lt-actions">{actions}</div>}
            </div>
            <div className="lt-accent lt-accent-green" />
          </>
        )}

        {/* ── Page content ──────────────────────────────────────────────────── */}
        <div style={{ marginTop: showHeader ? 8 : 0 }}>
          <Outlet />
        </div>

      </div>
    </CrmHeaderContext.Provider>
  )
}
