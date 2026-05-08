import { useEffect } from 'react'
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, Shield,
  MessageSquare, Target, Lightbulb, Volume2,
  ThumbsUp, Minus, ThumbsDown, BarChart3,
  Users, Zap, Clock, ArrowUpRight, CheckCircle2,
  HeadphonesIcon, FileText, Activity,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Sentiment Display Panel
   ═══════════════════════════════════════════════════════════════════════════ */

function SentimentPanel() {
  const { ref, visible } = useInView()

  const calls = [
    { name: 'Sarah Mitchell', company: 'TechFlow Inc.', duration: '6:42', sentiment: 'positive', score: 92, keywords: ['interested', 'ready to proceed', 'good terms'] },
    { name: 'James Rodriguez', company: 'DataBridge Co.', duration: '4:18', sentiment: 'neutral', score: 64, keywords: ['need more info', 'comparing options', 'follow up'] },
    { name: 'Emily Chen', company: 'CloudNine LLC', duration: '3:05', sentiment: 'negative', score: 28, keywords: ['too expensive', 'not interested', 'bad timing'] },
    { name: 'David Alvarez', company: 'PayScale Corp', duration: '8:15', sentiment: 'positive', score: 88, keywords: ['excited', 'schedule closing', 'great offer'] },
  ]

  const sentimentConfig = {
    positive: { icon: ThumbsUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', barColor: 'bg-emerald-500', label: 'Positive' },
    neutral: { icon: Minus, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', barColor: 'bg-amber-500', label: 'Neutral' },
    negative: { icon: ThumbsDown, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', barColor: 'bg-red-500', label: 'Negative' },
  }

  const overallDistribution = { positive: 62, neutral: 26, negative: 12 }

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Sentiment panel */}
          <div className={`transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-to-br from-violet-100/30 via-transparent to-emerald-100/30 rounded-3xl blur-2xl pointer-events-none" />

              <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Volume2 size={16} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Call Sentiment Analysis</h3>
                      <p className="text-[10px] text-gray-400">AI-powered real-time analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 rounded-lg">
                    <Brain size={12} className="text-violet-600" />
                    <span className="text-[10px] font-semibold text-violet-600">Live</span>
                  </div>
                </div>

                {/* Overall distribution bar */}
                <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Today's Distribution</p>
                  <div className="flex h-4 rounded-full overflow-hidden mb-2">
                    <div className="bg-emerald-500 transition-all duration-1000" style={{ width: visible ? `${overallDistribution.positive}%` : '0%' }} />
                    <div className="bg-amber-500 transition-all duration-1000 delay-200" style={{ width: visible ? `${overallDistribution.neutral}%` : '0%' }} />
                    <div className="bg-red-500 transition-all duration-1000 delay-400" style={{ width: visible ? `${overallDistribution.negative}%` : '0%' }} />
                  </div>
                  <div className="flex items-center justify-between">
                    {Object.entries(overallDistribution).map(([key, val]) => {
                      const config = sentimentConfig[key as keyof typeof sentimentConfig]
                      const SentIcon = config.icon
                      return (
                        <div key={key} className="flex items-center gap-1.5">
                          <SentIcon size={11} className={config.color} />
                          <span className="text-[10px] font-medium text-gray-600">{config.label} {val}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Call list */}
                <div className="divide-y divide-gray-50">
                  {calls.map((call, i) => {
                    const config = sentimentConfig[call.sentiment as keyof typeof sentimentConfig]
                    const SentIcon = config.icon
                    return (
                      <div
                        key={call.name}
                        className={`px-6 py-4 hover:bg-gray-50/50 transition-all duration-500 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                        style={{ transitionDelay: `${i * 100 + 300}ms` }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-[9px] font-bold text-gray-600">
                              {call.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{call.name}</p>
                              <p className="text-[10px] text-gray-400">{call.company} - {call.duration}</p>
                            </div>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg} ${config.border} border`}>
                            <SentIcon size={11} className={config.color} />
                            <span className={`text-[10px] font-semibold ${config.color}`}>{config.label}</span>
                          </div>
                        </div>

                        {/* Score bar */}
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={`${config.barColor} h-2 rounded-full transition-all duration-700`}
                              style={{ width: visible ? `${call.score}%` : '0%', transitionDelay: `${i * 100 + 500}ms` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-gray-700 w-8 text-right">{call.score}</span>
                        </div>

                        {/* Keywords */}
                        <div className="flex flex-wrap gap-1">
                          {call.keywords.map(kw => (
                            <span key={kw} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                              &ldquo;{kw}&rdquo;
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right description */}
          <div className={`transition-all duration-700 delay-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
              <Volume2 size={14} className="text-violet-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Sentiment Analysis</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-5">
              Know How Every Call{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Really Went</span>
            </h2>
            <p className="text-lg text-gray-500 leading-relaxed mb-8">
              AI analyzes every conversation in real time, detecting borrower sentiment, key phrases, and intent signals. Spot issues before they become problems.
            </p>
            <div className="space-y-4">
              {[
                'Real-time sentiment scoring during live calls',
                'Keyword and phrase extraction from transcriptions',
                'Trend analysis across all agent conversations',
                'Automated alerts for negative sentiment spikes',
              ].map(item => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center">
                    <CheckCircle2 size={12} className="text-violet-600" />
                  </div>
                  <span className="text-gray-600 text-[15px]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI Lead Scoring Panel
   ═══════════════════════════════════════════════════════════════════════════ */

function LeadScoringSection() {
  const { ref, visible } = useInView()

  const leads = [
    { name: 'TechFlow Inc.', contact: 'Sarah Mitchell', score: 94, risk: 'Low', revenue: '$85K', signals: ['High engagement', 'Financial docs ready', 'Multiple touchpoints'], trend: 'up' },
    { name: 'DataBridge Co.', contact: 'James Rodriguez', score: 76, risk: 'Medium', revenue: '$120K', signals: ['Moderate interest', 'Needs follow-up', 'Competitor evaluation'], trend: 'stable' },
    { name: 'CloudNine LLC', contact: 'Emily Chen', score: 52, risk: 'High', revenue: '$45K', signals: ['Low response rate', 'Budget concerns', 'Delayed documents'], trend: 'down' },
    { name: 'PayScale Corp', contact: 'David Alvarez', score: 88, risk: 'Low', revenue: '$250K', signals: ['Very responsive', 'Term sheet reviewed', 'Ready for proposal'], trend: 'up' },
  ]

  const riskConfig = {
    Low: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    Medium: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    High: { bg: 'bg-red-50', text: 'text-red-500', border: 'border-red-200' },
  }

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Target size={14} className="text-blue-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Lead Scoring</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Prioritize Deals with{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">AI-Powered Scores</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Machine learning analyzes dozens of signals to predict which deals will fund and which need attention.</p>
        </div>

        <div className={`max-w-4xl mx-auto transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-to-br from-blue-100/30 via-transparent to-violet-100/30 rounded-3xl blur-2xl pointer-events-none" />

            <div className="relative bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Brain size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">AI Lead Scores</h3>
                    <p className="text-[10px] text-gray-400">Updated every 30 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-md font-medium">Score Range: 0-100</span>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {leads.map((lead, i) => {
                  const riskStyle = riskConfig[lead.risk as keyof typeof riskConfig]
                  return (
                    <div
                      key={lead.name}
                      className={`px-6 py-5 hover:bg-gray-50/50 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                      style={{ transitionDelay: `${i * 120}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Score circle */}
                        <div className="relative flex-shrink-0">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{
                            background: `conic-gradient(${
                              lead.score >= 80 ? '#10B981' : lead.score >= 60 ? '#F59E0B' : '#EF4444'
                            } ${lead.score * 3.6}deg, #F3F4F6 0deg)`,
                            mask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 5px))',
                            WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 6px), #fff calc(100% - 5px))',
                          }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-lg font-extrabold text-gray-900">{lead.score}</span>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h4 className="text-sm font-bold text-gray-900">{lead.name}</h4>
                              <p className="text-[11px] text-gray-400">{lead.contact} - {lead.revenue}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${riskStyle.bg} ${riskStyle.border}`}>
                                <AlertTriangle size={10} className={riskStyle.text} />
                                <span className={`text-[10px] font-semibold ${riskStyle.text}`}>{lead.risk} Risk</span>
                              </div>
                              <div className={`flex items-center gap-0.5 ${
                                lead.trend === 'up' ? 'text-emerald-500' : lead.trend === 'down' ? 'text-red-500' : 'text-gray-400'
                              }`}>
                                {lead.trend === 'up' && <TrendingUp size={12} />}
                                {lead.trend === 'down' && <TrendingUp size={12} className="rotate-180" />}
                                {lead.trend === 'stable' && <Minus size={12} />}
                              </div>
                            </div>
                          </div>

                          {/* Score bar */}
                          <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-1000 ${
                                lead.score >= 80 ? 'bg-emerald-500' : lead.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: visible ? `${lead.score}%` : '0%', transitionDelay: `${i * 120 + 400}ms` }}
                            />
                          </div>

                          {/* Signals */}
                          <div className="flex flex-wrap gap-1">
                            {lead.signals.map(signal => (
                              <span key={signal} className="inline-flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                <Sparkles size={8} />
                                {signal}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI Coaching Cards
   ═══════════════════════════════════════════════════════════════════════════ */

function CoachingCards() {
  const { ref, visible } = useInView()

  const coachingItems = [
    {
      icon: MessageSquare,
      title: 'Improve Objection Handling',
      agent: 'James Rodriguez',
      suggestion: 'Your response to pricing objections averages 45 seconds. Top performers address concerns in under 20 seconds with a value-first approach. Try leading with ROI data before discussing pricing.',
      metric: '23% improvement potential',
      priority: 'High',
      color: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      icon: Clock,
      title: 'Optimize Call Timing',
      agent: 'Emily Chen',
      suggestion: 'Your connect rate is 42% below average. Data shows your best performing calls happen between 10am-12pm EST. Consider shifting your primary calling hours to match borrower availability patterns.',
      metric: '31% more connections',
      priority: 'Medium',
      color: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      borderColor: 'border-amber-200',
    },
    {
      icon: HeadphonesIcon,
      title: 'Increase Talk-to-Listen Ratio',
      agent: 'David Alvarez',
      suggestion: 'You currently speak 68% of the call time. Research shows a 40:60 talk-to-listen ratio correlates with 35% higher close rates. Practice active listening techniques and open-ended questions.',
      metric: '35% higher close rate',
      priority: 'Medium',
      color: 'from-emerald-500 to-teal-500',
      bgLight: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Lightbulb size={14} className="text-amber-500" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Coaching</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Personalized Coaching,{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Powered by AI</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">Every agent gets data-driven coaching suggestions based on their actual call performance and outcomes.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {coachingItems.map((item, i) => (
            <div
              key={item.title}
              className={`group bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              {/* Color bar */}
              <div className={`h-1 bg-gradient-to-r ${item.color}`} />

              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${item.bgLight} transition-transform duration-300 group-hover:scale-110`}>
                    <item.icon size={20} className={`bg-gradient-to-r ${item.color} bg-clip-text`} style={{ color: item.color.includes('blue') ? '#3B82F6' : item.color.includes('amber') ? '#F59E0B' : '#10B981' }} />
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.bgLight} ${item.borderColor} border`}
                    style={{ color: item.color.includes('blue') ? '#3B82F6' : item.color.includes('amber') ? '#F59E0B' : '#10B981' }}
                  >
                    {item.priority} Priority
                  </span>
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-[11px] text-gray-400 mb-3">Agent: {item.agent}</p>

                <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.suggestion}</p>

                {/* Metric */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <ArrowUpRight size={14} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-gray-700">{item.metric}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Features List
   ═══════════════════════════════════════════════════════════════════════════ */

function FeaturesList() {
  const { ref, visible } = useInView()

  const features = [
    { icon: Brain, title: 'Sentiment Analysis', desc: 'Real-time emotion detection across every call, with trend tracking and automated alerts for sentiment shifts.', iconBg: 'bg-violet-50 ring-violet-100', iconColor: 'text-violet-600' },
    { icon: Target, title: 'Predictive Lead Scoring', desc: 'ML models score every lead based on engagement signals, financial indicators, and historical conversion patterns.', iconBg: 'bg-blue-50 ring-blue-100', iconColor: 'text-blue-600' },
    { icon: Lightbulb, title: 'Agent Coaching', desc: 'Personalized improvement suggestions for every agent based on call performance, objection handling, and outcomes.', iconBg: 'bg-amber-50 ring-amber-100', iconColor: 'text-amber-600' },
    { icon: FileText, title: 'Call Summaries', desc: 'Automatic call transcription and AI-generated summaries with key action items, saving hours of manual note-taking.', iconBg: 'bg-emerald-50 ring-emerald-100', iconColor: 'text-emerald-600' },
    { icon: Activity, title: 'Risk Detection', desc: 'Early warning system that identifies at-risk deals based on communication patterns, delays, and sentiment trends.', iconBg: 'bg-red-50 ring-red-100', iconColor: 'text-red-500' },
    { icon: BarChart3, title: 'Performance Benchmarks', desc: 'Compare agent metrics against team averages and industry benchmarks to identify coaching opportunities.', iconBg: 'bg-pink-50 ring-pink-100', iconColor: 'text-pink-600' },
  ]

  return (
    <section ref={ref} className="py-24 lg:py-32 bg-gradient-to-b from-gray-50/80 via-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 lg:mb-20 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 shadow-sm mb-6">
            <Zap size={14} className="text-indigo-600" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">AI Features</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight mb-5">
            Intelligence at{' '}
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent">Every Touchpoint</span>
          </h2>
          <p className="text-lg text-gray-500 leading-relaxed">AI that works alongside your team -- analyzing, scoring, and coaching in real time.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group relative p-7 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${f.iconBg} ring-1 mb-5 transition-transform duration-300 group-hover:scale-110`}>
                <f.icon size={22} className={f.iconColor} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2.5">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function AiInsightsPage() {
  useEffect(() => { document.title = 'AI Insights | Balji' }, [])

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-x-hidden">
      <PublicHero
        pill="AI-Powered Insights"
        pillIcon={Brain}
        title="Smarter Decisions with"
        titleHighlight="Artificial Intelligence"
        subtitle="Sentiment analysis, predictive lead scoring, and personalized agent coaching -- all powered by machine learning trained on millions of financing conversations."
      />
      <SentimentPanel />
      <LeadScoringSection />
      <CoachingCards />
      <FeaturesList />
      <PublicCta />
    </div>
  )
}
