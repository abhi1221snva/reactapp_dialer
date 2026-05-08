import { useEffect } from 'react'
import {
  Building2, Lightbulb, ShieldCheck, Heart, Eye,
  Rocket, TrendingUp, Users, Award, Target,
  ArrowRight, Calendar,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const timeline = [
  {
    year: '2021',
    title: 'Founded',
    description: 'Balji was born from a simple idea: revenue-based financing teams deserve purpose-built communication tools, not retrofitted generic software.',
    icon: Rocket,
    gradient: 'from-blue-500 to-indigo-600',
  },
  {
    year: '2022',
    title: 'Seed Round',
    description: 'Raised $4.2M seed funding led by Gradient Ventures. Launched our auto-dialer and CRM pipeline to first 50 customers.',
    icon: TrendingUp,
    gradient: 'from-indigo-500 to-violet-600',
  },
  {
    year: '2023',
    title: 'Series A',
    description: 'Closed $18M Series A led by Accel Partners. Expanded to multi-channel outreach with SMS, email, and AI-powered analytics.',
    icon: Award,
    gradient: 'from-violet-500 to-purple-600',
  },
  {
    year: '2024',
    title: '500+ Clients',
    description: 'Crossed 500 active finance teams on the platform. Launched mobile apps, AI coaching, and SOC 2 Type II compliance.',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
  },
]

const team = [
  { name: 'Arjun Mehta', role: 'Co-Founder & CEO', initials: 'AM', gradient: 'from-blue-500 to-indigo-600' },
  { name: 'Sarah Lin', role: 'Co-Founder & CTO', initials: 'SL', gradient: 'from-emerald-500 to-teal-600' },
  { name: 'David Okafor', role: 'VP Engineering', initials: 'DO', gradient: 'from-violet-500 to-purple-600' },
  { name: 'Maria Santos', role: 'VP Product', initials: 'MS', gradient: 'from-pink-500 to-rose-600' },
  { name: 'James Wright', role: 'VP Sales', initials: 'JW', gradient: 'from-amber-500 to-orange-600' },
  { name: 'Priya Patel', role: 'Head of Design', initials: 'PP', gradient: 'from-cyan-500 to-blue-600' },
  { name: 'Marcus Chen', role: 'Head of AI/ML', initials: 'MC', gradient: 'from-indigo-500 to-blue-600' },
  { name: 'Rachel Kim', role: 'Head of Customer Success', initials: 'RK', gradient: 'from-teal-500 to-emerald-600' },
]

const values = [
  {
    icon: Lightbulb,
    title: 'Innovation',
    description: 'We push boundaries relentlessly. From AI-powered call analytics to predictive collection scoring, we build what others haven\'t imagined yet.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ringColor: 'ring-amber-100',
  },
  {
    icon: ShieldCheck,
    title: 'Trust',
    description: 'Finance teams handle sensitive data. We earn trust through SOC 2 compliance, end-to-end encryption, and transparent data practices every single day.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    ringColor: 'ring-blue-100',
  },
  {
    icon: Heart,
    title: 'Customer-First',
    description: 'Every feature we ship starts with a customer conversation. Our 24/7 support team and dedicated CSMs ensure your success is our success.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    ringColor: 'ring-rose-100',
  },
  {
    icon: Eye,
    title: 'Transparency',
    description: 'No hidden fees, no opaque algorithms, no surprises. We publish our pricing, share our roadmap, and communicate openly with every stakeholder.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-100',
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
              Empowering Finance Teams to{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                Communicate Smarter
              </span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-6">
              Revenue-based financing is transforming how businesses access capital. But the teams behind these transactions still rely on fragmented tools -- generic CRMs, disconnected dialers, and spreadsheets that can't keep pace.
            </p>
            <p className="text-lg text-gray-500 leading-relaxed">
              Balji was built to change that. We provide a unified CPaaS platform purpose-built for lending and collections teams, combining auto-dialing, CRM pipeline management, real-time analytics, and AI-powered insights into a single, beautiful workspace.
            </p>
          </div>

          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-10 text-center overflow-hidden">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-blue-500/15 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-gradient-to-tr from-emerald-500/15 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="grid grid-cols-2 gap-6">
                  {[
                    { value: '500+', label: 'Finance Teams' },
                    { value: '12M+', label: 'Calls Processed' },
                    { value: '99.99%', label: 'Platform Uptime' },
                    { value: '45+', label: 'Countries Served' },
                  ].map((stat, i) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-3xl font-extrabold text-white tracking-tight mb-1">{stat.value}</div>
                      <div className="text-sm font-medium text-gray-400">{stat.label}</div>
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

function TimelineSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Calendar size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Our Journey</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            From Idea to{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Industry Leader</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            A timeline of milestones that shaped our platform and our vision.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Vertical line */}
          <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-blue-200 via-indigo-200 to-emerald-200 -translate-x-1/2" />

          <div className="space-y-12">
            {timeline.map((item, i) => (
              <div
                key={item.year}
                className={`relative flex items-start gap-8 md:gap-12 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                }`}
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                {/* Dot on the line */}
                <div className="absolute left-8 md:left-1/2 -translate-x-1/2 z-10">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} flex items-center justify-center shadow-lg ring-4 ring-white`}>
                    <item.icon size={20} className="text-white" />
                  </div>
                </div>

                {/* Content card */}
                <div className={`ml-20 md:ml-0 md:w-[calc(50%-40px)] bg-white border border-gray-100 shadow-sm rounded-2xl p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${item.gradient} text-white mb-3`}>
                    {item.year}
                  </span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{item.description}</p>
                </div>

                {/* Spacer for the other side */}
                <div className="hidden md:block md:w-[calc(50%-40px)]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function TeamSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Users size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Leadership Team</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            The People Behind{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Balji</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            A world-class team of engineers, designers, and finance veterans building the future of lending communications.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {team.map((member, i) => (
            <div
              key={member.name}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-6 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <span className="text-white text-xl font-bold">{member.initials}</span>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">{member.name}</h3>
              <p className="text-sm text-gray-500">{member.role}</p>
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
        title="Building the Future of"
        titleHighlight="Lending Communications"
        subtitle="We're on a mission to give every revenue-based financing team a unified, intelligent communications platform that drives results."
      />
      <MissionSection />
      <TimelineSection />
      <TeamSection />
      <ValuesSection />
      <PublicCta />
    </>
  )
}
