import { Outlet } from 'react-router-dom'

const DEFAULT_COMPANY = 'Linkswitch'

export function AuthLayout({ children }: { children?: React.ReactNode }) {
  const companyName = DEFAULT_COMPANY

  return (
    <div
      className="h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #020817 0%, #07091f 18%, #0b0e30 42%, #090c28 68%, #030714 100%)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        {/* Primary indigo — top right */}
        <div
          className="absolute -top-48 -right-48 w-[900px] h-[900px] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(99,102,241,0.24) 0%, rgba(79,70,229,0.12) 30%, transparent 62%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Blue — bottom left */}
        <div
          className="absolute -bottom-40 -left-40 w-[750px] h-[750px] rounded-full"
          style={{
            background: 'radial-gradient(circle at center, rgba(59,130,246,0.20) 0%, rgba(37,99,235,0.09) 35%, transparent 62%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Purple — center */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1100px] h-[650px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.09) 0%, transparent 58%)',
            filter: 'blur(30px)',
          }}
        />
        {/* Cyan — top center */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-[550px] h-[420px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(34,211,238,0.10) 0%, transparent 62%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Teal — bottom right */}
        <div
          className="absolute bottom-0 right-1/3 w-[450px] h-[320px]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(20,184,166,0.07) 0%, transparent 62%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Subtle dot grid */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(148,163,184,0.10) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
          }}
        />
        {/* Very subtle diagonal lines */}
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              -45deg,
              rgba(255,255,255,0.8) 0px,
              rgba(255,255,255,0.8) 1px,
              transparent 1px,
              transparent 60px
            )`,
          }}
        />
      </div>

      {/* Center content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-4 overflow-y-auto relative z-10">
        {/* Auth card — gradient border wrapper */}
        <div
          className="w-full max-w-[460px] rounded-[22px] p-[1px]"
          style={{
            background: 'linear-gradient(145deg, rgba(99,102,241,0.45) 0%, rgba(255,255,255,0.07) 45%, rgba(59,130,246,0.35) 100%)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,0,0,0.2), 0 0 100px rgba(99,102,241,0.08)',
          }}
        >
          <div
            className="w-full rounded-[21px] px-8 py-6 animate-fadeIn"
            style={{
              background: 'rgba(8, 10, 32, 0.92)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)',
            }}
          >
            {children || <Outlet />}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-5 text-[11px] text-slate-600 text-center tracking-wide">
          &copy; {new Date().getFullYear()} {companyName}{companyName.endsWith('.') ? '' : '.'} All rights reserved.
          {' · '}
          <a href="#" className="hover:text-slate-400 transition-colors duration-200">Privacy</a>
          {' · '}
          <a href="#" className="hover:text-slate-400 transition-colors duration-200">Terms</a>
        </p>
      </div>
    </div>
  )
}
