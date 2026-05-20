import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'Mobile Dialer', href: '#mobile-dialer' },
  { label: 'CRM', href: '#crm' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' },
]

const ease = [0.25, 0.1, 0.25, 1] as const

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  /* Lock body scroll when mobile menu is open */
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const scrollTo = useCallback((href: string) => {
    setMobileOpen(false)
    if (href === '#') return
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-xl border-b border-[#E5E9F2] shadow-[0_2px_16px_rgba(0,0,0,0.06)]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* Logo */}
          <a
            href="#"
            className="flex items-center gap-2.5 group relative z-10"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          >
            <img
              src="/crmlink-logo.svg"
              alt="CRMLink"
              className="h-8 transition-all duration-300 group-hover:scale-105"
            />
          </a>

          {/* Desktop links -- centered */}
          <div className="hidden lg:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((l) => (
              <button
                key={l.label}
                onClick={() => scrollTo(l.href)}
                className="relative px-4 py-2 text-[13px] font-medium text-[#1A1F36] hover:text-[#1B4DFF] transition-colors duration-200 rounded-lg hover:bg-[#1B4DFF]/[0.04] group"
              >
                {l.label}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-[#1B4DFF] rounded-full transition-all duration-300 group-hover:w-4" />
              </button>
            ))}
          </div>

          {/* CTAs -- right side */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className="px-5 py-2 text-[13px] font-medium text-[#1A1F36] hover:text-[#1B4DFF] transition-all duration-200 rounded-xl border border-[#E5E9F2] hover:border-[#1B4DFF]/30 hover:bg-[#1B4DFF]/[0.03]"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2.5 text-[13px] font-semibold text-white rounded-xl transition-all duration-300 hover:-translate-y-0.5 bg-[#1B4DFF] hover:bg-[#3366FF]"
              style={{
                boxShadow: '0 4px 16px rgba(27,77,255,0.25)',
              }}
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 text-[#1A1F36] hover:text-[#1B4DFF] transition-colors relative z-10"
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {mobileOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={22} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={22} />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="lg:hidden overflow-hidden"
          >
            <div className="bg-white/98 backdrop-blur-xl border-t border-[#E5E9F2] pb-6">
              <div className="px-5 pt-4 space-y-1">
                {navLinks.map((l, i) => (
                  <motion.button
                    key={l.label}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05, ease }}
                    onClick={() => scrollTo(l.href)}
                    className="block w-full text-left px-4 py-3 text-sm font-medium text-[#4A5578] hover:text-[#1B4DFF] hover:bg-[#1B4DFF]/[0.04] rounded-lg transition-colors"
                  >
                    {l.label}
                  </motion.button>
                ))}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3, ease }}
                  className="pt-4 flex flex-col gap-3"
                >
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-center px-4 py-2.5 text-sm font-medium text-[#1A1F36] border border-[#E5E9F2] rounded-xl hover:bg-[#1B4DFF]/[0.03] hover:border-[#1B4DFF]/30 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-center px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-[#1B4DFF] hover:bg-[#3366FF] transition-colors"
                    style={{
                      boxShadow: '0 4px 16px rgba(27,77,255,0.25)',
                    }}
                  >
                    Start Free Trial
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
