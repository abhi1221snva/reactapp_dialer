import { useEffect } from 'react'
import {
  ShieldCheck, FileSearch, Scale, UserCheck, Eye, Trash2,
  Download, PauseCircle, Ban, Send, AlertCircle, Building2,
  Globe, Server,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'

const LAST_UPDATED = 'April 28, 2026'

const rights = [
  {
    icon: Eye,
    title: 'Right to Access',
    article: 'Article 15',
    description:
      'You can request a copy of all personal data we hold about you. We will provide this in a structured, commonly used, and machine-readable format within 30 days of your request.',
  },
  {
    icon: FileSearch,
    title: 'Right to Rectification',
    article: 'Article 16',
    description:
      'If any personal data we hold about you is inaccurate or incomplete, you have the right to have it corrected. You can update most information directly in your account settings.',
  },
  {
    icon: Trash2,
    title: 'Right to Erasure',
    article: 'Article 17',
    description:
      'Also known as the "right to be forgotten," you can request the deletion of your personal data when it is no longer necessary for the purpose it was collected, subject to legal retention requirements.',
  },
  {
    icon: PauseCircle,
    title: 'Right to Restrict Processing',
    article: 'Article 18',
    description:
      'You can request that we limit how we use your data in certain circumstances, such as when you contest the accuracy of the data or have objected to our processing.',
  },
  {
    icon: Download,
    title: 'Right to Data Portability',
    article: 'Article 20',
    description:
      'You have the right to receive your personal data in a structured, commonly used format and to transmit that data to another controller. We support data export in JSON and CSV formats.',
  },
  {
    icon: Ban,
    title: 'Right to Object',
    article: 'Article 21',
    description:
      'You can object to the processing of your personal data for direct marketing purposes at any time. You may also object to processing based on legitimate interests, and we will cease processing unless we have compelling grounds.',
  },
  {
    icon: AlertCircle,
    title: 'Right to Withdraw Consent',
    article: 'Article 7(3)',
    description:
      'Where processing is based on consent, you can withdraw that consent at any time. Withdrawal does not affect the lawfulness of processing carried out prior to the withdrawal.',
  },
  {
    icon: Send,
    title: 'Right to Lodge a Complaint',
    article: 'Article 77',
    description:
      'If you believe your data protection rights have been violated, you have the right to lodge a complaint with your local supervisory authority. We encourage you to contact us first so we can address your concern.',
  },
]

const legalBases = [
  {
    basis: 'Contract Performance',
    article: 'Art. 6(1)(b)',
    description:
      'Processing necessary to provide the Balji platform and services you have signed up for, including account management, communication processing, and billing.',
  },
  {
    basis: 'Legitimate Interest',
    article: 'Art. 6(1)(f)',
    description:
      'Processing for product improvement, fraud prevention, security, and aggregated analytics where our interests do not override your fundamental rights.',
  },
  {
    basis: 'Consent',
    article: 'Art. 6(1)(a)',
    description:
      'Processing for marketing communications, non-essential cookies, and optional product features that require your explicit opt-in consent.',
  },
  {
    basis: 'Legal Obligation',
    article: 'Art. 6(1)(c)',
    description:
      'Processing required to comply with applicable laws, regulations, and legal processes, including telecommunications regulations and tax obligations.',
  },
]

function RightsCard({ right, index }: { right: typeof rights[number]; index: number }) {
  const { ref, visible } = useInView()
  const Icon = right.icon

  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-6 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 75}ms` }}
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Icon size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-gray-900">{right.title}</h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              {right.article}
            </span>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{right.description}</p>
        </div>
      </div>
    </div>
  )
}

export function GdprPage() {
  useEffect(() => {
    document.title = 'GDPR Compliance | Balji'
  }, [])

  const { ref: introRef, visible: introVisible } = useInView()
  const { ref: commitmentRef, visible: commitmentVisible } = useInView()
  const { ref: processingRef, visible: processingVisible } = useInView()
  const { ref: basesRef, visible: basesVisible } = useInView()
  const { ref: dpoRef, visible: dpoVisible } = useInView()
  const { ref: transfersRef, visible: transfersVisible } = useInView()

  return (
    <div className="min-h-screen bg-[#fafbff]">
      <PublicHero
        pill="Data Protection"
        pillIcon={ShieldCheck}
        title="GDPR"
        titleHighlight="Compliance"
        subtitle="Balji is fully committed to the General Data Protection Regulation. We process your data lawfully, fairly, and transparently."
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
              This page describes how Balji, Inc. complies with the General Data Protection Regulation (EU) 2016/679
              ("GDPR") and the UK General Data Protection Regulation. It applies to all individuals in the European
              Economic Area (EEA) and United Kingdom whose personal data we process. For our general data handling
              practices, please see our{' '}
              <a href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline">
                Privacy Policy
              </a>.
            </p>
          </div>
        </div>
      </section>

      {/* Our Commitment */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={commitmentRef}
            className={`transition-all duration-700 ${commitmentVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <ShieldCheck size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Our Commitment to GDPR</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Balji has implemented comprehensive measures to ensure compliance with the GDPR across all aspects of our
                platform and operations. We act as both a data controller (for data we collect about our users) and a data
                processor (for customer communication data processed through our platform).
              </p>
              <p className="text-gray-600 leading-relaxed">
                Our commitment includes: maintaining a detailed record of processing activities (Article 30), conducting
                Data Protection Impact Assessments for high-risk processing (Article 35), implementing data protection by
                design and by default (Article 25), maintaining appropriate technical and organizational security measures
                (Article 32), and ensuring all sub-processors meet equivalent data protection standards.
              </p>
              <p className="text-gray-600 leading-relaxed">
                We provide Data Processing Agreements (DPAs) to all customers who require them. Our standard DPA includes
                Standard Contractual Clauses (SCCs) approved by the European Commission for cross-border data transfers.
                You can request a DPA by contacting{' '}
                <a href="mailto:dpo@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                  dpo@balji.app
                </a>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Processing */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={processingRef}
            className={`transition-all duration-700 ${processingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Server size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Data Processing</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                When you use the Balji platform, we process personal data in several capacities. Understanding our role
                in each context is important for determining how data protection obligations are allocated.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
                  <h4 className="font-semibold text-gray-900 mb-2">As Data Controller</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    We are the controller for account information, billing data, website analytics, and marketing
                    communications. We determine the purposes and means of processing this data.
                  </p>
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
                  <h4 className="font-semibold text-gray-900 mb-2">As Data Processor</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    For customer communication data (call recordings, messages, voicemails), we act as a processor on
                    behalf of our customers, who are the controllers. We process this data only per customer instructions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legal Bases */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={basesRef}
            className={`transition-all duration-700 ${basesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Scale size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Legal Bases for Processing</h2>
            </div>
            <div className="ml-14">
              <p className="text-gray-600 leading-relaxed mb-6">
                Under the GDPR, we must have a valid legal basis for each processing activity. The table below outlines
                the legal bases we rely on for different types of processing.
              </p>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <div className="hidden sm:grid sm:grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Legal Basis</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GDPR Article</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</span>
                </div>
                {legalBases.map((item, i) => (
                  <div
                    key={item.basis}
                    className={`px-6 py-5 ${i < legalBases.length - 1 ? 'border-b border-gray-50' : ''}`}
                  >
                    <div className="sm:grid sm:grid-cols-3 gap-4 space-y-2 sm:space-y-0">
                      <div>
                        <span className="sm:hidden text-xs font-medium text-gray-400 uppercase block mb-1">
                          Legal Basis
                        </span>
                        <p className="font-semibold text-gray-900">{item.basis}</p>
                      </div>
                      <div>
                        <span className="sm:hidden text-xs font-medium text-gray-400 uppercase block mb-1">
                          GDPR Article
                        </span>
                        <code className="text-sm font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {item.article}
                        </code>
                      </div>
                      <div>
                        <span className="sm:hidden text-xs font-medium text-gray-400 uppercase block mb-1">
                          Description
                        </span>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Your Rights Under GDPR */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <UserCheck size={14} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">Your Rights</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Your Rights Under the GDPR
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              The GDPR provides you with specific rights regarding your personal data. We make it easy to exercise these
              rights through your account settings or by contacting our Data Protection Officer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {rights.map((right, index) => (
              <RightsCard key={right.title} right={right} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Data Protection Officer */}
      <section className="py-12 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={dpoRef}
            className={`transition-all duration-700 ${dpoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Building2 size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Data Protection Officer</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Balji has appointed a Data Protection Officer (DPO) to oversee our data protection strategy and
                implementation, ensure compliance with the GDPR, and serve as the primary point of contact for data
                subjects and supervisory authorities.
              </p>

              <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Contact</span>
                    <p className="text-gray-900">Data Protection Officer</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email</span>
                    <p>
                      <a href="mailto:dpo@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                        dpo@balji.app
                      </a>
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Response Time</span>
                    <p className="text-gray-900">We respond to all data protection requests within 30 days</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">EU Representative</span>
                    <p className="text-gray-600 text-sm">
                      In accordance with Article 27 of the GDPR, our EU representative can be contacted at{' '}
                      <a href="mailto:eu-rep@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                        eu-rep@balji.app
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Border Transfers */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={transfersRef}
            className={`transition-all duration-700 ${transfersVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Globe size={20} className="text-indigo-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 pt-1">Cross-Border Data Transfers</h2>
            </div>
            <div className="ml-14 space-y-4">
              <p className="text-gray-600 leading-relaxed">
                Balji is headquartered in the United States and processes data in multiple jurisdictions. When we transfer
                personal data from the EEA or UK to countries that have not been deemed to provide an adequate level of
                data protection, we rely on the following safeguards:
              </p>
              <ul className="space-y-3">
                {[
                  {
                    title: 'Standard Contractual Clauses (SCCs)',
                    text: 'We use the European Commission-approved SCCs (June 2021 version) as the primary transfer mechanism for data transfers to the United States and other third countries.',
                  },
                  {
                    title: 'EU-US Data Privacy Framework',
                    text: 'Balji is certified under the EU-US Data Privacy Framework, providing an additional legal basis for transfers of personal data from the EU to the US.',
                  },
                  {
                    title: 'Supplementary Measures',
                    text: 'We implement technical supplementary measures including end-to-end encryption, pseudonymization, and access controls to ensure an essentially equivalent level of protection for transferred data.',
                  },
                  {
                    title: 'Transfer Impact Assessments',
                    text: 'We conduct transfer impact assessments for each data transfer mechanism to evaluate the laws and practices of the destination country and the effectiveness of our safeguards.',
                  },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2.5" />
                    <div>
                      <span className="font-semibold text-gray-800">{item.title}:</span>{' '}
                      <span className="text-gray-600">{item.text}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <section className="pb-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500 leading-relaxed">
              This GDPR compliance page is updated regularly to reflect changes in our practices and the evolving
              regulatory landscape. For the most current information or to exercise any of your rights, please contact our
              Data Protection Officer at{' '}
              <a href="mailto:dpo@balji.app" className="text-indigo-600 hover:text-indigo-800 underline">
                dpo@balji.app
              </a>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
