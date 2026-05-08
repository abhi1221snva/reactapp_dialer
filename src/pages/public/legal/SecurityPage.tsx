import { useEffect } from 'react'
import {
  Shield, Lock, Server, Eye, Activity, KeyRound, Network, MonitorCheck,
  ShieldCheck, FileCheck, Globe, Heart, CheckCircle2, Clock, Users,
  Fingerprint, HardDrive, AlertTriangle, Bug,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

const LAST_UPDATED = 'April 28, 2026'

const certifications = [
  {
    icon: ShieldCheck,
    name: 'SOC 2 Type II',
    status: 'Certified',
    description:
      'Independently audited controls for security, availability, processing integrity, confidentiality, and privacy. Our SOC 2 Type II report covers all Balji platform services.',
    color: 'indigo',
  },
  {
    icon: FileCheck,
    name: 'ISO 27001',
    status: 'Certified',
    description:
      'International standard for information security management systems (ISMS). Our certification covers the design, development, and operation of the Balji cloud platform.',
    color: 'blue',
  },
  {
    icon: Globe,
    name: 'GDPR Compliant',
    status: 'Compliant',
    description:
      'Full compliance with the EU General Data Protection Regulation, including Data Processing Agreements, Standard Contractual Clauses, and EU-US Data Privacy Framework certification.',
    color: 'emerald',
  },
  {
    icon: Heart,
    name: 'HIPAA',
    status: 'BAA Available',
    description:
      'Business Associate Agreements available for healthcare customers. Technical safeguards meet HIPAA Security Rule requirements for protecting electronic protected health information.',
    color: 'rose',
  },
]

const infrastructure = [
  {
    icon: Lock,
    title: 'Encryption',
    items: [
      'AES-256 encryption at rest for all stored data',
      'TLS 1.3 for all data in transit',
      'End-to-end encryption for call recordings',
      'Customer-managed encryption keys (CMEK) available',
      'Hardware Security Modules (HSMs) for key management',
    ],
  },
  {
    icon: Network,
    title: 'Network Security',
    items: [
      'Virtual private cloud (VPC) with network segmentation',
      'Web Application Firewall (WAF) with custom rulesets',
      'DDoS protection via multi-layer mitigation',
      'Intrusion detection and prevention systems (IDS/IPS)',
      'Private network peering for enterprise customers',
    ],
  },
  {
    icon: KeyRound,
    title: 'Access Controls',
    items: [
      'Role-based access control (RBAC) with least privilege',
      'Multi-factor authentication (MFA) enforced for all staff',
      'SSO integration via SAML 2.0 and OIDC',
      'Just-in-time access provisioning for production',
      'Quarterly access reviews and re-certification',
    ],
  },
  {
    icon: MonitorCheck,
    title: 'Monitoring & Response',
    items: [
      '24/7 Security Operations Center (SOC) monitoring',
      'SIEM with real-time threat detection and alerting',
      'Automated incident response playbooks',
      'Mean time to detect (MTTD) under 15 minutes',
      'Structured incident response with customer notification',
    ],
  },
]

const timeline = [
  {
    icon: Lock,
    year: '2023',
    title: 'Security Foundation',
    description: 'Established core security infrastructure, implemented encryption standards, and deployed initial monitoring.',
  },
  {
    icon: ShieldCheck,
    year: '2024',
    title: 'SOC 2 Type II Certification',
    description: 'Achieved SOC 2 Type II certification after comprehensive audit of security controls and processes.',
  },
  {
    icon: FileCheck,
    year: '2024',
    title: 'ISO 27001 Certification',
    description: 'Obtained ISO 27001 certification, establishing a formal information security management system.',
  },
  {
    icon: Globe,
    year: '2025',
    title: 'GDPR & International Compliance',
    description: 'Completed GDPR compliance program, EU-US Data Privacy Framework certification, and appointed EU representative.',
  },
  {
    icon: Heart,
    year: '2025',
    title: 'HIPAA Readiness',
    description: 'Implemented HIPAA-compliant controls and began offering Business Associate Agreements for healthcare customers.',
  },
  {
    icon: Bug,
    year: '2026',
    title: 'Bug Bounty & Continuous Improvement',
    description: 'Launched public bug bounty program and achieved 99.99% platform uptime SLA with enhanced disaster recovery.',
  },
]

const trustIndicators = [
  { label: 'Uptime SLA', value: '99.99%', icon: Activity },
  { label: 'Security Incidents (12mo)', value: '0', icon: AlertTriangle },
  { label: 'Pen Tests Per Year', value: '4', icon: Bug },
  { label: 'Compliance Certifications', value: '4', icon: CheckCircle2 },
]

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
}

