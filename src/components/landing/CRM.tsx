import { motion } from 'framer-motion'
import {
  GripVertical, Settings, Shield, Plug, Code, Layout,
} from 'lucide-react'

const bullets = [
  {
    icon: GripVertical,
    text: 'Drag-and-drop custom fields, pipelines, and stages',
    color: '#1B4DFF',
    bg: 'rgba(27,77,255,0.10)',
  },
  {
    icon: Settings,
    text: 'Custom modules (deals, policies, loans, properties, tickets)',
    color: '#00BCD4',
    bg: 'rgba(0,188,212,0.10)',
  },
  {
    icon: Code,
    text: 'Workflow automation builder (visual, no-code)',
    color: '#8B5CF6',
    bg: 'rgba(139,92,246,0.10)',
  },
  {
    icon: Shield,
    text: 'Role-based access control with granular permissions',
    color: '#00C853',
    bg: 'rgba(0,200,83,0.10)',
  },
  {
    icon: Plug,
    text: 'Native integrations + REST API + webhooks',
    color: '#F59E0B',
    bg: 'rgba(245,158,11,0.10)',
  },
  {
    icon: Layout,
    text: 'Embeddable widgets for your own apps',
    color: '#EC4899',
    bg: 'rgba(236,72,153,0.10)',
  },
]

