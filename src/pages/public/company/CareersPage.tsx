import { useEffect } from 'react'
import {
  Briefcase, Heart, TrendingUp, Wifi, Calendar, BookOpen,
  PartyPopper, MapPin, Clock, ChevronRight, Users,
  Dumbbell, Coffee, Laptop, Shield, Sparkles, ArrowRight,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const benefits = [
  {
    icon: Heart,
    title: 'Health & Wellness',
    description: 'Comprehensive medical, dental, and vision coverage for you and your dependents. Plus a $1,200/year wellness stipend.',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    ringColor: 'ring-rose-100',
  },
  {
    icon: TrendingUp,
    title: 'Equity Package',
    description: 'Meaningful stock options with a four-year vesting schedule. We want every team member to share in Balji\'s success.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-100',
  },
  {
    icon: Wifi,
    title: 'Remote-First',
    description: 'Work from anywhere in the world. We provide a $2,500 home office stipend and monthly co-working space allowance.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    ringColor: 'ring-blue-100',
  },
  {
    icon: Calendar,
    title: 'Generous PTO',
    description: 'Unlimited paid time off with a minimum of 20 days encouraged. Plus company-wide wellness weeks twice a year.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ringColor: 'ring-amber-100',
  },
  {
    icon: BookOpen,
    title: 'Learning Budget',
    description: '$3,000 annual learning and development budget for conferences, courses, books, or certifications of your choice.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    ringColor: 'ring-violet-100',
  },
  {
    icon: PartyPopper,
    title: 'Team Events',
    description: 'Annual company retreats in exciting destinations, plus monthly virtual socials, game nights, and hackathons.',
    iconBg: 'bg-pink-50',
    iconColor: 'text-pink-600',
    ringColor: 'ring-pink-100',
  },
]

const departments = [
  {
    name: 'Engineering',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    positions: [
      { title: 'Senior Full-Stack Engineer', location: 'Remote (US/EU)', type: 'Full-time' },
      { title: 'Staff Backend Engineer (Telephony)', location: 'Remote (US)', type: 'Full-time' },
      { title: 'ML Engineer - NLP/Speech', location: 'San Francisco, CA', type: 'Full-time' },
    ],
  },
  {
    name: 'Sales',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    positions: [
      { title: 'Enterprise Account Executive', location: 'New York, NY', type: 'Full-time' },
      { title: 'Sales Development Representative', location: 'Remote (US)', type: 'Full-time' },
    ],
  },
  {
    name: 'Design',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    positions: [
      { title: 'Senior Product Designer', location: 'Remote (US/EU)', type: 'Full-time' },
      { title: 'UX Researcher', location: 'San Francisco, CA', type: 'Full-time' },
    ],
  },
  {
    name: 'Product',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    positions: [
      { title: 'Senior Product Manager - Platform', location: 'Remote (US)', type: 'Full-time' },
      { title: 'Product Manager - AI/ML', location: 'San Francisco, CA', type: 'Full-time' },
      { title: 'Technical Program Manager', location: 'Remote (US/EU)', type: 'Full-time' },
    ],
  },
]

const perks = [
  { icon: Laptop, label: 'Latest MacBook Pro' },
  { icon: Dumbbell, label: 'Gym Membership' },
  { icon: Coffee, label: 'Monthly Snack Box' },
  { icon: Shield, label: '401(k) Match' },
  { icon: Heart, label: 'Mental Health Support' },
  { icon: Calendar, label: 'Flexible Hours' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Sections
   ═══════════════════════════════════════════════════════════════════════════ */

function BenefitsSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Sparkles size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Benefits</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Why You'll Love{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Working Here</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            We invest in our people because great products come from happy, supported teams.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, i) => (
            <div
              key={benefit.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${benefit.iconBg} ring-1 ${benefit.ringColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <benefit.icon size={22} className={benefit.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{benefit.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function OpenPositionsSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Briefcase size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Open Positions</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Find Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Next Role</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Join a fast-growing team that's reshaping how brokers and ISOs communicate and close deals.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-10">
          {departments.map((dept, di) => (
            <div
              key={dept.name}
              className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${di * 120}ms` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-xl font-bold text-gray-900">{dept.name}</h3>
                <span className="text-sm text-gray-400 font-medium">
                  {dept.positions.length} {dept.positions.length === 1 ? 'role' : 'roles'}
                </span>
              </div>

              <div className="space-y-3">
                {dept.positions.map((pos) => (
                  <a
                    key={pos.title}
                    href="#"
                    className="group flex items-center justify-between bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                        {pos.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${dept.color}`}>
                          {dept.name}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                          <MapPin size={14} />
                          {pos.location}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-400">
                          <Clock size={14} />
                          {pos.type}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-0 group-hover:translate-x-1">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                        <ArrowRight size={18} className="text-indigo-600" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PerksSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`relative bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 rounded-3xl p-10 md:p-16 overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.98]'}`}>
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-blue-500/15 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-emerald-500/15 to-transparent rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
                And a Few More Perks
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                The little things that make a big difference in your day-to-day.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {perks.map((perk, i) => (
                <div
                  key={perk.label}
                  className={`flex flex-col items-center text-center p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${200 + i * 80}ms` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-3">
                    <perk.icon size={22} className="text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-300">{perk.label}</span>
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
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function CareersPage() {
  useEffect(() => {
    document.title = 'Careers | Balji'
  }, [])

  return (
    <>
      <PublicHero
        pill="We're Hiring"
        pillIcon={Users}
        title="Build the Future of"
        titleHighlight="FinTech Communications"
        subtitle="Join a passionate, remote-first team solving real problems for brokers and ISOs worldwide. We're growing fast and looking for exceptional people."
      />
      <BenefitsSection />
      <OpenPositionsSection />
      <PerksSection />
      <PublicCta
        title="Don't See Your Role?"
        subtitle="We're always looking for exceptional talent. Send us your resume and tell us how you'd make an impact at Balji."
      />
    </>
  )
}
