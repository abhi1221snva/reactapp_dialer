import { motion } from 'framer-motion'
import { Check, Link2, Info } from 'lucide-react'

const checkmarks = [
  'Any SIP trunk',
  'Multi-carrier routing',
  'No markups',
  '5-min setup',
]

export default function BYOC() {
  return (
    <section id="byoc" className="py-12 sm:py-16 relative" style={{ backgroundColor: '#F7F9FC' }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          {/* Compact BYOC card */}
          <div
            className="max-w-[960px] mx-auto rounded-2xl p-6 sm:p-8"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E9F2',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              {/* Left: icon + title + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(27, 77, 255, 0.08)',
                      border: '1px solid rgba(27, 77, 255, 0.12)',
                    }}
                  >
                    <Link2 size={18} style={{ color: '#1B4DFF' }} />
                  </div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg sm:text-xl font-bold" style={{ color: '#1A1F36' }}>
                      Bring Your Own Carrier
                    </h3>
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        backgroundColor: 'rgba(27, 77, 255, 0.06)',
                        color: '#1B4DFF',
                        border: '1px solid rgba(27, 77, 255, 0.12)',
                      }}
                    >
                      Optional
                    </span>
                  </div>
                </div>
                <p className="text-[14px] sm:text-[15px] leading-relaxed" style={{ color: '#4A5578' }}>
                  Already have a SIP trunk? Plug it in. Use your existing Twilio, Plivo,
                  Telnyx, or any carrier across mobile, desktop, and IVR. No markups.
                </p>
              </div>

              {/* Right: checkmarks */}
              <div className="flex flex-wrap gap-x-5 gap-y-2.5 lg:flex-shrink-0">
                {checkmarks.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(27, 77, 255, 0.08)' }}
                    >
                      <Check size={11} style={{ color: '#1B4DFF' }} strokeWidth={3} />
                    </div>
                    <span className="text-[13px] font-medium whitespace-nowrap" style={{ color: '#1A1F36' }}>
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom note */}
            <div
              className="mt-5 pt-5 flex items-center gap-2"
              style={{ borderTop: '1px solid #E5E9F2' }}
            >
              <Info size={13} style={{ color: '#94A3B8' }} className="flex-shrink-0" />
              <p className="text-[13px]" style={{ color: '#4A5578' }}>
                Don't have a carrier? No problem — our plans include everything you need to start dialing.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
