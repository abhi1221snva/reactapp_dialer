import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

// ── Route → Page title ────────────────────────────────────────────────────────
const DIALER_TITLES: Record<string, string> = {
  '/dashboard':                     'Dashboard',
  '/campaigns':                     'Campaigns',
  '/users':                         'Users & Agents',
  '/dids':                          'Phone Numbers',
  '/lists':                         'Lists',
  '/leads':                         'Leads',
  '/reports':                       'CDR Report',
  '/reports/daily':                 'Daily Report',
  '/reports/agent-summary':         'Agent Summary',
  '/reports/disposition':           'Disposition Report',
  '/reports/campaign-performance':  'Campaign Performance',
  '/reports/live':                  'Live Calls',
  '/sms':                           'SMS Center',
  '/chat':                          'Team Chat',
  '/monitoring':                    'Agent Monitoring',
  '/billing':                       'Billing',
  '/attendance':                    'Attendance',
  '/settings/labels':               'Labels',
  '/settings/dispositions':         'Dispositions',
  '/settings/dnc':                  'DNC List',
  '/settings/exclude':              'Exclude List',
  '/settings/fax':                  'Fax Settings',
  '/settings/security':             'Security Settings',
  '/settings/2fa-setup':            '2FA Setup',
  '/settings/lead-sources':         'Lead Sources',
  '/settings/recycle-rules':        'Recycle Rules',
  '/settings/custom-field-labels':  'Custom Field Labels',
  '/settings/lead-activity':        'Lead Activity',
  '/settings/email-templates':      'Email Templates',
  '/settings/sms-templates':        'SMS Templates',
  '/ivr':                           'IVR Menus',
  '/ringless':                      'Ringless Campaigns',
  '/ai/settings':                   'AI Settings',
  '/ai/coach':                      'AI Coach',
  '/smsai/demo':                    'SMS AI Demo',
  '/smsai/campaigns':               'SMS AI Campaigns',
  '/smsai/lists':                   'SMS AI Lists',
  '/smsai/reports':                 'SMS AI Reports',
  '/smsai/templates':               'SMS AI Templates',
  '/voicemail':                     'Voicemail Drops',
  '/voicemail/mailbox':             'Mailbox',
  '/ring-groups':                   'Ring Groups',
  '/call-times':                    'Call Times',
  '/holidays':                      'Holidays',
  '/extension-groups':              'Extension Groups',
  '/agents':                        'Agents',
  '/telecom':                       'Telecom Hub',
  '/workforce':                     'Workforce Management',
  '/workforce/shifts':              'Shift Management',
  '/workforce/staffing':            'Campaign Staffing',
  '/workforce/reports':             'Workforce Reports',
  '/workforce/analytics':           'Workforce Analytics',
  '/admin/clients':                 'Client Management',
  '/admin/system-monitor':          'System Monitor',
  '/system/swagger':                'API Docs',
  '/profile':                       'Profile',
  '/gmail-mailbox':                 'Gmail Mailbox',
  '/email-parser':                  'Email Parser',
  '/google-calendar':               'Google Calendar',
  '/onboarding':                    'Onboarding',
}

function titleFromPath(pathname: string): string {
  if (DIALER_TITLES[pathname]) return DIALER_TITLES[pathname]
  if (/^\/campaigns\/create$/.test(pathname))     return 'Create Campaign'
  if (/^\/campaigns\/\d+\/edit$/.test(pathname))  return 'Edit Campaign'
  if (/^\/campaigns\/\d+$/.test(pathname))        return 'Campaign Detail'
  if (/^\/campaigns\/\d+\/attach-leads$/.test(pathname)) return 'Attach Leads'
  if (/^\/campaigns\/\d+\/add-review$/.test(pathname))  return 'Review Campaign'
  if (/^\/users\/create$/.test(pathname))         return 'Add User'
  if (/^\/users\/\d+\/edit$/.test(pathname))      return 'Edit User'
  if (/^\/users\/\d+\/details$/.test(pathname))  return 'User Details'
  if (/^\/dids\/create$/.test(pathname))          return 'Add Phone Number'
  if (/^\/dids\/\d+\/edit$/.test(pathname))       return 'Edit Phone Number'
  if (/^\/lists\/create$/.test(pathname))         return 'Create List'
  if (/^\/lists\/\d+\/edit$/.test(pathname))      return 'Edit List'
  if (/^\/lists\/\d+\/leads$/.test(pathname))     return 'List Leads'
  if (/^\/lists\/\d+\/mapping$/.test(pathname))   return 'Field Mapping'
  if (/^\/lists\/\d+$/.test(pathname))            return 'List Detail'
  return 'Phone System'
}

// ── Context ───────────────────────────────────────────────────────────────────
interface DialerHeaderCtx {
  /** Inject toolbar content (search, filters, buttons) — rendered after the title inside the .lt bar */
  setToolbar: (t: ReactNode) => void
  headerKey:  number
}

const DialerHeaderContext = createContext<DialerHeaderCtx>({
  setToolbar: () => {},
  headerKey:  0,
})

/** Call inside any Dialer page to inject search / filters / buttons into the .lt toolbar. */
export function useDialerHeader() {
  return useContext(DialerHeaderContext)
}

// ── Layout ────────────────────────────────────────────────────────────────────
export function DialerLayout() {
  const { pathname } = useLocation()
  const title = titleFromPath(pathname)

  const [toolbar, setToolbar] = useState<ReactNode>(undefined)

  const [headerKey, setHeaderKey] = useState(0)
  useEffect(() => {
    setToolbar(undefined)
    setHeaderKey(k => k + 1)
  }, [pathname])

  // Pages that render their own complex header / full-bleed UI
  const OWN_HEADER = new Set([
    '/dashboard',
    '/dialer',
    '/sms',
    '/chat',
    '/telecom',
    '/monitoring',
    '/onboarding',
  ])

  const showHeader = !OWN_HEADER.has(pathname)
    && pathname !== '/campaigns/create'
    && !/^\/campaigns\/\d+$/.test(pathname)
    && !/^\/campaigns\/\d+\/edit$/.test(pathname)
    && !/^\/lists\/\d+\/edit$/.test(pathname)
    && !/^\/users\/create$/.test(pathname)
    && !/^\/users\/\d+\/edit$/.test(pathname)
    && !/^\/dids\/create$/.test(pathname)
    && !/^\/dids\/\d+\/edit$/.test(pathname)

    && !/^\/ringless\/create$/.test(pathname)
    && !/^\/ringless\/\d+\/edit$/.test(pathname)
    && !/^\/ringless\/\d+\/attach-leads$/.test(pathname)
    && !/^\/ringless\/\d+\/add-review$/.test(pathname)
    && !/^\/ringless\/\d+\/manage-lists$/.test(pathname)
    && !/^\/ringless\/\d+\/review$/.test(pathname)

  return (
    <DialerHeaderContext.Provider value={{ setToolbar, headerKey }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {showHeader && (
          <>
            <div className="lt">
              <div className="lt-title">
                <h1>{title}</h1>
              </div>
              {toolbar}
            </div>
            <div className="lt-accent lt-accent-blue" />
          </>
        )}

        <div style={{ marginTop: showHeader ? 8 : 0 }}>
          <Outlet />
        </div>

      </div>
    </DialerHeaderContext.Provider>
  )
}
