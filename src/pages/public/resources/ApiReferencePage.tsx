import { useEffect } from 'react'
import {
  Code2, Copy, Lock, Users, Megaphone, Phone,
  BarChart3, Terminal, ChevronRight, ExternalLink,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const endpointCategories = [
  {
    icon: Lock,
    title: 'Authentication',
    description: 'API key management, OAuth 2.0 tokens, and session handling.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    endpoints: [
      { method: 'POST', path: '/auth/token', label: 'Generate Token' },
      { method: 'POST', path: '/auth/refresh', label: 'Refresh Token' },
      { method: 'DELETE', path: '/auth/revoke', label: 'Revoke Token' },
    ],
  },
  {
    icon: Users,
    title: 'Leads',
    description: 'Create, update, search, and manage borrower lead records.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    endpoints: [
      { method: 'GET', path: '/leads', label: 'List Leads' },
      { method: 'POST', path: '/leads', label: 'Create Lead' },
      { method: 'GET', path: '/leads/:id', label: 'Get Lead' },
      { method: 'PUT', path: '/leads/:id', label: 'Update Lead' },
      { method: 'DELETE', path: '/leads/:id', label: 'Delete Lead' },
    ],
  },
  {
    icon: Megaphone,
    title: 'Campaigns',
    description: 'Build, launch, pause, and analyze outbound campaigns.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    endpoints: [
      { method: 'GET', path: '/campaigns', label: 'List Campaigns' },
      { method: 'POST', path: '/campaigns', label: 'Create Campaign' },
      { method: 'PUT', path: '/campaigns/:id', label: 'Update Campaign' },
      { method: 'POST', path: '/campaigns/:id/start', label: 'Start Campaign' },
      { method: 'POST', path: '/campaigns/:id/pause', label: 'Pause Campaign' },
    ],
  },
  {
    icon: Phone,
    title: 'Calls',
    description: 'Initiate calls, retrieve recordings, and access real-time call data.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    endpoints: [
      { method: 'POST', path: '/calls', label: 'Initiate Call' },
      { method: 'GET', path: '/calls/:id', label: 'Get Call Details' },
      { method: 'GET', path: '/calls/:id/recording', label: 'Get Recording' },
      { method: 'POST', path: '/calls/:id/transfer', label: 'Transfer Call' },
    ],
  },
  {
    icon: BarChart3,
    title: 'Reports',
    description: 'Generate analytics reports, export data, and query metrics.',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    endpoints: [
      { method: 'GET', path: '/reports/overview', label: 'Dashboard Overview' },
      { method: 'GET', path: '/reports/agents', label: 'Agent Performance' },
      { method: 'POST', path: '/reports/export', label: 'Export Report' },
      { method: 'GET', path: '/reports/calls', label: 'Call Analytics' },
    ],
  },
]

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-blue-700 border-blue-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
}

const sdkCards = [
  {
    title: 'Node.js',
    icon: '{ }',
    language: 'JavaScript / TypeScript',
    installCommand: 'npm install @balji/sdk',
    gradient: 'from-green-500 to-emerald-600',
    bgLight: 'bg-emerald-50',
  },
  {
    title: 'Python',
    icon: '>>',
    language: 'Python 3.8+',
    installCommand: 'pip install balji',
    gradient: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
  },
  {
    title: 'PHP',
    icon: '</>',
    language: 'PHP 8.1+',
    installCommand: 'composer require balji/sdk',
    gradient: 'from-violet-500 to-purple-600',
    bgLight: 'bg-violet-50',
  },
]

