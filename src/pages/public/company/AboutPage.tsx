import { useEffect } from 'react'
import {
  Building2, Lightbulb, ShieldCheck, Heart, Eye,
  Target, ArrowRight, Users, Globe, Zap,
  Phone, BarChart3, Brain, Shield, Headphones,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

const PORTAL = 'https://portal.balji.app'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We build what brokers and ISOs actually need — not what legacy vendors recycle. Every feature is designed around real funding workflows.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ringColor: 'ring-amber-100',
  },
  {
    icon: ShieldCheck,
    title: 'Trust & Compliance',
    description: 'Brokers handle sensitive merchant data every day. We earn trust through SOC 2 compliance, encryption, TCPA tools, and transparent data practices.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    ringColor: 'ring-blue-100',
  },
  {
    icon: Heart,
    title: 'Customer-First',
    description: 'Every feature starts with a customer conversation. Our support team is available around the clock to make sure your brokerage succeeds.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    ringColor: 'ring-rose-100',
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'No hidden fees, no opaque algorithms, no surprises. We publish our pricing, share our roadmap, and communicate openly.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-100',
  },
]

const platformPillars = [
  {
    icon: Phone,
    title: 'Auto Dialer',
    description: 'Progressive and preview dialing modes built for high-volume merchant outreach with AI-paced call delivery.',
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Users,
    title: 'CRM Pipeline',
    description: 'Track every deal from first contact to funding with custom stages, contact views, and automated follow-ups.',
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Live dashboards for agent performance, pipeline health, and campaign metrics — no more guessing.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Call sentiment analysis, deal scoring, and automated coaching suggestions to help your team improve continuously.',
    gradient: 'from-violet-500 to-purple-600',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Sections
   ═══════════════════════════════════════════════════════════════════════════ */

function MissionSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Target size={14} className="text-indigo-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Our Mission</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-6">
              Helping Brokers &amp; ISOs{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                Close More Deals
              </span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              Business financing brokers and ISOs move fast. But the tools most teams rely on — disconnected dialers, generic CRMs, scattered spreadsheets — weren't built for the way funding shops actually work.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Balji was built to fix that. We provide a unified CPaaS platform purpose-built for brokers and ISOs, combining auto-dialing, CRM pipeline management, real-time analytics, and AI-powered insights into one workspace — so your team spends less time switching tabs and more time funding deals.
            </p>
          </div>

          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-10 overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-blue-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-gradient-to-tr from-emerald-500/15 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10 space-y-6">
                <h3 className="text-xl font-bold text-white mb-6">The problem we solve</h3>
                {[
                  'Agents toggling between 5+ disconnected tools',
                  'No visibility into pipeline health or agent performance',
                  'Manual dialing limiting your team to 40 calls/day',
                  'Compliance risk from scattered records and missing audit trails',
                  'Deals falling through the cracks due to missed follow-ups',
                ].map((pain, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-red-400 text-xs font-bold">&times;</span>
                    </div>
                    <span className="text-sm text-gray-300 leading-relaxed">{pain}</span>
                  </div>
                ))}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-emerald-400 font-semibold">Balji replaces all of this with one platform.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function StorySection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Building2 size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Our Story</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Built by People Who{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Understand the Hustle</span>
          </h2>
        </div>

        <div className={`space-y-8 transition-all duration-700 delay-100 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 lg:p-10">
            <p className="text-gray-600 leading-relaxed text-[15px] mb-6">
              Balji started with a simple observation: business financing brokers — the people who keep small businesses funded — were stuck using tools that were never designed for them. Generic CRMs that didn't understand deal pipelines. Dialers with no built-in compliance. Analytics that required a data team to interpret.
            </p>
            <p className="text-gray-600 leading-relaxed text-[15px] mb-6">
              We set out to build the platform we wished existed — one that combines everything a brokerage needs into a single, integrated workspace. A platform where your dialer knows your pipeline, your CRM tracks your calls, and your analytics update in real time.
            </p>
            <p className="text-gray-600 leading-relaxed text-[15px]">
              Today, Balji serves brokers and ISOs across every major funding vertical — from merchant cash advances and equipment financing to SBA loans and invoice factoring. Whether you're a solo broker or a 100-seat ISO, Balji is built to scale with you.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function PlatformSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Zap size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">What We Build</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            One Platform,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Everything You Need</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Balji brings dialing, CRM, analytics, and AI together so your team can focus on what matters — funding deals.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {platformPillars.map((pillar, i) => (
            <div
              key={pillar.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${pillar.gradient} mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <pillar.icon size={22} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{pillar.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ValuesSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Heart size={14} className="text-rose-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Our Values</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            What We{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Stand For</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            These principles guide every decision we make, from product design to customer relationships.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {values.map((value, i) => (
            <div
              key={value.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${value.iconBg} ring-1 ${value.ringColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <value.icon size={22} className={value.iconColor} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{value.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CommitmentsSection() {
  const { ref, visible } = useInView()

  const commitments = [
    { icon: Shield, title: 'SOC 2 Type II Certified', description: 'Your data is protected by industry-leading security controls, audited annually by independent assessors.' },
    { icon: Globe, title: '99.99% Uptime SLA', description: 'Our infrastructure is built for reliability. When your team needs to make calls, the platform is there.' },
    { icon: Headphones, title: '24/7 Live Support', description: 'Real humans, not bots. Our support team is available around the clock via chat, phone, and email.' },
    { icon: Zap, title: 'No Long-Term Contracts', description: 'Month-to-month plans with a 14-day free trial. We earn your business every month, not lock you in.' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Shield size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Our Commitments</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            What You Can{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Count On</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {commitments.map((c, i) => (
            <div
              key={c.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-7 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 mb-5 group-hover:scale-110 transition-transform duration-300">
                <c.icon size={22} className="text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">{c.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{c.description}</p>
            </div>
          ))}
        </div>

        <div className={`text-center mt-14 transition-all duration-700 delay-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <a
            href={`${PORTAL}/register`}
            className="group inline-flex items-center gap-2.5 px-8 py-4 text-[15px] font-semibold text-white rounded-2xl bg-gray-900 hover:bg-gray-800 shadow-xl shadow-gray-900/10 transition-all duration-300 hover:-translate-y-0.5"
          >
            Start Your Free Trial
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function AboutPage() {
  useEffect(() => {
    document.title = 'About Us | Balji'
  }, [])

  return (
    <>
      <PublicHero
        pill="About Balji"
        pillIcon={Building2}
        title="The CPaaS Platform Built for"
        titleHighlight="Brokers & ISOs"
        subtitle="Balji is a unified communications and CRM platform designed for business financing brokers and Independent Sales Organizations. One workspace to dial, track, and close."
      />
      <MissionSection />
      <StorySection />
      <PlatformSection />
      <ValuesSection />
      <CommitmentsSection />
      <PublicCta />
    </>
  )
}
