import { motion } from 'framer-motion'
import {
  Smartphone, Radio, PhoneCall, Eye, Wifi,
  MousePointerClick, Download, LogIn, Phone,
  Signal, Battery, ChevronRight, Link2,
} from 'lucide-react'
import { Link } from 'react-router-dom'

/* -- Feature bullets -------------------------------------------------- */
const features = [
  { icon: Radio, title: 'Three dialing modes', desc: 'Predictive, progressive, and preview dialing \u2014 all on mobile' },
  { icon: PhoneCall, title: 'Native VoIP calling', desc: 'No carrier minutes used. Calls run over data or WiFi' },
  { icon: Smartphone, title: 'Full campaign workflow', desc: 'Live queue, lead disposition, callback scheduling \u2014 on your phone' },
  { icon: Eye, title: 'Supervisor tools built in', desc: 'Real-time monitoring with whisper and barge capabilities' },
  { icon: Wifi, title: 'Works everywhere', desc: '4G, 5G, or WiFi with adaptive codec for crystal-clear audio' },
  { icon: MousePointerClick, title: 'Push-to-call', desc: 'Tap any lead card to instantly connect' },
]

/* -- "How it works" steps --------------------------------------------- */
const steps = [
  { icon: Download, title: 'Install the app', desc: 'Download from App Store or Google Play in seconds' },
  { icon: LogIn, title: 'Login to your campaign', desc: 'Pick your campaign, set your status, go live' },
  { icon: Phone, title: 'Start dialing', desc: 'Calls flow automatically \u2014 just talk and sell' },
]

/* -- Animation variants ----------------------------------------------- */
const featureContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const featureItem = {
  hidden: { opacity: 0, x: 20 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

const stepContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15 } },
}

const stepItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  },
}