const sampleCode = `// Initialize the Balji SDK
const Balji = require('@balji/sdk');

const client = new Balji({
  apiKey: 'your_api_key_here',
  baseUrl: 'https://api.balji.app/v1'
});

// Create a new lead
const lead = await client.leads.create({
  firstName: 'Sarah',
  lastName:  'Mitchell',
  phone:     '+15558429173',
  email:     'sarah@example.com',
  company:   'TechFlow Inc.',
  dealValue: 85000,
  source:    'website'
});

console.log('Lead created:', lead.id);

// Launch a campaign with the new lead
await client.campaigns.addContacts('camp_q2_collections', {
  leadIds: [lead.id],
  priority: 'high'
});`

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function ApiReferencePage() {
  useEffect(() => { document.title = 'API Reference | Balji' }, [])

  const baseUrlSection = useInView()
  const endpointsSection = useInView()
  const codeSection = useInView()
  const sdkSection = useInView()

  return (
    <div className="min-h-screen bg-white">
      <PublicHero
        pill="Developer Tools"
        pillIcon={Terminal}
        title="API"
        titleHighlight="Reference"
        subtitle="Build powerful integrations with the Balji REST API. Comprehensive endpoints for leads, campaigns, calls, and analytics."
      />

      {/* ── Base URL ── */}
      <section ref={baseUrlSection.ref} className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${baseUrlSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-gray-900 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Base URL</span>
                <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                  <Copy size={12} />
                  Copy
                </button>
              </div>
              <code className="text-lg sm:text-xl font-mono text-emerald-400 tracking-wide">
                https://api.balji.app/v1
              </code>
              <p className="text-sm text-gray-500 mt-3">
                All API requests must include your API key in the <code className="text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded text-xs">Authorization</code> header as a Bearer token.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Endpoint Categories ── */}
      <section ref={endpointsSection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${endpointsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Endpoint Categories
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Our RESTful API is organized into logical resource groups. Each endpoint supports standard HTTP methods.
            </p>
          </div>

          <div className="space-y-6">
            {endpointCategories.map((cat, i) => (
              <div
                key={cat.title}
                className={`bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${endpointsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="p-7">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${cat.iconBg}`}>
                      <cat.icon size={22} className={cat.iconColor} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{cat.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {cat.endpoints.map((ep) => (
                      <a
                        key={`${ep.method}-${ep.path}`}
                        href="#"
                        className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${methodColors[ep.method]} min-w-[60px] justify-center`}>
                          {ep.method}
                        </span>
                        <code className="text-sm font-mono text-gray-700 flex-1">{ep.path}</code>
                        <span className="text-xs text-gray-400 hidden sm:inline">{ep.label}</span>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Code Snippet ── */}
      <section ref={codeSection.ref} className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${codeSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Quick Example
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Create a lead and add them to a campaign in just a few lines of code.
            </p>
          </div>

          <div className={`transition-all duration-700 delay-100 ${codeSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-blue-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-gray-800/50 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <span className="text-xs text-gray-500 font-mono">create-lead.js</span>
                  <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    <Copy size={12} />
                    Copy
                  </button>
                </div>

                <pre className="p-6 overflow-x-auto text-sm leading-relaxed font-mono">
                  <code>
                    {sampleCode.split('\n').map((line, idx) => {
                      let formattedLine: React.ReactNode = line

                      if (line.trimStart().startsWith('//')) {
                        formattedLine = <span style={{ color: '#6b7280' }}>{line}</span>
                      } else if (line.includes('const ') || line.includes('await ')) {
                        formattedLine = line.split(/\b(const|await|require|new)\b/).map((part, pi) => {
                          if (['const', 'await', 'require', 'new'].includes(part)) {
                            return <span key={pi} style={{ color: '#c084fc' }}>{part}</span>
                          }
                          if (part.includes("'")) {
                            return <span key={pi}>{part.split(/('[^']*')/).map((seg, si) => {
                              if (seg.startsWith("'") && seg.endsWith("'")) {
                                return <span key={si} style={{ color: '#34d399' }}>{seg}</span>
                              }
                              return <span key={si} style={{ color: '#e5e7eb' }}>{seg}</span>
                            })}</span>
                          }
                          return <span key={pi} style={{ color: '#e5e7eb' }}>{part}</span>
                        })
                      } else if (line.includes("'") || line.includes('"')) {
                        formattedLine = <span>{line.split(/('[^']*')/).map((seg, si) => {
                          if (seg.startsWith("'") && seg.endsWith("'")) {
                            return <span key={si} style={{ color: '#34d399' }}>{seg}</span>
                          }
                          return <span key={si} style={{ color: '#e5e7eb' }}>{seg}</span>
                        })}</span>
                      } else if (line.includes('console.log')) {
                        formattedLine = <span style={{ color: '#fbbf24' }}>{line}</span>
                      } else {
                        formattedLine = <span style={{ color: '#e5e7eb' }}>{line}</span>
                      }

                      return (
                        <span key={idx}>
                          <span style={{ color: '#4b5563', userSelect: 'none' }}>{String(idx + 1).padStart(2, ' ')}  </span>
                          {formattedLine}
                          {'\n'}
                        </span>
                      )
                    })}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SDK Cards ── */}
      <section ref={sdkSection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${sdkSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Official SDKs
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Install our official SDK for your language of choice and start building in minutes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sdkCards.map((sdk, i) => (
              <div
                key={sdk.title}
                className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${sdkSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${sdk.gradient} mb-6 shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  <span className="text-white font-bold text-lg font-mono">{sdk.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{sdk.title}</h3>
                <p className="text-sm text-gray-500 mb-5">{sdk.language}</p>

                <div className="bg-gray-900 rounded-xl px-4 py-3 mb-6">
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-emerald-400">{sdk.installCommand}</code>
                    <button className="text-gray-500 hover:text-gray-300 transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                <a href="#" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                  View on GitHub
                  <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <PublicCta />
    </div>
  )
}