function CertCard({ cert, index }: { cert: typeof certifications[number]; index: number }) {
  const { ref, visible } = useInView()
  const Icon = cert.icon
  const colors = colorMap[cert.color]

  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center mb-5`}>
        <Icon size={28} className={colors.text} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-xl font-bold text-gray-900">{cert.name}</h3>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
          {cert.status}
        </span>
      </div>
      <p className="text-gray-600 leading-relaxed text-sm">{cert.description}</p>
    </div>
  )
}

function InfraCard({ item, index }: { item: typeof infrastructure[number]; index: number }) {
  const { ref, visible } = useInView()
  const Icon = item.icon

  return (
    <div
      ref={ref}
      className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className="w-12 h-12 rounded-xl bg-gray-900 flex items-center justify-center mb-5">
        <Icon size={24} className="text-white" />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
      <ul className="space-y-3">
        {item.items.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-gray-600">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SecurityPage() {
  useEffect(() => {
    document.title = 'Security | Balji'
  }, [])

  const { ref: introRef, visible: introVisible } = useInView()
  const { ref: trustRef, visible: trustVisible } = useInView()
  const { ref: timelineRef, visible: timelineVisible } = useInView()
  const { ref: practicesRef, visible: practicesVisible } = useInView()

  return (
    <div className="min-h-screen bg-[#fafbff]">
      <PublicHero
        pill="Enterprise-Grade Security"
        pillIcon={Shield}
        title="Security You Can"
        titleHighlight="Trust"
        subtitle="Balji is built with security at its core. We protect your data with industry-leading encryption, continuous monitoring, and rigorous compliance certifications."
      />

      {/* Trust Indicators */}
      <section className="py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={trustRef}
            className={`grid grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-700 ${trustVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            {trustIndicators.map((item, i) => {
              const Icon = item.icon
              return (
                <div
                  key={item.label}
                  className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 text-center"
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
                    <Icon size={20} className="text-indigo-600" />
                  </div>
                  <p className="text-3xl font-extrabold text-gray-900 mb-1">{item.value}</p>
                  <p className="text-sm text-gray-500">{item.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Last Updated + Intro */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={introRef}
            className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-8 transition-all duration-700 ${introVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-medium text-gray-700">Last updated:</span> {LAST_UPDATED}
            </p>
            <p className="text-gray-600 leading-relaxed">
              Security is not just a feature at Balji -- it is foundational to everything we build. As a cloud
              communications platform trusted by brokers and ISOs, we understand the critical importance of
              protecting sensitive financial and communication data. This page provides a comprehensive overview of our
              security architecture, compliance certifications, and the practices we follow to keep your data safe.
            </p>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <FileCheck size={14} className="text-indigo-600" />
              <span className="text-sm font-medium text-indigo-700">Compliance</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Certifications & Compliance
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              We maintain the highest standards of compliance, independently verified by third-party auditors.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {certifications.map((cert, index) => (
              <CertCard key={cert.name} cert={cert} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Infrastructure Security */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border border-gray-200 mb-6">
              <Server size={14} className="text-gray-700" />
              <span className="text-sm font-medium text-gray-700">Infrastructure</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Infrastructure Security
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Multiple layers of defense protect your data at every level of our infrastructure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {infrastructure.map((item, index) => (
              <InfraCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Security Practices */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={practicesRef}
            className={`transition-all duration-700 ${practicesVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Security Practices</h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Beyond technology, our security program includes rigorous processes and a culture of security awareness.
              </p>
            </div>

            <div className="space-y-8">
              {[
                {
                  icon: Users,
                  title: 'Employee Security',
                  text: 'All employees undergo background checks and complete mandatory security awareness training upon hire and annually thereafter. Access to production systems requires manager approval, MFA, and is logged and audited. We enforce the principle of least privilege across all systems.',
                },
                {
                  icon: Bug,
                  title: 'Vulnerability Management',
                  text: 'We conduct quarterly penetration tests with independent security firms, operate a public bug bounty program, and perform continuous automated vulnerability scanning across all environments. Critical vulnerabilities are patched within 24 hours of discovery.',
                },
                {
                  icon: Fingerprint,
                  title: 'Application Security',
                  text: 'Our development lifecycle includes mandatory code reviews, static application security testing (SAST), dynamic application security testing (DAST), and software composition analysis (SCA). All dependencies are automatically scanned for known vulnerabilities.',
                },
                {
                  icon: HardDrive,
                  title: 'Business Continuity & Disaster Recovery',
                  text: 'Our platform runs across multiple availability zones with automated failover. We maintain a Recovery Time Objective (RTO) of 4 hours and Recovery Point Objective (RPO) of 1 hour. Disaster recovery plans are tested quarterly through tabletop exercises and live failover drills.',
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.title} className="flex items-start gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Icon size={22} className="text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Compliance Timeline */}
      <section className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={timelineRef}
            className={`transition-all duration-700 ${timelineVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          >
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
                <Clock size={14} className="text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">Our Journey</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Compliance Timeline
              </h2>
              <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                Our commitment to security has grown with our platform, continuously raising the bar.
              </p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-200 via-indigo-300 to-emerald-200 hidden sm:block" />

              <div className="space-y-8">
                {timeline.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={item.title} className="relative flex items-start gap-6 sm:gap-8">
                      <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-xl bg-white border-2 border-indigo-200 flex items-center justify-center shadow-sm">
                        <Icon size={20} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                            {item.year}
                          </span>
                          <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                        </div>
                        <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Responsible Disclosure */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center">
                <Eye size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Responsible Disclosure</h3>
                <p className="text-gray-600 leading-relaxed mb-4">
                  We value the security research community and welcome responsible disclosure of security vulnerabilities.
                  If you believe you have found a security issue in our platform, please report it to our security team.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="mailto:security@balji.app"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                  >
                    <Lock size={16} />
                    Report a Vulnerability
                  </a>
                  <p className="text-sm text-gray-500 self-center">
                    PGP key available at{' '}
                    <a href="https://balji.app/.well-known/security.txt" className="text-indigo-600 hover:underline">
                      security.txt
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <PublicCta
        title="Ready to See Our Security in Action?"
        subtitle="Schedule a security review with our team or request our SOC 2 report and penetration test summary."
      />
    </div>
  )
}
