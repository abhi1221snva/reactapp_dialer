import { Outlet } from 'react-router-dom'
import { Phone, CheckCircle2 } from 'lucide-react'

const features = [
  'AI-powered auto-dialing',
  'Real-time agent monitoring',
  'Smart CRM integration',
]

export function AuthLayout() {
  return (
    <div className="min-h-screen flex">

      {/* LEFT PANEL — brand */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 40%, #6d28d9 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)' }} />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.04)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)', boxShadow: '0 0 24px rgba(255,255,255,0.15)' }}
          >
            <Phone size={22} className="text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">DialerCRM</span>
        </div>

        {/* Center content */}
        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            The modern dialer platform for high-performing sales teams
          </h2>
          <p className="text-indigo-200 text-base mb-10 leading-relaxed">
            Supercharge your outreach with intelligent automation, real-time insights, and seamless CRM workflows.
          </p>
          <ul className="space-y-4">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2 size={20} className="text-indigo-200 flex-shrink-0" />
                <span className="text-white text-[15px] font-medium">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-indigo-300 text-xs">
          &copy; {new Date().getFullYear()} DialerCRM. All rights reserved.
        </p>
      </div>

      {/* RIGHT PANEL — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-white px-6 py-12 lg:px-16">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
            <Phone size={17} className="text-white" />
          </div>
          <span className="font-bold text-[17px] tracking-tight" style={{ background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DialerCRM
          </span>
        </div>

        <div className="w-full max-w-md">
          <Outlet />
        </div>

        <p className="lg:hidden mt-10 text-slate-400 text-xs">
          &copy; {new Date().getFullYear()} DialerCRM. All rights reserved.
        </p>
      </div>
    </div>
  )
}
