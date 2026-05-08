import { useEffect } from 'react'
import {
  Sparkles, GitBranch, Tag, Zap, Bug, TrendingUp,
  ChevronRight,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Types & Data
   ═══════════════════════════════════════════════════════════════════════════ */

type ChangeCategory = 'Feature' | 'Fix' | 'Improvement'

interface Change {
  category: ChangeCategory
  text: string
}

interface VersionEntry {
  version: string
  date: string
  summary: string
  changes: Change[]
}

const categoryStyles: Record<ChangeCategory, { bg: string; text: string; border: string }> = {
  Feature: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Fix: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  Improvement: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

const categoryIcons: Record<ChangeCategory, typeof Zap> = {
  Feature: Zap,
  Fix: Bug,
  Improvement: TrendingUp,
}

const versions: VersionEntry[] = [
  {
    version: 'v2.8.0',
    date: 'May 2, 2026',
    summary: 'AI-powered call scoring, enhanced campaign builder, and new webhook events.',
    changes: [
      { category: 'Feature', text: 'AI call scoring with real-time sentiment analysis and agent coaching recommendations across all active calls.' },
      { category: 'Feature', text: 'New visual campaign builder with drag-and-drop workflow editor for multi-step outreach sequences.' },
      { category: 'Feature', text: 'Added 12 new webhook event types including lead.scored, campaign.completed, and call.sentiment_analyzed.' },
      { category: 'Improvement', text: 'Campaign contact import now supports up to 100,000 records per batch with background processing.' },
      { category: 'Fix', text: 'Resolved an issue where call recordings over 60 minutes could fail to save in certain edge cases.' },
    ],
  },
  {
    version: 'v2.7.2',
    date: 'April 18, 2026',
    summary: 'Critical patch for WebSocket stability and CRM search performance.',
    changes: [
      { category: 'Fix', text: 'Fixed WebSocket reconnection loop that could occur after network interruptions lasting more than 30 seconds.' },
      { category: 'Fix', text: 'Resolved CRM full-text search timeout when querying across more than 500,000 contact records.' },
      { category: 'Improvement', text: 'Reduced API response time for /leads endpoint by 40% through query optimization and caching.' },
    ],
  },
  {
    version: 'v2.7.0',
    date: 'April 3, 2026',
    summary: 'Mobile app v2 launch, custom reporting, and Salesforce integration.',
    changes: [
      { category: 'Feature', text: 'Completely redesigned mobile app with native dialer, push-to-call, and offline CRM access for iOS and Android.' },
      { category: 'Feature', text: 'Custom report builder with drag-and-drop metrics, filters, and scheduled email delivery.' },
      { category: 'Feature', text: 'Native Salesforce integration with bidirectional sync for leads, contacts, and opportunity data.' },
      { category: 'Improvement', text: 'Dashboard loading time reduced by 60% with optimized data aggregation pipeline.' },
      { category: 'Fix', text: 'Fixed timezone handling in scheduled campaign launches for teams operating across multiple time zones.' },
    ],
  },
  {
    version: 'v2.6.1',
    date: 'March 15, 2026',
    summary: 'Hotfix for campaign scheduling and improved call quality monitoring.',
    changes: [
      { category: 'Fix', text: 'Patched a race condition in campaign scheduler that could cause duplicate calls to the same contact.' },
      { category: 'Fix', text: 'Corrected call quality score calculation that was not properly weighting packet loss metrics.' },
      { category: 'Improvement', text: 'Added real-time call quality indicators in the agent dialer interface with automatic bitrate adjustment.' },
    ],
  },
  {
    version: 'v2.6.0',
    date: 'February 28, 2026',
    summary: 'Advanced pipeline automation, team permissions overhaul, and HubSpot integration.',
    changes: [
      { category: 'Feature', text: 'Pipeline automation rules engine with conditional triggers, actions, and time-based delays for lead nurturing.' },
      { category: 'Feature', text: 'Granular team permissions with role-based access control, custom roles, and field-level security policies.' },
      { category: 'Feature', text: 'HubSpot CRM integration with automatic contact sync, deal mapping, and activity logging.' },
      { category: 'Improvement', text: 'Bulk operations (assign, tag, move stage) now support up to 10,000 records with progress tracking.' },
      { category: 'Improvement', text: 'Call recording playback now supports 1.5x and 2x speed with bookmark and annotation features.' },
      { category: 'Fix', text: 'Fixed an edge case where archived leads could appear in active campaign contact lists.' },
    ],
  },
  {
    version: 'v2.5.0',
    date: 'January 20, 2026',
    summary: 'Predictive dialer mode, SMS campaigns, and analytics API.',
    changes: [
      { category: 'Feature', text: 'Predictive dialer mode that uses machine learning to optimize call pacing based on historical connect rates.' },
      { category: 'Feature', text: 'SMS campaign support with template variables, opt-out management, and delivery analytics.' },
      { category: 'Feature', text: 'Public analytics API for building custom dashboards and exporting metrics programmatically.' },
      { category: 'Improvement', text: 'Agent onboarding flow redesigned with interactive product tour and sample data workspace.' },
      { category: 'Fix', text: 'Resolved CSV export encoding issue for contact records containing non-Latin characters.' },
    ],
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function ChangelogPage() {
  useEffect(() => { document.title = 'Changelog | Balji' }, [])

  const timelineSection = useInView()

  return (
    <div className="min-h-screen bg-white">
      <PublicHero
        pill="What's New"
        pillIcon={Sparkles}
        title="Changelog &"
        titleHighlight="Releases"
        subtitle="Stay up to date with the latest features, improvements, and bug fixes shipped to the Balji platform."
      />

      {/* ── Version Timeline ── */}
      <section ref={timelineSection.ref} className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-200 via-indigo-200 to-emerald-200 hidden md:block" />

            <div className="space-y-12">
              {versions.map((entry, vi) => (
                <div
                  key={entry.version}
                  className={`relative transition-all duration-700 ${timelineSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                  style={{ transitionDelay: `${vi * 120}ms` }}
                >
                  {/* Timeline dot */}
                  <div className="absolute left-[15px] top-1 w-[18px] h-[18px] rounded-full bg-white border-[3px] border-indigo-400 shadow-sm hidden md:block" />

                  <div className="md:ml-14">
                    {/* Version header */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                        <Tag size={14} className="text-indigo-600" />
                        <span className="text-sm font-bold text-gray-900">{entry.version}</span>
                      </span>
                      <span className="text-sm text-gray-400 font-medium">{entry.date}</span>
                    </div>

                    {/* Summary */}
                    <p className="text-base text-gray-600 mb-6 leading-relaxed">{entry.summary}</p>

                    {/* Changes card */}
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl transition-shadow duration-300">
                      <div className="divide-y divide-gray-50">
                        {entry.changes.map((change, ci) => {
                          const style = categoryStyles[change.category]
                          const CategoryIcon = categoryIcons[change.category]
                          return (
                            <div key={ci} className="flex items-start gap-4 p-5 hover:bg-gray-50/50 transition-colors">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 mt-0.5 ${style.bg} ${style.text} ${style.border}`}>
                                <CategoryIcon size={11} />
                                {change.category}
                              </span>
                              <p className="text-sm text-gray-600 leading-relaxed">{change.text}</p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            <div className={`mt-12 text-center transition-all duration-700 delay-700 ${timelineSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              <a href="#" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all">
                <GitBranch size={16} />
                View Full Release History
                <ChevronRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <PublicCta />
    </div>
  )
}
