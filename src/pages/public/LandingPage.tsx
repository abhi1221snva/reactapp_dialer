import { useEffect } from 'react'
import Nav from '../../components/landing/Nav'
import Hero from '../../components/landing/Hero'
import Problem from '../../components/landing/Problem'
import MobileDialer from '../../components/landing/MobileDialer'
import BYOC from '../../components/landing/BYOC'
import CPaaSGrid from '../../components/landing/CPaaSGrid'
import CRM from '../../components/landing/CRM'
import Industries from '../../components/landing/Industries'
import SocialProof from '../../components/landing/SocialProof'
import Pricing from '../../components/landing/Pricing'
import FinalCTA from '../../components/landing/FinalCTA'
import Footer from '../../components/landing/Footer'

/* ── Animated background — subtle light gradient with barely-visible orbs ── */
function AnimatedBg() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Base gradient — light palette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(160deg, #F7F9FC 0%, #FFFFFF 35%, #F7F9FC 60%, #FFFFFF 80%, #F7F9FC 100%)',
        }}
      />

      {/* Subtle grid overlay — very faint on light bg */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(27,77,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(27,77,255,0.15) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }}
      />

      {/* Radial accent at top — barely visible blue */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(27,77,255,0.03) 0%, transparent 60%)',
        }}
      />

      {/* Floating orbs — very subtle blue tones on light bg */}
      <div
        className="absolute w-[900px] h-[900px] rounded-full"
        style={{
          top: '-22%',
          right: '-12%',
          background: 'radial-gradient(circle, rgba(27,77,255,0.04) 0%, transparent 58%)',
          filter: 'blur(100px)',
          animation: 'orbFloat1 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          bottom: '8%',
          left: '-16%',
          background: 'radial-gradient(circle, rgba(0,188,212,0.03) 0%, transparent 58%)',
          filter: 'blur(90px)',
          animation: 'orbFloat2 26s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          top: '38%',
          left: '42%',
          background: 'radial-gradient(circle, rgba(27,77,255,0.025) 0%, transparent 55%)',
          filter: 'blur(70px)',
          animation: 'orbFloat3 19s ease-in-out infinite',
        }}
      />
      {/* Smaller accent orb — bottom right */}
      <div
        className="absolute w-[400px] h-[400px] rounded-full"
        style={{
          bottom: '20%',
          right: '-5%',
          background: 'radial-gradient(circle, rgba(0,188,212,0.025) 0%, transparent 55%)',
          filter: 'blur(60px)',
          animation: 'orbFloat1 16s ease-in-out infinite reverse',
        }}
      />

      {/* Noise texture — very subtle */}
      <div
        className="absolute inset-0 opacity-[0.008]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

/* ── Landing page — composed ────────────────────────────────────────── */
export function LandingPage() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    return () => {
      document.documentElement.style.scrollBehavior = ''
    }
  }, [])

  return (
    <div className="min-h-screen text-[#1A1F36] overflow-x-hidden relative">
      <AnimatedBg />
      <div className="relative" style={{ zIndex: 1 }}>
        <Nav />
        <Hero />
        <Problem />
        <MobileDialer />
        <BYOC />
        <CPaaSGrid />
        <CRM />
        <Industries />
        <SocialProof />
        <Pricing />
        <FinalCTA />
        <Footer />
      </div>

      {/* Keyframe animations + global utility styles */}
      <style>{`
        /* ── Orb floating animations ──────────────────────────────── */
        @keyframes orbFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-35px, 25px) scale(1.04); }
          66% { transform: translate(25px, -18px) scale(0.97); }
        }
        @keyframes orbFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(28px, -22px) scale(0.97); }
          66% { transform: translate(-18px, 28px) scale(1.03); }
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(35px, -35px); }
        }

        /* ── Phone mockup float ───────────────────────────────────── */
        @keyframes phoneFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }

        /* ── Audio waveform bars ──────────────────────────────────── */
        @keyframes waveform {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1); }
        }

        /* ── Signal pulse rings ───────────────────────────────────── */
        @keyframes pulseRing {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        /* ── Queue item slide in ──────────────────────────────────── */
        @keyframes queueSlide {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* ── Scrollbar hide utility ───────────────────────────────── */
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* ── Reduced motion ───────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
