import { useEffect } from 'react'
import { Cookie, Settings, BarChart3, Megaphone, Globe, Info } from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'

const LAST_UPDATED = 'April 28, 2026'

const cookieTypes = [
  {
    category: 'Essential',
    icon: Settings,
    required: true,
    color: 'emerald',
    description:
      'These cookies are strictly necessary for the operation of the Balji platform. They enable core functionality such as authentication, session management, security features, and load balancing. Without these cookies, the Services cannot function properly.',
    cookies: [
      {
        name: 'balji_session',
        purpose: 'Maintains your authenticated session across page requests',
        duration: 'Session',
      },
      {
        name: 'balji_csrf',
        purpose: 'Protects against cross-site request forgery attacks',
        duration: 'Session',
      },
      {
        name: 'balji_device_id',
        purpose: 'Identifies your device for security and fraud prevention',
        duration: '1 year',
      },
      {
        name: 'balji_preferences',
        purpose: 'Stores your interface preferences (language, timezone, theme)',
        duration: '1 year',
      },
    ],
  },
  {
    category: 'Analytics',
    icon: BarChart3,
    required: false,
    color: 'blue',
    description:
      'Analytics cookies help us understand how visitors interact with the Balji website and platform. They collect information about page visits, session duration, navigation paths, and feature usage. This data is aggregated and anonymized to help us improve our services.',
    cookies: [
      {
        name: '_balji_analytics',
        purpose: 'Tracks page views and user interactions for product analytics',
        duration: '1 year',
      },
      {
        name: '_balji_ab',
        purpose: 'Assigns you to A/B test groups for feature experiments',
        duration: '90 days',
      },
      {
        name: '_ga / _gid',
        purpose: 'Google Analytics cookies for aggregated website traffic analysis',
        duration: '2 years / 24 hours',
      },
    ],
  },
  {
    category: 'Marketing',
    icon: Megaphone,
    required: false,
    color: 'purple',
    description:
      'Marketing cookies are used to track visitors across websites and display relevant advertisements. They help us measure the effectiveness of our marketing campaigns and limit the number of times you see a particular ad.',
    cookies: [
      {
        name: '_fbp',
        purpose: 'Facebook pixel for measuring ad campaign effectiveness',
        duration: '90 days',
      },
      {
        name: '_gcl_au',
        purpose: 'Google Ads conversion tracking',
        duration: '90 days',
      },
      {
        name: 'li_sugr',
        purpose: 'LinkedIn Insights for B2B campaign measurement',
        duration: '90 days',
      },
    ],
  },
]

const colorMap: Record<string, { bg: string; text: string; badge: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
}

