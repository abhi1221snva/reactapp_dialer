import { useEffect } from 'react'
import {
  Users, Check, DollarSign, GraduationCap, Megaphone,
  HeadphonesIcon, Crown, Award, Shield, Star,
  ArrowRight, User, Building2, Mail, Phone, Globe,
  ChevronRight, Sparkles,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const tiers = [
  {
    name: 'Silver',
    icon: Shield,
    gradient: 'from-gray-400 to-gray-500',
    borderColor: 'border-gray-200',
    ringColor: 'ring-gray-100',
    headerBg: 'bg-gray-50',
    price: 'Free',
    priceNote: 'No upfront cost',
    features: [
      'Up to 10 referred clients',
      '10% revenue share on referrals',
      'Partner portal access',
      'Co-branded landing page',
      'Quarterly partner newsletter',
      'Community Slack channel access',
    ],
    excluded: [
      'Dedicated partner manager',
      'Custom API integrations',
      'Joint marketing campaigns',
      'Early access to new features',
    ],
    cta: 'Apply as Silver Partner',
    ctaStyle: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  {
    name: 'Gold',
    icon: Award,
    gradient: 'from-amber-400 to-amber-600',
    borderColor: 'border-amber-200',
    ringColor: 'ring-amber-100',
    headerBg: 'bg-amber-50',
    price: 'Qualified',
    priceNote: '25+ referred clients',
    popular: true,
    features: [
      'Up to 100 referred clients',
      '15% revenue share on referrals',
      'Partner portal access',
      'Co-branded landing page',
      'Dedicated partner manager',
      'Priority support queue',
      'Custom API integrations',
      'Monthly strategy calls',
      'Partner certification program',
    ],
    excluded: [
      'Joint marketing campaigns',
      'Early access to new features',
    ],
    cta: 'Apply as Gold Partner',
    ctaStyle: 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/20',
  },
  {
    name: 'Platinum',
    icon: Crown,
    gradient: 'from-indigo-500 to-violet-600',
    borderColor: 'border-indigo-200',
    ringColor: 'ring-indigo-100',
    headerBg: 'bg-indigo-50',
    price: 'Invite Only',
    priceNote: '100+ referred clients',
    features: [
      'Unlimited referred clients',
      '20% revenue share on referrals',
      'Partner portal access',
      'Co-branded landing page',
      'Dedicated partner manager',
      'Priority support queue',
      'Custom API integrations',
      'Weekly strategy calls',
      'Partner certification program',
      'Joint marketing campaigns',
      'Early access to new features',
      'Executive sponsor & QBR',
      'Custom SLA agreements',
    ],
    excluded: [],
    cta: 'Request Invitation',
    ctaStyle: 'bg-gray-900 text-white hover:bg-gray-800 shadow-lg shadow-gray-900/10',
  },
]

const partnerBenefits = [
  {
    icon: DollarSign,
    title: 'Revenue Share',
    description: 'Earn recurring commissions on every client you refer. The more you grow, the higher your share -- up to 20% for Platinum partners.',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
    ringColor: 'ring-emerald-100',
  },
  {
    icon: GraduationCap,
    title: 'Training & Certification',
    description: 'Get certified as a Balji expert with our comprehensive training program. Boost your credibility and close deals with confidence.',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
    ringColor: 'ring-blue-100',
  },
  {
    icon: Megaphone,
    title: 'Co-Marketing',
    description: 'Co-create case studies, webinars, and content with our marketing team. Get featured on our website, social channels, and newsletters.',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    ringColor: 'ring-violet-100',
  },
  {
    icon: HeadphonesIcon,
    title: 'Dedicated Support',
    description: 'Gold and Platinum partners get a dedicated partner manager, priority support queue, and direct engineering escalation paths.',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    ringColor: 'ring-amber-100',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Sections
   ═══════════════════════════════════════════════════════════════════════════ */

function TiersSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Star size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner Tiers</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Choose Your{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Partnership Level</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            Three tiers designed to match your business scale and growth ambitions.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`relative flex flex-col bg-white border ${tier.borderColor} shadow-sm rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500 ${
                tier.popular ? 'ring-2 ring-amber-400 lg:-translate-y-2' : ''
              } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {tier.popular && (
                <div className="absolute -top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-bold bg-amber-500 text-white shadow-lg">
                    <Sparkles size={12} />
                    Most Popular
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`${tier.headerBg} p-6 text-center border-b ${tier.borderColor}`}>
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.gradient} mb-4 shadow-lg`}>
                  <tier.icon size={26} className="text-white" />
                </div>
                <h3 className="text-2xl font-extrabold text-gray-900 mb-1">{tier.name}</h3>
                <div className="text-sm font-semibold text-gray-500">{tier.price}</div>
                <div className="text-xs text-gray-400 mt-0.5">{tier.priceNote}</div>
              </div>

              {/* Features */}
              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                  {tier.excluded.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 opacity-40">
                      <Check size={16} className="text-gray-300 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-400 line-through">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-6 pt-0">
                <a
                  href="#partner-form"
                  className={`block w-full text-center px-6 py-3.5 text-sm font-semibold rounded-xl transition-all duration-300 hover:-translate-y-px ${tier.ctaStyle}`}
                >
                  {tier.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BenefitsSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Sparkles size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Partner Benefits</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            What You{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Get</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">
            We invest in our partners' success with tools, training, and revenue-sharing that grows with you.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {partnerBenefits.map((benefit, i) => (
            <div
              key={benefit.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${benefit.iconBg} ring-1 ${benefit.ringColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <benefit.icon size={22} className={benefit.iconColor} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{benefit.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ApplicationFormSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} id="partner-form" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left - Info */}
          <div className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Users size={14} className="text-indigo-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Become a Partner</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-6">
              Ready to{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">
                Grow Together?
              </span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-10">
              Fill out the application form and our partnerships team will review your submission within 2 business days. We'll schedule a discovery call to understand your business and find the best fit.
            </p>

            <div className="space-y-6">
              {[
                { icon: ChevronRight, text: 'Applications reviewed within 2 business days' },
                { icon: ChevronRight, text: 'No commitment required -- start with Silver tier' },
                { icon: ChevronRight, text: 'Dedicated onboarding and partner training included' },
                { icon: ChevronRight, text: 'Earn commissions from day one after approval' },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                    <Check size={14} className="text-emerald-600" />
                  </div>
                  <span className="text-gray-600 text-[15px] leading-relaxed">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Form */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Partner Application</h3>

              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="John"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Smith"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Company Name</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Acme Finance Consulting"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Work Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      placeholder="john@acmefinance.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Website</label>
                    <div className="relative">
                      <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        placeholder="https://acmefinance.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Tier</label>
                  <select className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all appearance-none">
                    <option value="">Select a tier...</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tell Us About Your Business</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your business, target audience, and how you plan to refer clients to Balji..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="group w-full inline-flex items-center justify-center gap-2.5 px-8 py-4 text-base font-semibold text-white rounded-xl bg-gray-900 hover:bg-gray-800 shadow-lg shadow-gray-900/10 transition-all duration-300 hover:-translate-y-px"
                >
                  Submit Application
                  <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </button>

                <p className="text-xs text-gray-400 text-center mt-3">
                  By submitting, you agree to our Partner Terms of Service and Privacy Policy.
                </p>
              </form>
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

export function PartnersPage() {
  useEffect(() => {
    document.title = 'Partners | Balji'
  }, [])

  return (
    <>
      <PublicHero
        pill="Partner Program"
        pillIcon={Users}
        title="Grow Your Business with"
        titleHighlight="Balji"
        subtitle="Join our partner ecosystem and earn recurring revenue by connecting finance teams with the industry's most powerful CPaaS platform."
      />
      <TiersSection />
      <BenefitsSection />
      <ApplicationFormSection />
      <PublicCta
        title="Questions About Partnering?"
        subtitle="Our partnerships team is ready to discuss how we can work together. Schedule a call or email us at partners@balji.app."
      />
    </>
  )
}
