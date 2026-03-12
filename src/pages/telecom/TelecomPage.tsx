import { useSearchParams } from 'react-router-dom'
import {
  LayoutDashboard, Hash, Wifi, PhoneCall,
  MessageSquare, DollarSign, Radio,
} from 'lucide-react'
import { TwilioDashboard } from '../twilio/TwilioDashboard'
import { TwilioNumbers }   from '../twilio/TwilioNumbers'
import { TwilioTrunks }    from '../twilio/TwilioTrunks'
import { TwilioCallLogs }  from '../twilio/TwilioCallLogs'
import { TwilioSmsLogs }   from '../twilio/TwilioSmsLogs'
import { TwilioUsage }     from '../twilio/TwilioUsage'
import { PlivoDashboard }  from '../plivo/PlivoDashboard'
import { PlivoNumbers }    from '../plivo/PlivoNumbers'
import { PlivoTrunks }     from '../plivo/PlivoTrunks'
import { PlivoCallLogs }   from '../plivo/PlivoCallLogs'
import { PlivoSmsLogs }    from '../plivo/PlivoSmsLogs'
import { PlivoUsage }      from '../plivo/PlivoUsage'

type Provider = 'twilio' | 'plivo'
type Tab = 'dashboard' | 'numbers' | 'trunks' | 'calls' | 'sms' | 'usage'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard',      icon: LayoutDashboard },
  { id: 'numbers',   label: 'Phone Numbers',  icon: Hash            },
  { id: 'trunks',    label: 'SIP Trunks',     icon: Wifi            },
  { id: 'calls',     label: 'Call Logs',      icon: PhoneCall       },
  { id: 'sms',       label: 'SMS Logs',       icon: MessageSquare   },
  { id: 'usage',     label: 'Usage & Billing',icon: DollarSign      },
]

const CONTENT: Record<Provider, Record<Tab, React.ComponentType>> = {
  twilio: {
    dashboard: TwilioDashboard,
    numbers:   TwilioNumbers,
    trunks:    TwilioTrunks,
    calls:     TwilioCallLogs,
    sms:       TwilioSmsLogs,
    usage:     TwilioUsage,
  },
  plivo: {
    dashboard: PlivoDashboard,
    numbers:   PlivoNumbers,
    trunks:    PlivoTrunks,
    calls:     PlivoCallLogs,
    sms:       PlivoSmsLogs,
    usage:     PlivoUsage,
  },
}

// Provider accent config
const ACCENT: Record<Provider, {
  gradient: string
  activeBg: string
  activeText: string
  pillBg: string
  pillText: string
  tabActive: string
  tabBorder: string
  badge: string
}> = {
  twilio: {
    gradient:   'from-indigo-600 via-indigo-700 to-purple-800',
    activeBg:   'bg-indigo-600',
    activeText: 'text-white',
    pillBg:     'bg-indigo-600',
    pillText:   'text-white',
    tabActive:  'text-indigo-600',
    tabBorder:  'border-indigo-600',
    badge:      'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  plivo: {
    gradient:   'from-green-600 via-green-700 to-teal-800',
    activeBg:   'bg-green-600',
    activeText: 'text-white',
    pillBg:     'bg-green-600',
    pillText:   'text-white',
    tabActive:  'text-green-600',
    tabBorder:  'border-green-600',
    badge:      'bg-green-100 text-green-700 border-green-200',
  },
}

export function TelecomPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const provider = (searchParams.get('p') ?? 'twilio') as Provider
  const tab      = (searchParams.get('t') ?? 'dashboard') as Tab

  const accent = ACCENT[provider]

  function setProvider(p: Provider) {
    setSearchParams({ p, t: tab })
  }
  function setTab(t: Tab) {
    setSearchParams({ p: provider, t })
  }

  const PageComponent = CONTENT[provider][tab]

  return (
    <div className="space-y-0 -mt-4 -mx-6">

      {/* ── Unified header ─────────────────────────────────────────── */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${accent.gradient} px-8 pt-7 pb-5`}>
        {/* dot pattern */}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between gap-6">
          {/* Title */}
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shadow-lg backdrop-blur-sm">
              <Radio size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">Telecom Hub</h1>
              <p className="text-white/60 text-xs mt-0.5">Unified telephony management</p>
            </div>
          </div>

          {/* Provider toggle */}
          <div className="flex items-center bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-1 gap-1">
            {(['twilio', 'plivo'] as Provider[]).map(p => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  provider === p
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {/* provider color dot */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  p === 'twilio' ? 'bg-indigo-500' : 'bg-green-500'
                } ${provider === p ? '' : 'opacity-70'}`} />
                {p === 'twilio' ? 'Twilio' : 'Plivo'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Section tabs ─────────────────────────────────────────── */}
        <div className="relative mt-5 flex items-end gap-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 ${
                tab === id
                  ? 'bg-white text-slate-800 border-transparent shadow-sm'
                  : 'text-white/65 hover:text-white hover:bg-white/10 border-transparent'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Active provider badge + content ────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-8 py-2 flex items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${accent.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${provider === 'twilio' ? 'bg-indigo-500' : 'bg-green-500'}`} />
          {provider === 'twilio' ? 'Twilio' : 'Plivo'}
        </span>
        <span className="text-slate-300 text-xs">·</span>
        <span className="text-slate-500 text-xs">{TABS.find(t => t.id === tab)?.label}</span>
      </div>

      {/* ── Page content ───────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <PageComponent />
      </div>

    </div>
  )
}