function CookieTypeCard({ type, index }: { type: typeof cookieTypes[number]; index: number }) {
  const { ref, visible } = useInView()
  const Icon = type.icon
  const colors = colorMap[type.color]

  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Icon size={24} className={colors.text} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-gray-900">{type.category} Cookies</h3>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  type.required ? 'bg-gray-100 text-gray-700' : colors.badge
                }`}
              >
                {type.required ? 'Always Active' : 'Optional'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 leading-relaxed mb-6">{type.description}</p>

        {/* Cookie table */}
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-3 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Cookie Name</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</span>
          </div>
          {type.cookies.map((cookie, i) => (
            <div
              key={cookie.name}
              className={`px-5 py-4 ${i < type.cookies.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="sm:grid sm:grid-cols-3 gap-4 space-y-2 sm:space-y-0">
                <div>
                  <span className="sm:hidden text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                    Cookie Name
                  </span>
                  <code className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {cookie.name}
                  </code>
                </div>
                <div>
                  <span className="sm:hidden text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                    Purpose
                  </span>
                  <p className="text-sm text-gray-600">{cookie.purpose}</p>
                </div>
                <div>
                  <span className="sm:hidden text-xs font-medium text-gray-400 uppercase tracking-wider block mb-1">
                    Duration
                  </span>
                  <p className="text-sm text-gray-500">{cookie.duration}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CookiePolicyPage() {
  useEffect(() => {
    document.title = 'Cookie Policy | Balji'
  }, [])

  const { ref: introRef, visible: introVisible } = useInView()
  const { ref: whatRef, visible: whatVisible } = useInView()
  const { ref: manageRef, visible: manageVisible } = useInView()
  const { ref: thirdPartyRef, visible: thirdPartyVisible } = useInView()

  return (
    <div className="min-h-screen bg-[#fafbff]">
      <PublicHero
        pill="Transparency First"
        pillIcon={Cookie}
        title="Cookie"
        titleHighlight="Policy"
        subtitle="We use cookies to make Balji work, understand how it's used, and to improve your experience. Here's everything you need to know."
      />

      {/* Introduction */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={introRef}
            className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-8 transition-all duration-700 ${introVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Last updated:</span> {LAST_UPDATED}
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              This Cookie Policy explains how Balji, Inc. ("Balji," "we," "us," or "our") uses cookies and similar
              tracking technologies when you visit our website at balji.app and use our cloud communications platform.
              This policy should be read alongside our{' '}
              <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
                Privacy Policy
              </a>
              , which explains how we process personal data.
            </p>
          </div>
        </div>
      </section>

      {/* What Are Cookies */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={whatRef}
            className={`transition-all duration-700 ${whatVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Info size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">What Are Cookies?</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Cookies are small text files that are placed on your computer or mobile device when you visit a website.
                They are widely used to make websites work more efficiently and to provide information to the site owners.
                Cookies can be "first-party" (set by us) or "third-party" (set by other services we use).
              </p>
              <p className="text-gray-600 leading-relaxed">
                In addition to cookies, we may use similar technologies such as web beacons (also called pixel tags or
                clear GIFs), local storage, and session storage to collect and store information. For simplicity, we refer
                to all of these technologies collectively as "cookies" in this policy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Types */}
      <section className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Types of Cookies We Use</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              We categorize the cookies we use into three types based on their purpose.
            </p>
          </div>

          <div className="space-y-8">
            {cookieTypes.map((type, index) => (
              <CookieTypeCard key={type.category} type={type} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Managing Cookies */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={manageRef}
            className={`transition-all duration-700 ${manageVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Settings size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Managing Your Cookie Preferences</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                You have several options for managing cookies. Essential cookies cannot be disabled as they are required
                for the platform to function, but you can control analytics and marketing cookies.
              </p>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Cookie Consent Banner</h4>
                  <p className="text-sm text-gray-600">
                    When you first visit our website, you will see a cookie consent banner that allows you to accept or
                    decline non-essential cookies. You can update your preferences at any time by clicking the cookie icon
                    in the bottom-left corner of any page.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Browser Settings</h4>
                  <p className="text-sm text-gray-600">
                    Most web browsers allow you to control cookies through their settings. You can set your browser to
                    block or alert you about cookies, or to delete cookies that have already been set. Note that blocking
                    all cookies may affect your ability to use certain features of the platform.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">Opt-Out Links</h4>
                  <p className="text-sm text-gray-600">
                    You can opt out of specific third-party analytics and advertising cookies by visiting their respective
                    opt-out pages: Google Analytics (
                    <a
                      href="https://tools.google.com/dlpage/gaoptout"
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      opt-out browser add-on
                    </a>
                    ), Facebook (
                    <a
                      href="https://www.facebook.com/settings/?tab=ads"
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ad preferences
                    </a>
                    ), or the{' '}
                    <a
                      href="https://optout.aboutads.info/"
                      className="text-indigo-600 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Digital Advertising Alliance
                    </a>{' '}
                    opt-out tool.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Third-Party Cookies */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={thirdPartyRef}
            className={`transition-all duration-700 ${thirdPartyVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Globe size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Third-Party Cookies</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Some cookies on our website are placed by third-party services that appear on our pages. We do not control
                these third-party cookies and recommend that you check the relevant third party's website for more
                information about their cookies and how to manage them.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Third-party services we use that may place cookies include: Google Analytics (website traffic analysis),
                Stripe (payment processing), Intercom (customer support chat), HubSpot (CRM and marketing automation),
                and various social media platforms for sharing functionality.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We regularly review our use of third-party cookies to ensure they are necessary and proportionate. If you
                have questions about specific third-party cookies, please contact us at{' '}
                <a href="mailto:privacy@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                  privacy@balji.app
                </a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500 leading-relaxed">
              This Cookie Policy may be updated periodically to reflect changes in our use of cookies or for other
              operational, legal, or regulatory reasons. We will notify you of material changes by posting the updated
              policy on this page with a revised "Last updated" date. We encourage you to review this policy regularly.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
