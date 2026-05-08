import { useEffect } from 'react'
import {
  BookOpen, Search, Rocket, Megaphone, Code2,
  Settings, BarChart3, Users, Puzzle, Terminal,
  ChevronRight, FileText, ArrowRight,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const quickStartCards = [
  {
    icon: Rocket,
    title: 'Getting Started',
    description: 'Create your account, configure your workspace, and invite your team in under 5 minutes.',
    link: '#',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-100',
  },
  {
    icon: Megaphone,
    title: 'First Campaign',
    description: 'Import contacts, build your first outbound campaign, and start connecting with borrowers.',
    link: '#',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    borderColor: 'border-emerald-100',
  },
  {
    icon: Code2,
    title: 'API Integration',
    description: 'Connect Balji to your existing stack with our REST API, webhooks, and pre-built SDKs.',
    link: '#',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    borderColor: 'border-violet-100',
  },
]

const categories = [
  { icon: Settings, title: 'Setup & Config', docs: 24, color: 'text-blue-600', bg: 'bg-blue-50' },
  { icon: Megaphone, title: 'Campaigns', docs: 18, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { icon: Users, title: 'CRM & Contacts', docs: 31, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { icon: BarChart3, title: 'Analytics', docs: 15, color: 'text-amber-600', bg: 'bg-amber-50' },
  { icon: Puzzle, title: 'Integrations', docs: 22, color: 'text-pink-600', bg: 'bg-pink-50' },
  { icon: Terminal, title: 'API & Webhooks', docs: 28, color: 'text-violet-600', bg: 'bg-violet-50' },
]

const popularArticles = [
  { title: 'How to configure auto-dialer pacing for optimal connect rates', category: 'Campaigns', time: '5 min read' },
  { title: 'Setting up SSO with SAML 2.0 and OIDC providers', category: 'Setup', time: '8 min read' },
  { title: 'Building custom analytics dashboards with filters and segments', category: 'Analytics', time: '6 min read' },
  { title: 'Importing and deduplicating contacts from CSV and CRM exports', category: 'CRM', time: '4 min read' },
  { title: 'Webhook event types and payload reference guide', category: 'API', time: '10 min read' },
  { title: 'Configuring call recording storage and retention policies', category: 'Setup', time: '3 min read' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function DocumentationPage() {
  useEffect(() => { document.title = 'Documentation | Balji' }, [])

  const quickStartSection = useInView()
  const searchSection = useInView()
  const categorySection = useInView()
  const articlesSection = useInView()

  return (
    <div className="min-h-screen bg-white">
      <PublicHero
        pill="Knowledge Base"
        pillIcon={BookOpen}
        title="Documentation &"
        titleHighlight="Guides"
        subtitle="Everything you need to set up, configure, and get the most out of Balji. From quick-start tutorials to advanced API references."
      />

      {/* ── Quick Start Cards ── */}
      <section ref={quickStartSection.ref} className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${quickStartSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Quick Start
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Get up and running with Balji in minutes. Follow these guided walkthroughs to hit the ground running.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickStartCards.map((card, i) => (
              <a
                key={card.title}
                href={card.link}
                className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${quickStartSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${card.iconBg} border ${card.borderColor} mb-6 transition-transform duration-300 group-hover:scale-110`}>
                  <card.icon size={26} className={card.iconColor} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{card.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">{card.description}</p>
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-600 group-hover:gap-3 transition-all duration-300">
                  Start guide
                  <ArrowRight size={16} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Search Bar ── */}
      <section ref={searchSection.ref} className="pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`transition-all duration-700 ${searchSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-100/40 via-indigo-100/40 to-emerald-100/40 rounded-2xl blur-xl" />
              <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg p-2">
                <div className="flex items-center gap-4 px-4 py-3">
                  <Search size={22} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="text"
                    placeholder="Search documentation... e.g. 'auto dialer setup', 'webhook events'"
                    className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
                    readOnly
                  />
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
                    <kbd className="text-xs font-medium text-gray-500">Ctrl</kbd>
                    <span className="text-xs text-gray-400">+</span>
                    <kbd className="text-xs font-medium text-gray-500">K</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category Grid ── */}
      <section ref={categorySection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${categorySection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Browse by Category
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Explore our documentation organized by topic. Each category contains step-by-step guides and reference material.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <a
                key={cat.title}
                href="#"
                className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${categorySection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${cat.bg} transition-transform duration-300 group-hover:scale-110`}>
                    <cat.icon size={22} className={cat.color} />
                  </div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm text-xs font-medium text-gray-500">
                    {cat.docs} docs
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1.5">{cat.title}</h3>
                <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  Browse articles <ChevronRight size={14} />
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Popular Articles ── */}
      <section ref={articlesSection.ref} className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${articlesSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Popular Articles
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              The most-read guides across our documentation, curated for teams getting started.
            </p>
          </div>

          <div className="space-y-3">
            {popularArticles.map((article, i) => (
              <a
                key={article.title}
                href="#"
                className={`group flex items-center gap-4 bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${articlesSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                  <FileText size={18} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {article.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200 shadow-sm text-[11px] font-medium text-gray-500">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-400">{article.time}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <PublicCta />
    </div>
  )
}
