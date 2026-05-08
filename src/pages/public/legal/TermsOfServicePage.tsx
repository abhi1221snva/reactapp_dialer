import { useEffect } from 'react'
import {
  FileText, CheckCircle2, UserCog, CreditCard, ShieldAlert,
  Copyright, AlertTriangle, XCircle, Scale,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'

const LAST_UPDATED = 'April 28, 2026'

const sections = [
  {
    id: 'acceptance',
    icon: CheckCircle2,
    title: '1. Acceptance of Terms',
    paragraphs: [
      'By accessing or using the Balji platform and services ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you are using the Services on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and "you" refers to both you individually and the organization.',
      'If you do not agree to these Terms, you may not access or use the Services. We reserve the right to update these Terms at any time. Continued use of the Services after changes constitutes acceptance of the modified Terms. We will provide reasonable notice of material changes via email or through the platform.',
    ],
  },
  {
    id: 'account-terms',
    icon: UserCog,
    title: '2. Account Terms',
    paragraphs: [
      'You must be at least 18 years old and a human to create an account. Accounts registered by automated methods ("bots") are not permitted. You must provide accurate, complete, and current information during registration and keep your account information up to date.',
      'You are responsible for maintaining the security of your account and password. Balji will not be liable for any loss or damage arising from your failure to maintain the security of your account credentials. You must notify us immediately of any unauthorized access to or use of your account.',
      'One person or legal entity may maintain no more than one free account. You may not use the Services for any illegal or unauthorized purpose. Your use of the Services must comply with all applicable laws and regulations, including telecommunications regulations, financial services regulations, and data protection laws applicable to your jurisdiction.',
    ],
  },
  {
    id: 'payment-terms',
    icon: CreditCard,
    title: '3. Payment Terms',
    paragraphs: [
      'Paid plans are billed in advance on a monthly or annual basis and are non-refundable except as required by law. Usage-based charges (including telephony minutes, SMS messages, and AI processing credits) are billed in arrears based on actual usage during the billing period.',
      'All fees are exclusive of applicable taxes. You are responsible for paying all taxes associated with your use of the Services, except for taxes based on Balji\'s net income. If we are required to collect or pay taxes on your behalf, such taxes will be added to your invoice.',
      'We reserve the right to change our pricing with 30 days\' notice for monthly plans and at the end of the current term for annual plans. If you do not agree to the price change, you may cancel your subscription before the new pricing takes effect. Downgrading your plan may result in the loss of features, capacity, or data. Balji is not liable for any such losses.',
    ],
  },
  {
    id: 'acceptable-use',
    icon: ShieldAlert,
    title: '4. Acceptable Use Policy',
    paragraphs: [
      'You agree not to use the Services to: (a) transmit spam, unsolicited messages, or bulk communications in violation of applicable laws including the TCPA, CAN-SPAM Act, or equivalent regulations; (b) engage in fraudulent, deceptive, or misleading business practices; (c) harass, threaten, or intimidate any person; (d) violate any applicable law, regulation, or third-party right.',
      'You must not: (a) attempt to gain unauthorized access to the Services, other accounts, or computer systems or networks; (b) interfere with or disrupt the integrity or performance of the Services; (c) reverse engineer, decompile, or disassemble any portion of the Services; (d) use the Services to develop a competing product or service.',
      'Balji reserves the right to investigate and take appropriate action against any violation of this section, including without limitation, suspending or terminating your account, reporting the activity to law enforcement authorities, and pursuing civil remedies.',
    ],
  },
  {
    id: 'intellectual-property',
    icon: Copyright,
    title: '5. Intellectual Property',
    paragraphs: [
      'The Services and all associated intellectual property rights are and shall remain the exclusive property of Balji, Inc. and its licensors. These Terms do not convey to you any rights of ownership in the Services or any intellectual property rights. The Balji name, logo, and all related product and service names, design marks, and slogans are trademarks of Balji, Inc.',
      'You retain all rights to the data and content you submit to the Services ("Customer Data"). By using the Services, you grant Balji a limited, non-exclusive license to use, process, and display your Customer Data solely as necessary to provide the Services. We will not access, use, or disclose your Customer Data except as necessary to provide the Services or as required by law.',
      'Any feedback, suggestions, or ideas you provide regarding the Services ("Feedback") may be used by Balji without restriction or obligation to you. You hereby assign to Balji all rights in any Feedback you provide.',
    ],
  },
  {
    id: 'limitation-of-liability',
    icon: AlertTriangle,
    title: '6. Limitation of Liability',
    paragraphs: [
      'TO THE MAXIMUM EXTENT PERMITTED BY LAW, BALJI SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICES, REGARDLESS OF THE THEORY OF LIABILITY.',
      'BALJI\'S TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS PAID BY YOU TO BALJI DURING THE TWELVE (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY, OR (B) ONE HUNDRED DOLLARS ($100).',
      'THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. BALJI DOES NOT WARRANT THAT THE SERVICES WILL BE UNINTERRUPTED, ERROR-FREE, OR COMPLETELY SECURE.',
    ],
  },
  {
    id: 'termination',
    icon: XCircle,
    title: '7. Termination',
    paragraphs: [
      'You may cancel your account at any time from your account settings. Upon cancellation, your right to use the Services will cease immediately. We will retain your data for 30 days following cancellation to allow for data export, after which it will be permanently deleted.',
      'Balji may suspend or terminate your access to the Services at any time, with or without cause, with or without notice. Grounds for termination include, but are not limited to: violation of these Terms, non-payment of fees, fraudulent or illegal activity, or conduct that we determine is harmful to other users, third parties, or the business interests of Balji.',
      'Upon termination, all provisions of these Terms that by their nature should survive termination shall survive, including without limitation, intellectual property provisions, warranty disclaimers, indemnification, and limitations of liability.',
    ],
  },
  {
    id: 'governing-law',
    icon: Scale,
    title: '8. Governing Law and Dispute Resolution',
    paragraphs: [
      'These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action or proceeding arising out of or relating to these Terms shall be brought exclusively in the federal or state courts located in Wilmington, Delaware.',
      'Before initiating any legal proceedings, you agree to first attempt to resolve any dispute informally by contacting us at legal@balji.app. If the dispute is not resolved within 30 days of the initial notice, either party may proceed with formal dispute resolution.',
      'Any arbitration will be conducted under the rules of the American Arbitration Association. The arbitration will be conducted in English, and the arbitrator\'s decision will be final and binding. Judgment upon the award rendered by the arbitrator may be entered in any court having jurisdiction.',
    ],
  },
]

function Section({ section, index }: { section: typeof sections[number]; index: number }) {
  const { ref, visible } = useInView()
  const Icon = section.icon

  return (
    <div
      ref={ref}
      id={section.id}
      className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-4 mb-5">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Icon size={20} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 pt-1">{section.title}</h2>
      </div>

      <div className="ml-14 space-y-4">
        {section.paragraphs.map((text, i) => (
          <p key={i} className="text-gray-600 leading-relaxed">{text}</p>
        ))}
      </div>
    </div>
  )
}

export function TermsOfServicePage() {
  useEffect(() => {
    document.title = 'Terms of Service | Balji'
  }, [])

  const { ref: introRef, visible: introVisible } = useInView()

  return (
    <div className="min-h-screen bg-[#fafbff]">
      <PublicHero
        pill="Legal Agreement"
        pillIcon={FileText}
        title="Terms of"
        titleHighlight="Service"
        subtitle="Please read these terms carefully before using the Balji platform. By accessing or using our services, you agree to be bound by these terms."
      />

      {/* Introduction Card */}
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
              <p className="text-sm text-gray-500">
                <span className="font-medium text-gray-700">Effective date:</span> {LAST_UPDATED}
              </p>
            </div>

            <p className="text-gray-600 leading-relaxed mb-6">
              These Terms of Service ("Terms") constitute a legally binding agreement between you and Balji, Inc. ("Balji,"
              "we," "us," or "our") governing your access to and use of the Balji cloud communications platform, including
              all related APIs, tools, integrations, and support services (collectively, the "Services").
            </p>

            <div>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wider mb-3">Table of Contents</h3>
              <nav className="grid sm:grid-cols-2 gap-2">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </section>

      {/* Terms Sections */}
      <section className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {sections.map((section, index) => (
            <Section key={section.id} section={section} index={index} />
          ))}
        </div>
      </section>

      {/* Footer Note */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                legal@balji.app
              </a>.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              Balji, Inc. is registered in the State of Delaware, United States. These Terms were last revised on{' '}
              {LAST_UPDATED}.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
