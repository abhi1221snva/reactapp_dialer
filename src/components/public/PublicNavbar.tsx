import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Menu, X, ChevronDown,
  Zap, Users, BarChart3, Brain, Smartphone,
  BookOpen, Code2, Activity, FileText, MessageCircle,
} from 'lucide-react'

const PORTAL = 'https://portal.balji.app'

const productLinks = [
  { to: '/product/auto-dialer', label: 'Auto Dialer', desc: 'Progressive & preview dialing', icon: Zap },
  { to: '/product/crm-pipeline', label: 'CRM Pipeline', desc: 'Track deals from app to funding', icon: Users },
  { to: '/product/analytics', label: 'Analytics', desc: 'Real-time dashboards & reports', icon: BarChart3 },
  { to: '/product/ai-insights', label: 'AI Insights', desc: 'Sentiment & coaching AI', icon: Brain },
  { to: '/product/mobile-app', label: 'Mobile App', desc: 'iOS & Android native apps', icon: Smartphone },
]

const resourceLinks = [
  { to: '/resources/docs', label: 'Documentation', desc: 'Guides & tutorials', icon: BookOpen },
  { to: '/resources/api', label: 'API Reference', desc: 'REST API & SDKs', icon: Code2 },
  { to: '/resources/status', label: 'Status Page', desc: 'Uptime & incidents', icon: Activity },
  { to: '/resources/changelog', label: 'Changelog', desc: 'Product updates', icon: FileText },
  { to: '/resources/community', label: 'Community', desc: 'Forums & Discord', icon: MessageCircle },
]

function DropdownMenu({ label, links, open, onToggle }: {
  label: string
  links: typeof productLinks
  open: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onToggle])

  return (
    <div ref={ref} className="relative">
      <button onClick={onToggle}
        className="flex items-center gap-1 px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-full transition-all duration-200"
      >
        {label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`absolute top-full left-1/2 -translate-x-1/2 pt-2 transition-all duration-200 ${open ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
        <div className="w-[320px] bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/40 p-2 overflow-hidden">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={onToggle}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:border-gray-200 transition-colors">
                <l.icon size={18} className="text-gray-500 group-hover:text-indigo-600 transition-colors" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">{l.label}</div>
                <div className="text-xs text-gray-400">{l.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const location = useLocation()

  useEffect(() => { setMobileOpen(false); setOpenDropdown(null) }, [location.pathname])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled
        ? 'bg-white/80 backdrop-blur-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-b border-gray-100/80'
        : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          <Link to="/website_balji" className="flex items-center gap-2.5">
            <img src="/balji-logo.svg" alt="Balji" className="h-8" />
          </Link>

          <div className="hidden md:flex items-center gap-1 bg-gray-100/60 backdrop-blur-sm rounded-full px-1.5 py-1.5">
            <DropdownMenu
              label="Product"
              links={productLinks}
              open={openDropdown === 'product'}
              onToggle={() => setOpenDropdown(openDropdown === 'product' ? null : 'product')}
            />
            <Link to="/company/about" className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-full transition-all duration-200">
              Company
            </Link>
            <DropdownMenu
              label="Resources"
              links={resourceLinks}
              open={openDropdown === 'resources'}
              onToggle={() => setOpenDropdown(openDropdown === 'resources' ? null : 'resources')}
            />
            <Link to="/product/analytics" className="px-4 py-2 text-[13px] font-medium text-gray-600 hover:text-gray-900 hover:bg-white rounded-full transition-all duration-200">
              Pricing
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href={`${PORTAL}/login`} className="px-5 py-2.5 text-[13px] font-semibold text-gray-700 hover:text-gray-900 rounded-full transition-all">
              Login
            </a>
            <a href={`${PORTAL}/register`}
              className="px-6 py-2.5 text-[13px] font-semibold text-white rounded-full bg-gray-900 hover:bg-gray-800 shadow-lg shadow-gray-900/10 transition-all hover:-translate-y-px"
            >
              Get Started Free
            </a>
          </div>

          <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 text-gray-600 hover:text-gray-900 rounded-xl">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-4 pb-6 pt-2 bg-white/95 backdrop-blur-xl border-t border-gray-100">
          <div className="mb-2">
            <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product</p>
            {productLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mb-2">
            <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company</p>
            {[
              { to: '/company/about', label: 'About' },
              { to: '/company/careers', label: 'Careers' },
              { to: '/company/blog', label: 'Blog' },
            ].map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mb-2">
            <p className="px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resources</p>
            {resourceLinks.map(l => (
              <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
            <a href={`${PORTAL}/login`} className="text-center px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50">Login</a>
            <a href={`${PORTAL}/register`} className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gray-900 hover:bg-gray-800">Get Started Free</a>
          </div>
        </div>
      </div>
    </nav>
  )
}