const stages = [
  { name: 'New Leads', count: 8, color: '#1B4DFF', bg: 'rgba(27,77,255,0.10)' },
  { name: 'Contacted', count: 5, color: '#00BCD4', bg: 'rgba(0,188,212,0.10)' },
  { name: 'Qualified', count: 3, color: '#00C853', bg: 'rgba(0,200,83,0.10)' },
  { name: 'Proposal', count: 2, color: '#F59E0B', bg: 'rgba(245,158,11,0.10)' },
  { name: 'Won', count: 4, color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
]

const leadNames = [
  ['Acme Corp', 'SkyTech Inc', 'NovaPay'],
  ['Rivera LLC', 'BrightFin', 'CoreNet'],
  ['DataFlow', 'ZenithAI', 'BlueStar'],
  ['PeakCo', 'EdgeSys', 'FlowIO'],
  ['MetroFin', 'RapidLend', 'EliteCRM'],
]

const dealValues = [
  ['12K', '8K', '24K'],
  ['18K', '6K', '15K'],
  ['32K', '9K', '21K'],
  ['45K', '11K', '7K'],
  ['28K', '16K', '38K'],
]

const fieldTypes = [
  { name: 'Deal Value', type: 'currency', typeColor: '#00C853' },
  { name: 'Loan Type', type: 'dropdown', typeColor: '#1B4DFF' },
  { name: 'Lead Source', type: 'text', typeColor: '#94A3B8' },
  { name: 'Priority', type: 'tag', typeColor: '#F59E0B' },
]

/* -- Animated pipeline mockup ------------------------------------------------ */
function PipelineMockup() {
  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#FFFFFF',
        border: '1px solid #E5E9F2',
        boxShadow: '0 8px 40px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 sm:px-5 py-3"
        style={{ borderBottom: '1px solid #E5E9F2' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ background: '#1B4DFF' }}
          />
          <span className="text-[12px] font-semibold" style={{ color: '#4A5578' }}>
            Sales Pipeline
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="px-2.5 py-1 rounded-md text-[10px] font-medium"
            style={{ color: '#4A5578', background: '#F7F9FC' }}
          >
            Board View
          </div>
          <div
            className="px-2.5 py-1 rounded-md text-[10px] font-medium"
            style={{
              color: '#1B4DFF',
              background: 'rgba(27,77,255,0.08)',
              border: '1px solid rgba(27,77,255,0.15)',
            }}
          >
            + Add Field
          </div>
        </div>
      </div>

      {/* Pipeline columns */}
      <div className="flex gap-3 p-3 sm:p-4 overflow-x-auto">
        {stages.map((stage, si) => (
          <div key={stage.name} className="flex-shrink-0 w-[130px] sm:w-[140px]">
            {/* Column header */}
            <div className="flex items-center gap-2 mb-2.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: stage.color }}
              />
              <span
                className="text-[10px] sm:text-[11px] font-semibold"
                style={{ color: '#4A5578' }}
              >
                {stage.name}
              </span>
              <span
                className="text-[9px] ml-auto font-medium"
                style={{ color: '#94A3B8' }}
              >
                {stage.count}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {Array.from({ length: Math.min(stage.count, 3) }).map((_, j) => (
                <motion.div
                  key={j}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: si * 0.08 + j * 0.05,
                    duration: 0.4,
                    ease: [0.25, 0.46, 0.45, 0.94] as const,
                  }}
                  className="rounded-lg p-2.5 transition-colors duration-200"
                  style={{
                    background: '#F7F9FC',
                    border: '1px solid #E5E9F2',
                  }}
                >
                  {/* Lead name */}
                  <div
                    className="text-[9px] sm:text-[10px] font-medium mb-1"
                    style={{ color: '#1A1F36' }}
                  >
                    {leadNames[si]?.[j] ?? 'Lead'}
                  </div>
                  {/* Subtitle bar */}
                  <div
                    className="h-1.5 w-12 rounded-full mb-2"
                    style={{ background: '#E5E9F2' }}
                  />
                  {/* Bottom row */}
                  <div className="flex items-center justify-between">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: `linear-gradient(135deg, ${stage.bg}, #E5E9F2)`,
                      }}
                    />
                    <span className="text-[8px] font-medium" style={{ color: '#94A3B8' }}>
                      ${dealValues[si]?.[j] ?? '10K'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Custom Field Editor panel */}
      <div className="mx-3 sm:mx-4 mb-3 sm:mb-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="rounded-xl p-3 sm:p-4"
          style={{
            background: 'rgba(27,77,255,0.03)',
            border: '1px solid rgba(27,77,255,0.12)',
            boxShadow: '0 4px 24px rgba(27,77,255,0.04)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#1B4DFF' }}
            >
              Custom Field Editor
            </div>
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: 'rgba(27,77,255,0.08)' }}
            >
              <GripVertical size={10} style={{ color: '#1B4DFF' }} />
            </div>
          </div>
          <div className="space-y-2">
            {fieldTypes.map((field) => (
              <div
                key={field.name}
                className="flex items-center gap-2.5 py-1"
              >
                <GripVertical size={11} style={{ color: '#94A3B8' }} />
                <span
                  className="text-[11px] font-medium flex-1"
                  style={{ color: '#4A5578' }}
                >
                  {field.name}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
                  style={{
                    color: field.typeColor,
                    background: `${field.typeColor}12`,
                    border: `1px solid ${field.typeColor}20`,
                  }}
                >
                  {field.type}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* -- CRM Section ------------------------------------------------------------- */
export default function CRM() {
  return (
    <section
      id="crm"
      className="py-24 sm:py-32 relative overflow-hidden"
      style={{ background: '#F7F9FC' }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(27,77,255,0.03) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="text-center max-w-[720px] mx-auto mb-16"
        >
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-semibold mb-6 uppercase tracking-widest"
            style={{
              border: '1px solid rgba(0,200,83,0.25)',
              background: 'rgba(0,200,83,0.06)',
              color: '#00C853',
            }}
          >
            Fully Customizable CRM
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-[-0.025em] mb-5 leading-[1.15]"
            style={{ color: '#1A1F36' }}
          >
            A CRM That Bends to Your Business
          </h2>
          <p className="text-base sm:text-lg leading-relaxed" style={{ color: '#4A5578' }}>
            Not the other way around. Build exactly the workflows, fields, and
            modules your team needs.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - feature bullets */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            <div className="space-y-5">
              {bullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    delay: i * 0.08,
                    duration: 0.45,
                    ease: [0.25, 0.46, 0.45, 0.94] as const,
                  }}
                  className="flex items-start gap-4 group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-110"
                    style={{ background: b.bg }}
                  >
                    <b.icon size={18} style={{ color: b.color }} strokeWidth={1.8} />
                  </div>
                  <div>
                    <span
                      className="text-[14px] sm:text-[15px] leading-relaxed font-medium"
                      style={{ color: '#1A1F36' }}
                    >
                      {b.text}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - pipeline mockup */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{
              duration: 0.7,
              delay: 0.15,
              ease: [0.25, 0.46, 0.45, 0.94] as const,
            }}
          >
            <PipelineMockup />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