/* -- Phone mockup component ------------------------------------------- */
function PhoneMockup() {
  return (
    <div className="relative w-[280px] sm:w-[300px]">
      {/* Outer glow */}
      <div
        className="absolute inset-0 -m-16"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(27,77,255,0.10) 0%, transparent 60%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Device frame */}
      <div
        className="relative rounded-[40px] p-[3px]"
        style={{
          background: 'linear-gradient(145deg, rgba(27,77,255,0.25) 0%, rgba(10,22,40,0.6) 50%, rgba(27,77,255,0.12) 100%)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(27,77,255,0.10)',
        }}
      >
        <div className="rounded-[38px] overflow-hidden" style={{ backgroundColor: '#0A1628' }}>
          {/* Notch */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-[100px] h-[28px] bg-black rounded-full" />
          </div>

          {/* Status bar */}
          <div className="flex items-center justify-between px-7 py-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
            <span className="font-semibold">9:41</span>
            <div className="flex items-center gap-1.5">
              <Signal size={10} />
              <Wifi size={10} />
              <Battery size={10} />
            </div>
          </div>

          {/* Screen content */}
          <div className="px-4 pb-6 pt-2 min-h-[420px]">
            {/* Campaign header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-medium" style={{ color: '#94A3B8' }}>Campaign</div>
                <div className="text-[13px] font-bold text-white">Q2 Outbound Blitz</div>
              </div>
              <div
                className="px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'rgba(0, 200, 83, 0.15)',
                  border: '1px solid rgba(0, 200, 83, 0.2)',
                }}
              >
                <span className="text-[9px] font-bold" style={{ color: '#00C853' }}>LIVE</span>
              </div>
            </div>

            {/* Mode selector */}
            <div className="flex gap-1 mb-4 rounded-xl p-1" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              {['Predictive', 'Progressive', 'Preview'].map((mode, i) => (
                <div
                  key={mode}
                  className="flex-1 text-center py-1.5 rounded-lg text-[9px] font-semibold transition-colors"
                  style={
                    i === 0
                      ? {
                          backgroundColor: 'rgba(27, 77, 255, 0.2)',
                          color: '#1B4DFF',
                          border: '1px solid rgba(27, 77, 255, 0.25)',
                        }
                      : { color: '#94A3B8' }
                  }
                >
                  {mode}
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { val: '147', label: 'Dialed' },
                { val: '34', label: 'Connected' },
                { val: '23%', label: 'Rate' },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center rounded-lg py-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="text-sm font-bold text-white">{s.val}</div>
                  <div className="text-[8px] uppercase tracking-wider" style={{ color: '#94A3B8' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Active call card */}
            <div
              className="rounded-xl p-3 mb-3"
              style={{
                backgroundColor: 'rgba(27, 77, 255, 0.06)',
                border: '1px solid rgba(27, 77, 255, 0.15)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #1B4DFF, #00BCD4)' }}
                  >
                    AW
                  </div>
                  {/* Pulse ring */}
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{
                      border: '2px solid rgba(27, 77, 255, 0.4)',
                      animationDuration: '2s',
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white truncate">Amanda Wilson</div>
                  <div className="text-[10px]" style={{ color: '#94A3B8' }}>BrightPath LLC</div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <div className="text-[10px] font-mono" style={{ color: '#1B4DFF' }}>02:18</div>
                  <div className="flex gap-[2px]">
                    {[0.4, 0.7, 1, 0.6, 0.9, 0.3, 0.8].map((h, idx) => (
                      <div
                        key={idx}
                        className="w-[2px] rounded-full"
                        style={{
                          backgroundColor: 'rgba(27, 77, 255, 0.6)',
                          height: `${h * 14}px`,
                          animation: `waveform ${0.4 + idx * 0.1}s ease-in-out infinite alternate`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Queue list */}
            <div className="text-[9px] font-semibold uppercase tracking-wider mb-2 px-1" style={{ color: '#94A3B8' }}>Up next</div>
            <div className="space-y-1.5">
              {[
                { name: 'Tom Bradley', co: 'Vertex Inc', initials: 'TB' },
                { name: 'Nina Patel', co: 'Summit Group', initials: 'NP' },
                { name: 'Ray Castro', co: 'OceanView Co', initials: 'RC' },
              ].map((lead) => (
                <div
                  key={lead.name}
                  className="flex items-center justify-between py-2 px-2.5 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-semibold"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#94A3B8' }}
                    >
                      {lead.initials}
                    </div>
                    <div>
                      <div className="text-[10px] font-medium" style={{ color: '#E2E8F0' }}>{lead.name}</div>
                      <div className="text-[8px]" style={{ color: '#94A3B8' }}>{lead.co}</div>
                    </div>
                  </div>
                  <ChevronRight size={10} style={{ color: '#4A5578' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* -- Main component --------------------------------------------------- */
export default function MobileDialer() {
  return (
    <section
      id="mobile-dialer"
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ backgroundColor: '#F7F9FC' }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="text-center max-w-[740px] mx-auto mb-16 sm:mb-20"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 uppercase tracking-wider"
            style={{
              border: '1px solid rgba(27, 77, 255, 0.2)',
              backgroundColor: 'rgba(27, 77, 255, 0.06)',
              color: '#1B4DFF',
            }}
          >
            <Smartphone size={12} />
            Hero Feature
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-[-0.025em] mb-5 leading-[1.1]">
            <span style={{ color: '#1A1F36' }}>
              The First True Mobile Dialer
            </span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #1B4DFF, #00BCD4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              for Outbound Campaigns
            </span>
          </h2>
          <p className="text-base sm:text-lg leading-relaxed max-w-[560px] mx-auto" style={{ color: '#4A5578' }}>
            Your agents don't need a workstation. They need a phone and an internet
            connection. CRMLink turns every smartphone into a full campaign dialer.
          </p>
        </motion.div>

        {/* Two-column: phone mockup + features */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-24">
          {/* Phone mockup -- left */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] as const }}
            className="relative flex justify-center lg:justify-end"
            style={{ animation: 'phoneFloat 6s ease-in-out infinite' }}
          >
            <PhoneMockup />
          </motion.div>

          {/* Feature bullets -- right */}
          <motion.div
            variants={featureContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            <div className="space-y-5 mb-10">
              {features.map((f, i) => (
                <motion.div key={i} variants={featureItem} className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      backgroundColor: 'rgba(27, 77, 255, 0.08)',
                      border: '1px solid rgba(27, 77, 255, 0.12)',
                    }}
                  >
                    <f.icon size={18} style={{ color: '#1B4DFF' }} />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-semibold mb-0.5" style={{ color: '#1A1F36' }}>{f.title}</h4>
                    <p className="text-[13px] leading-relaxed" style={{ color: '#4A5578' }}>{f.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* BYOC small callout */}
            <motion.div
              variants={featureItem}
              className="rounded-xl p-4 flex items-center gap-3"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E9F2',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'rgba(27, 77, 255, 0.08)' }}
              >
                <Link2 size={15} style={{ color: '#1B4DFF' }} />
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: '#4A5578' }}>
                <span className="font-medium" style={{ color: '#1A1F36' }}>Bring your own carrier?</span>{' '}
                We support that too.{' '}
                <a
                  href="#byoc"
                  className="font-medium transition-colors"
                  style={{ color: '#1B4DFF' }}
                  onMouseOver={(e) => { e.currentTarget.style.color = '#3366FF' }}
                  onMouseOut={(e) => { e.currentTarget.style.color = '#1B4DFF' }}
                >
                  Learn more &darr;
                </a>
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* How it works -- 3 steps */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="max-w-[860px] mx-auto"
        >
          <div className="text-center mb-10">
            <h3 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: '#1A1F36' }}>
              Up and running in 3 steps
            </h3>
            <p className="text-sm" style={{ color: '#4A5578' }}>No hardware. No IT tickets. No training sessions.</p>
          </div>

          <motion.div
            variants={stepContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid sm:grid-cols-3 gap-5 relative"
          >
            {/* Connector line (desktop) */}
            <div
              className="hidden sm:block absolute top-[44px] left-[20%] right-[20%] h-px"
              style={{
                background: 'linear-gradient(to right, transparent, rgba(27, 77, 255, 0.2), transparent)',
              }}
            />

            {steps.map((s, i) => (
              <motion.div key={s.title} variants={stepItem} className="text-center relative">
                <div className="relative inline-flex mb-5">
                  <div
                    className="w-[76px] h-[76px] rounded-2xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'rgba(27, 77, 255, 0.08)',
                      border: '1px solid rgba(27, 77, 255, 0.12)',
                      boxShadow: '0 8px 32px rgba(27, 77, 255, 0.08)',
                    }}
                  >
                    <s.icon size={30} style={{ color: '#1B4DFF' }} />
                  </div>
                  <div
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold"
                    style={{
                      backgroundColor: '#1B4DFF',
                      color: '#FFFFFF',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <h4 className="text-sm font-bold mb-1.5" style={{ color: '#1A1F36' }}>{s.title}</h4>
                <p className="text-[13px] leading-relaxed" style={{ color: '#4A5578' }}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
          >
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
              style={{
                backgroundColor: '#1B4DFF',
                boxShadow: '0 4px 14px rgba(27, 77, 255, 0.25)',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#3366FF'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(27, 77, 255, 0.35)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#1B4DFF'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(27, 77, 255, 0.25)'
              }}
            >
              Start free trial
              <ChevronRight size={16} />
            </Link>
            <span className="text-[13px]" style={{ color: '#4A5578' }}>
              No credit card required
            </span>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
