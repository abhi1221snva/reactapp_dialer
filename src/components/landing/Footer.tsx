import { Link } from 'react-router-dom'
import { Shield, Lock, Globe, FileCheck } from 'lucide-react'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Mobile Dialer', href: '#mobile-dialer' },
      { label: 'CRM', href: '#crm' },
      { label: 'CPaaS Platform', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'BYOC', href: '#byoc' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'MCA & Lending', href: '#industries' },
      { label: 'BPO / Call Centers', href: '#industries' },
      { label: 'Real Estate', href: '#industries' },
      { label: 'Insurance', href: '#industries' },
      { label: 'Collections', href: '#industries' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Status Page', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Partners', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
]

const badges = [
  { icon: Shield, label: 'SOC 2' },
  { icon: Lock, label: 'HIPAA' },
  { icon: Globe, label: 'GDPR' },
  { icon: FileCheck, label: 'TCPA Ready' },
]

export default function Footer() {
  return (
    <footer
      className="pt-16 pb-8 relative"
      style={{
        backgroundColor: '#0A1628',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand column */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <img
                src="/crmlink-logo.svg"
                alt="CRMLink"
                className="h-7 brightness-0 invert"
              />
            </div>
            <p
              className="text-[13px] leading-relaxed max-w-[280px] mb-6"
              style={{ color: '#94A3B8' }}
            >
              The first mobile-first CPaaS + CRM platform. Run dialer campaigns
              from any device.
            </p>

            {/* Compliance badges */}
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div
                  key={b.label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium"
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    color: '#94A3B8',
                  }}
                >
                  <b.icon size={10} style={{ color: '#64748B' }} />
                  {b.label}
                </div>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4
                className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-4"
                style={{ color: '#E2E8F0' }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith('#') ? (
                      <a
                        href={l.href}
                        className="text-[13px] transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = '#CBD5E1')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = '#94A3B8')
                        }
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        to={l.href}
                        className="text-[13px] transition-colors"
                        style={{ color: '#94A3B8' }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = '#CBD5E1')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = '#94A3B8')
                        }
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p
            className="text-[11px]"
            style={{ color: '#64748B' }}
          >
            &copy; 2025 CRMLink. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-[11px]">
            {['Privacy', 'Terms', 'Cookies', 'Contact'].map((item) => (
              <a
                key={item}
                href="#"
                className="transition-colors"
                style={{ color: '#64748B' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = '#94A3B8')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = '#64748B')
                }
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
