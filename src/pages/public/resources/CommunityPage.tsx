import { useEffect } from 'react'
import {
  Users, MessageCircle, Github, Globe, Heart,
  ArrowRight, ExternalLink, MessageSquare, Star,
  TrendingUp, Award, MapPin,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const channels = [
  {
    name: 'Discord',
    icon: MessageCircle,
    members: '4,200+',
    description: 'Join our active Discord server for real-time help, feature discussions, and community events. Get answers from the team and power users.',
    buttonText: 'Join Discord',
    buttonLink: '#',
    gradient: 'from-indigo-500 to-violet-600',
    lightBg: 'bg-indigo-50',
    lightText: 'text-indigo-600',
    highlights: ['Real-time support', 'Weekly office hours', 'Feature voting'],
  },
  {
    name: 'GitHub',
    icon: Github,
    members: '1,800+',
    description: 'Star our repos, report bugs, request features, and contribute to our open-source SDKs and integration libraries.',
    buttonText: 'View GitHub',
    buttonLink: '#',
    gradient: 'from-gray-700 to-gray-900',
    lightBg: 'bg-gray-100',
    lightText: 'text-gray-700',
    highlights: ['Open-source SDKs', 'Issue tracker', 'Pull requests welcome'],
  },
  {
    name: 'Forum',
    icon: MessageSquare,
    members: '6,500+',
    description: 'Browse and participate in long-form discussions, tutorials, and knowledge-sharing threads from the Balji community.',
    buttonText: 'Visit Forum',
    buttonLink: '#',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    lightText: 'text-emerald-600',
    highlights: ['Best practices', 'Use case examples', 'Community tutorials'],
  },
]

const communityStats = [
  { icon: Users, label: 'Members', value: '12,500+', description: 'Active community members worldwide' },
  { icon: Heart, label: 'Contributions', value: '3,400+', description: 'Community contributions this year' },
  { icon: MessageSquare, label: 'Discussions', value: '8,200+', description: 'Forum threads and Discord messages' },
  { icon: MapPin, label: 'Countries', value: '45+', description: 'Countries represented in our community' },
]

const latestDiscussions = [
  {
    title: 'Best practices for high-volume predictive dialer campaigns',
    replies: 42,
    authorInitials: 'SM',
    authorGradient: 'from-blue-500 to-indigo-600',
    time: '2 hours ago',
    tags: ['Campaigns', 'Best Practices'],
  },
  {
    title: 'How we integrated Balji with our custom Salesforce workflow',
    replies: 28,
    authorInitials: 'JR',
    authorGradient: 'from-emerald-500 to-teal-500',
    time: '5 hours ago',
    tags: ['Integration', 'Salesforce'],
  },
  {
    title: 'Webhook payload reference: handling call.completed events',
    replies: 19,
    authorInitials: 'EC',
    authorGradient: 'from-violet-500 to-purple-500',
    time: '1 day ago',
    tags: ['API', 'Webhooks'],
  },
  {
    title: 'Tips for improving agent connect rates above 70%',
    replies: 56,
    authorInitials: 'DA',
    authorGradient: 'from-amber-500 to-orange-500',
    time: '1 day ago',
    tags: ['Dialer', 'Performance'],
  },
  {
    title: 'Custom analytics dashboard with the new Reports API',
    replies: 34,
    authorInitials: 'LP',
    authorGradient: 'from-pink-500 to-rose-500',
    time: '2 days ago',
    tags: ['Analytics', 'API'],
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export function CommunityPage() {
  useEffect(() => { document.title = 'Community | Balji' }, [])

  const channelsSection = useInView()
  const statsSection = useInView()
  const discussionsSection = useInView()

  return (
    <div className="min-h-screen bg-white">
      <PublicHero
        pill="Join the Community"
        pillIcon={Users}
        title="Community &"
        titleHighlight="Collaboration"
        subtitle="Connect with thousands of finance professionals, share best practices, and help shape the future of Balji."
      />

      {/* ── Channel Cards ── */}
      <section ref={channelsSection.ref} className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${channelsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Where to Find Us
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Pick your preferred platform and start engaging with the Balji community today.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel, i) => (
              <div
                key={channel.name}
                className={`group bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${channelsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 120}ms` }}
              >
                {/* Gradient header */}
                <div className={`bg-gradient-to-br ${channel.gradient} p-6 pb-8`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <channel.icon size={24} className="text-white" />
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-bold text-white">
                      {channel.members} members
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white">{channel.name}</h3>
                </div>

                {/* Body */}
                <div className="p-6 -mt-3">
                  <p className="text-sm text-gray-500 leading-relaxed mb-5">{channel.description}</p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    {channel.highlights.map((h) => (
                      <span key={h} className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-gray-200 shadow-sm ${channel.lightBg} ${channel.lightText}`}>
                        {h}
                      </span>
                    ))}
                  </div>

                  <a
                    href={channel.buttonLink}
                    className={`group/btn inline-flex items-center gap-2.5 w-full justify-center px-6 py-3.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r ${channel.gradient} shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300`}
                  >
                    {channel.buttonText}
                    <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Community Stats ── */}
      <section ref={statsSection.ref} className="py-24 lg:py-32 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${statsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Community by the Numbers
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A growing ecosystem of finance professionals building together.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {communityStats.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-white border border-gray-100 shadow-sm rounded-2xl p-7 text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${statsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 mb-5">
                  <stat.icon size={26} className="text-indigo-600" />
                </div>
                <div className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 bg-clip-text text-transparent mb-1">
                  {stat.value}
                </div>
                <div className="text-base font-bold text-gray-900 mb-1">{stat.label}</div>
                <div className="text-sm text-gray-500">{stat.description}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Discussions ── */}
      <section ref={discussionsSection.ref} className="py-24 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-700 ${discussionsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
              Latest Discussions
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              See what the community is talking about. Jump in and share your expertise.
            </p>
          </div>

          <div className="space-y-4">
            {latestDiscussions.map((discussion, i) => (
              <a
                key={discussion.title}
                href="#"
                className={`group flex items-center gap-4 bg-white border border-gray-100 shadow-sm rounded-2xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${discussionsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {/* Author avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${discussion.authorGradient} flex items-center justify-center shadow-md`}>
                  <span className="text-white text-xs font-bold">{discussion.authorInitials}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                    {discussion.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1">
                      {discussion.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-white border border-gray-200 shadow-sm text-[10px] font-medium text-gray-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">{discussion.time}</span>
                  </div>
                </div>

                {/* Replies badge */}
                <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm">
                  <MessageCircle size={13} className="text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600">{discussion.replies}</span>
                </div>
              </a>
            ))}
          </div>

          <div className={`mt-10 text-center transition-all duration-700 delay-500 ${discussionsSection.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <a href="#" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              View All Discussions
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <PublicCta />
    </div>
  )
}
