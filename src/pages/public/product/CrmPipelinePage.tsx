import { useEffect, useState } from 'react'
import {
  Users, Target, Settings, Mail, CheckSquare, Star,
  ChevronRight, Phone, MapPin, Building2, Calendar,
  DollarSign, Clock, Tag, FileText, MessageSquare,
  ArrowRight, TrendingUp, UserPlus, GripVertical,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Kanban Board Mockup
   ═══════════════════════════════════════════════════════════════════════════ */

function KanbanMockup() {
  const { ref, visible } = useInView()
  const [draggedCard, setDraggedCard] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setDraggedCard('GreenField Capital'), 2000)
    const t2 = setTimeout(() => setDraggedCard(null), 3500)
    return () => { clearTimeout(t); clearTimeout(t2) }
  }, [visible])

  const columns = [
    {
      stage: 'New Leads',
      count: 48,
      value: '$1.2M',
      color: 'border-t-blue-400',
      dotColor: 'bg-blue-400',
      items: [
        { name: 'TechFlow Inc.', amount: '$85,000', date: 'May 2', contact: 'Sarah Mitchell', risk: 'Low' },
        { name: 'DataBridge Co.', amount: '$120,000', date: 'May 1', contact: 'James Rodriguez', risk: 'Medium' },
        { name: 'CloudNine LLC', amount: '$45,000', date: 'Apr 30', contact: 'Emily Chen', risk: 'Low' },
      ],
    },
    {
      stage: 'Qualified',
      count: 32,
      value: '$2.8M',
      color: 'border-t-indigo-400',
      dotColor: 'bg-indigo-400',
      items: [
        { name: 'PayScale Corp', amount: '$250,000', date: 'Apr 28', contact: 'David Alvarez', risk: 'Low' },
        { name: 'Vertex Finance', amount: '$180,000', date: 'Apr 27', contact: 'Lisa Park', risk: 'Medium' },
        { name: 'LoanStar Ltd', amount: '$95,000', date: 'Apr 26', contact: 'Mark Johnson', risk: 'Low' },
      ],
    },
    {
      stage: 'Proposal',
      count: 18,
      value: '$2.1M',
      color: 'border-t-violet-400',
      dotColor: 'bg-violet-400',
      items: [
        { name: 'GreenField Capital', amount: '$320,000', date: 'Apr 25', contact: 'Rachel Adams', risk: 'Low' },
        { name: 'BlueSky Fund', amount: '$150,000', date: 'Apr 24', contact: 'Tom Baker', risk: 'High' },
        { name: 'Apex Lending', amount: '$200,000', date: 'Apr 23', contact: 'Nina Patel', risk: 'Medium' },
      ],
    },
    {
      stage: 'Funded',
      count: 12,
      value: '$2.1M',
      color: 'border-t-emerald-400',
      dotColor: 'bg-emerald-400',
      items: [
        { name: 'NovaPay Inc.', amount: '$175,000', date: 'Apr 22', contact: 'Chris Lee', risk: 'Low' },
        { name: 'SwiftCap LLC', amount: '$290,000', date: 'Apr 21', contact: 'Anna Kim', risk: 'Low' },
        { name: 'FundMax Group', amount: '$340,000', date: 'Apr 20', contact: 'Mike Torres', risk: 'Low' },
      ],
    },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative">
            <div className="absolute -inset-8 bg-gradient-to-br from-indigo-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />

            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl shadow-gray-200/40 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-3.5 bg-gray-50 border-b border-gray-200/80">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-300" />
                  <div className="w-3 h-3 rounded-full bg-amber-300" />
                  <div className="w-3 h-3 rounded-full bg-emerald-300" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-1.5 text-xs text-gray-400 min-w-[240px]">
                    <Target size={11} className="text-emerald-500" />
                    portal.balji.app/pipeline
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-white">
                <span className="text-sm font-semibold text-gray-900">Deal Pipeline</span>
                <span className="text-[11px] text-gray-400 font-medium">$8.2M total value</span>
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md font-medium">Board View</span>
                  <span className="text-[10px] text-gray-400 px-2.5 py-1 rounded-md font-medium">List View</span>
                </div>
              </div>

              {/* Kanban board */}
              <div className="p-6 bg-gray-50/50 min-h-[480px] overflow-x-auto">
                <div className="grid grid-cols-4 gap-3 min-w-[800px]">
                  {columns.map((col) => (
                    <div key={col.stage} className={`bg-white rounded-xl border border-gray-100 border-t-2 ${col.color} overflow-hidden`}>
                      <div className="p-3 border-b border-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                            <span className="text-xs font-semibold text-gray-900">{col.stage}</span>
                          </div>
                          <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">{col.count}</span>
                        </div>
                        <span className="text-[10px] text-gray-400">{col.value}</span>
                      </div>
                      <div className="p-2 space-y-2">
                        {col.items.map(item => (
                          <div
                            key={item.name}
                            className={`p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer border border-transparent hover:border-gray-200 ${
                              draggedCard === item.name ? 'ring-2 ring-indigo-300 shadow-lg -translate-y-1 scale-[1.02]' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-[11px] font-semibold text-gray-900">{item.name}</p>
                              <GripVertical size={12} className="text-gray-300 mt-0.5 flex-shrink-0" />
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-medium text-emerald-600">{item.amount}</span>
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                item.risk === 'Low' ? 'bg-emerald-50 text-emerald-600' : item.risk === 'Medium' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                              }`}>{item.risk} Risk</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-[6px] font-bold text-white">
                                  {item.contact.split(' ').map(n => n[0]).join('')}
                                </div>
                                <span className="text-[9px] text-gray-400">{item.contact}</span>
                              </div>
                              <span className="text-[9px] text-gray-400">{item.date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Contact Card Mockup
   ═══════════════════════════════════════════════════════════════════════════ */

function ContactCardSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Contact card */}
          <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/30 via-transparent to-violet-100/30 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden max-w-md mx-auto lg:mx-0">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <span className="text-white text-xl font-bold">SM</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Sarah Mitchell</h3>
                      <p className="text-gray-400 text-sm">CFO, TechFlow Inc.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">Qualified Lead</span>
                        <span className="text-[10px] font-semibold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">High Priority</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Phone, label: 'Phone', value: '+1 (555) 842-9173' },
                      { icon: Mail, label: 'Email', value: 's.mitchell@techflow.io' },
                      { icon: Building2, label: 'Company', value: 'TechFlow Inc.' },
                      { icon: MapPin, label: 'Location', value: 'San Francisco, CA' },
                      { icon: DollarSign, label: 'Deal Size', value: '$250,000' },
                      { icon: Calendar, label: 'Last Contact', value: 'May 6, 2026' },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-1.5 mb-1">
                          <item.icon size={11} className="text-gray-400" />
                          <span className="text-[10px] text-gray-400 font-medium">{item.label}</span>
                        </div>
                        <span className="text-xs font-medium text-gray-900">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {['MCA', 'SaaS', 'Series B', 'Q2 Target'].map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                        <Tag size={9} />
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Activity timeline */}
                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-xs font-semibold text-gray-900 mb-3">Recent Activity</p>
                    <div className="space-y-3">
                      {[
                        { action: 'Call completed - discussed terms', time: '2h ago', icon: Phone, dotColor: 'bg-emerald-400' },
                        { action: 'Proposal email sent', time: '1d ago', icon: Mail, dotColor: 'bg-blue-400' },
                        { action: 'Meeting note added', time: '2d ago', icon: FileText, dotColor: 'bg-amber-400' },
                        { action: 'Lead score updated to 92', time: '3d ago', icon: TrendingUp, dotColor: 'bg-violet-400' },
                      ].map((a, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <div className="relative mt-1">
                            <div className={`w-2 h-2 rounded-full ${a.dotColor}`} />
                            {i < 3 && <div className="absolute top-2.5 left-[3px] w-[2px] h-5 bg-gray-100" />}
                          </div>
                          <div className="flex-1 flex items-center justify-between">
                            <span className="text-[11px] text-gray-600">{a.action}</span>
                            <span className="text-[10px] text-gray-400">{a.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-semibold shadow-sm hover:bg-gray-800 transition-colors">
                      <Phone size={13} /> Call
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors">
                      <Mail size={13} /> Email
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-50 transition-colors">
                      <MessageSquare size={13} /> SMS
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Description */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <UserPlus size={14} className="text-indigo-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">360-Degree Contact View</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              Every Merchant Detail,{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">One Click Away</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              See the full picture for every contact. Call history, deal status, email threads, notes, and AI-generated insights -- all in a unified profile.
            </p>
            <div className="space-y-4">
              {[
                'Complete communication history across all channels',
                'Custom fields tailored for business financing workflows',
                'AI-scored lead quality with risk assessment',
                'Automated activity logging - no manual data entry',
                'Quick-action buttons for call, email, and SMS',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <ChevronRight size={12} className="text-emerald-600" />
                  </div>
                  <span className="text-gray-600 text-[15px]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features Grid
   ═══════════════════════════════════════════════════════════════════════════ */

function FeaturesGrid() {
  const { ref, visible } = useInView()

  const features = [
    { icon: Target, title: 'Deal Tracking', desc: 'Drag-and-drop Kanban board with custom pipeline stages. Track every deal from application through funding with full audit trails.', iconBg: 'bg-blue-50 ring-blue-100', iconColor: 'text-blue-600' },
    { icon: Users, title: 'Contact Management', desc: '360-degree merchant profiles with complete communication history, documents, and AI-generated summaries across every touchpoint.', iconBg: 'bg-indigo-50 ring-indigo-100', iconColor: 'text-indigo-600' },
    { icon: Settings, title: 'Custom Fields', desc: 'Build the CRM around your workflow. Custom fields, deal stages, dispositions, and scoring criteria for business financing.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600' },
    { icon: Mail, title: 'Email Integration', desc: 'Bi-directional email sync with Gmail and Outlook. Send, receive, and track emails directly from merchant records.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600' },
    { icon: CheckSquare, title: 'Task Management', desc: 'Assign follow-ups, set reminders, and track task completion. Automated task creation based on deal stage transitions.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600' },
    { icon: Star, title: 'Lead Scoring', desc: 'AI-powered scoring based on engagement, financial signals, and communication patterns. Prioritize the deals most likely to fund.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Target size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">CRM Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            A CRM Purpose-Built for{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Brokers & ISOs</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Not just another generic CRM. Every feature is designed around the broker and ISO workflow.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.iconBg} ring-1 mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={22} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pipeline Stats
   ═══════════════════════════════════════════════════════════════════════════ */

function PipelineStats() {
  const { ref, visible } = useInView()

  const stages = [
    { label: 'New Leads', value: '$1.2M', count: '48 deals', width: '25%', color: 'from-blue-500 to-blue-400' },
    { label: 'Qualified', value: '$2.8M', count: '32 deals', width: '45%', color: 'from-indigo-500 to-indigo-400' },
    { label: 'Proposal', value: '$2.1M', count: '18 deals', width: '35%', color: 'from-violet-500 to-violet-400' },
    { label: 'Funded', value: '$2.1M', count: '12 deals', width: '30%', color: 'from-emerald-500 to-emerald-400' },
  ]

  return (
    <section ref={ref} className="py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-8 lg:p-12 shadow-2xl shadow-gray-900/20">
          <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">Pipeline at a Glance</h2>
            <p className="text-gray-400">$8.2M total pipeline value across 110 active deals</p>
          </div>
          <div className="space-y-6">
            {stages.map((s, i) => (
              <div
                key={s.label}
                className={`transition-all duration-700 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-white">{s.label}</span>
                    <span className="text-xs text-gray-500">{s.count}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{s.value}</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className={`bg-gradient-to-r ${s.color} h-3 rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: visible ? s.width : '0%', transitionDelay: `${i * 120 + 300}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function CrmPipelinePage() {
  useEffect(() => { document.title = 'CRM Pipeline | Balji' }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <PublicHero
        pill="CRM Pipeline"
        pillIcon={Users}
        title="Track Every Deal from Application to"
        titleHighlight="Funding"
        subtitle="A purpose-built CRM with drag-and-drop Kanban boards, 360-degree contact views, and intelligent deal tracking designed for brokers and ISOs."
      />
      <KanbanMockup />
      <ContactCardSection />
      <FeaturesGrid />
      <PipelineStats />
      <PublicCta />
    </div>
  )
}
