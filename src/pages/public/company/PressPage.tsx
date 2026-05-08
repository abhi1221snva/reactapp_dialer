import { useEffect } from 'react'
import {
  Newspaper, Calendar, Download, FileText, Image, Package,
  ArrowRight, ExternalLink, Award, TrendingUp, Globe, Rocket,
  ChevronRight,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const pressReleases = [
  {
    date: 'April 15, 2026',
    title: 'Balji Launches AI Call Coaching for Brokers & ISOs',
    description: 'New feature provides real-time, AI-driven coaching to agents during live calls, helping teams improve close rates by up to 28% in the first month.',
    icon: Rocket,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    date: 'January 22, 2026',
    title: 'Balji Surpasses 500 Brokerage Customers Worldwide',
    description: 'Milestone driven by rapid adoption among brokers and ISOs, with customers across 45+ countries processing over 12 million calls on the platform.',
    icon: Globe,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    date: 'September 8, 2025',
    title: 'Balji Achieves SOC 2 Type II Certification',
    description: 'Independent audit confirms Balji meets the highest standards for security, availability, and confidentiality -- a critical milestone for enterprise customers.',
    icon: Award,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    date: 'May 3, 2025',
    title: 'Balji Raises $18M Series A Led by Accel Partners',
    description: 'Funding will accelerate product development, expand the AI/ML team, and support international growth as demand from brokers and ISOs surges globally.',
    icon: TrendingUp,
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    date: 'November 15, 2024',
    title: 'Balji Launches Mobile Apps for iOS and Android',
    description: 'Brokers and ISOs can now manage their full CRM pipeline, make calls, and track analytics on the go with native mobile applications available on both platforms.',
    icon: Globe,
    gradient: 'from-pink-500 to-rose-600',
  },
]

const mediaKit = [
  {
    icon: Image,
    title: 'Brand Assets',
    description: 'Logos, brand colors, typography guidelines, and usage rules in a comprehensive brand book.',
    format: 'ZIP, 24 MB',
  },
  {
    icon: FileText,
    title: 'Logos',
    description: 'Balji logo in SVG, PNG, and EPS formats. Light, dark, and monochrome variations included.',
    format: 'ZIP, 8 MB',
  },
  {
    icon: Package,
    title: 'Press Kit',
    description: 'Company fact sheet, executive bios, product screenshots, and boilerplate copy for media use.',
    format: 'ZIP, 32 MB',
  },
]

const mediaCoverage = [
  {
    publication: 'TechCrunch',
    headline: 'Balji raises $18M to build the CPaaS platform brokers actually need',
    date: 'May 2025',
    color: 'from-green-500 to-emerald-600',
    initials: 'TC',
  },
  {
    publication: 'Forbes FinTech',
    headline: 'How AI-powered call coaching is transforming business financing outreach',
    date: 'March 2026',
    color: 'from-blue-600 to-indigo-700',
    initials: 'FF',
  },
  {
    publication: 'The Information',
    headline: 'Inside Balji\'s rapid growth: from seed stage to 500+ enterprise customers',
    date: 'January 2026',
    color: 'from-gray-700 to-gray-900',
    initials: 'TI',
  },
  {
    publication: 'Fintech Times',
    headline: 'Business financing platforms embrace purpose-built communication tools',
    date: 'November 2025',
    color: 'from-violet-500 to-purple-600',
    initials: 'FT',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Sections
   ═══════════════════════════════════════════════════════════════════════════ */

function PressReleasesSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Calendar size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Press Releases</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Latest{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Announcements</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Official press releases and company announcements from the Balji team.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical timeline line */}
          <div className="absolute left-8 top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-200 via-indigo-200 to-emerald-200" />

          <div className="space-y-8">
            {pressReleases.map((release, i) => (
              <div
                key={release.title}
                className={`relative flex items-start gap-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Timeline dot */}
                <div className="absolute left-8 -translate-x-1/2 z-10">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${release.gradient} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                    <release.icon size={20} className="text-white" />
                  </div>
                </div>

                {/* Content */}
                <div className="ml-20 flex-1">
                  <a
                    href="#"
                    className="group block bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm text-gray-400 font-medium">{release.date}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                      {release.title}
                    </h3>
                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                      {release.description}
                    </p>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      Read full release
                      <ChevronRight size={14} />
                    </div>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function MediaKitSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Download size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Media Kit</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Brand &{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Media Resources</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Download official Balji brand assets, logos, and press materials for media coverage.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {mediaKit.map((item, i) => (
            <div
              key={item.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-5 group-hover:scale-110 transition-transform duration-300">
                <item.icon size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.description}</p>
              <span className="text-xs text-gray-400 font-medium">{item.format}</span>
              <button className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 shadow-lg shadow-gray-900/10 transition-all duration-300 hover:-translate-y-px">
                <Download size={16} />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function MediaCoverageSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <ExternalLink size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">In The News</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Media{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Coverage</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            What leading publications are saying about Balji and the future of fintech communications.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {mediaCoverage.map((item, i) => (
            <a
              key={item.headline}
              href="#"
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                  <span className="text-white text-sm font-bold">{item.initials}</span>
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900">{item.publication}</div>
                  <div className="text-xs text-gray-400">{item.date}</div>
                </div>
              </div>
              <h3 className="text-base font-semibold text-gray-700 leading-relaxed group-hover:text-indigo-600 transition-colors mb-3">
                &ldquo;{item.headline}&rdquo;
              </h3>
              <div className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                Read article
                <ExternalLink size={13} />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function PressPage() {
  useEffect(() => {
    document.title = 'Press | Balji'
  }, [])

  return (
    <>
      <PublicHero
        pill="Press & Media"
        pillIcon={Newspaper}
        title="Balji in the"
        titleHighlight="News"
        subtitle="Press releases, media resources, and coverage of Balji's mission to transform communications for brokers and ISOs."
      />
      <PressReleasesSection />
      <MediaKitSection />
      <MediaCoverageSection />
      <PublicCta
        title="Media Inquiries?"
        subtitle="For press inquiries, interview requests, or additional information, reach out to our communications team at press@balji.app."
      />
    </>
  )
}
