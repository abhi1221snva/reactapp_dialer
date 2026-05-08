import { Link } from 'react-router-dom'

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Auto Dialer', to: '/product/auto-dialer' },
      { label: 'CRM Pipeline', to: '/product/crm-pipeline' },
      { label: 'Analytics', to: '/product/analytics' },
      { label: 'AI Insights', to: '/product/ai-insights' },
      { label: 'Mobile App', to: '/product/mobile-app' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/company/about' },
      { label: 'Careers', to: '/company/careers' },
      { label: 'Blog', to: '/company/blog' },
      { label: 'Press', to: '/company/press' },
      { label: 'Partners', to: '/company/partners' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', to: '/resources/docs' },
      { label: 'API Reference', to: '/resources/api' },
      { label: 'Status Page', to: '/resources/status' },
      { label: 'Changelog', to: '/resources/changelog' },
      { label: 'Community', to: '/resources/community' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/legal/privacy' },
      { label: 'Terms of Service', to: '/legal/terms' },
      { label: 'Cookie Policy', to: '/legal/cookies' },
      { label: 'GDPR', to: '/legal/gdpr' },
      { label: 'Security', to: '/legal/security' },
    ],
  },
]

export function PublicFooter() {
  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 lg:gap-12">
          <div className="col-span-2">
            <img src="/balji-logo.svg" alt="Balji" className="h-8 mb-4" />
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              The complete CPaaS platform built for revenue-based financing teams. Auto dialer, CRM, analytics, and AI &mdash; all in one.
            </p>
          </div>

          {columns.map(col => (
            <div key={col.title}>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map(link => (
                  <li key={link.to}>
                    <Link to={link.to} className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-sm">
            &copy; {new Date().getFullYear()} Balji. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link to="/legal/privacy" className="hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/legal/terms" className="hover:text-gray-600 transition-colors">Terms</Link>
            <Link to="/legal/cookies" className="hover:text-gray-600 transition-colors">Cookies</Link>
            <Link to="/legal/security" className="hover:text-gray-600 transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
