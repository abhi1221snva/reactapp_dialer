import { useEffect, useState } from 'react'
import {
  BookOpen, ArrowRight, Clock, User, Tag,
  ChevronRight, Zap, Code2, Users, Building2, Layers,
} from 'lucide-react'
import { useInView } from '../../../hooks/useInView'
import { PublicHero } from '../../../components/public/PublicHero'
import { PublicCta } from '../../../components/public/PublicCta'

/* ═══════════════════════════════════════════════════════════════════════════
   Data
   ═══════════════════════════════════════════════════════════════════════════ */

const categories = [
  { label: 'All', icon: Layers },
  { label: 'Product', icon: Zap },
  { label: 'Engineering', icon: Code2 },
  { label: 'Customer Stories', icon: Users },
  { label: 'Industry', icon: Building2 },
]

const featuredPost = {
  category: 'Product',
  categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
  title: 'Introducing AI-Powered Call Coaching: Real-Time Feedback for Your Team',
  excerpt: 'Today we\'re launching our most requested feature yet. AI Call Coaching listens to live conversations and provides agents with real-time suggestions, objection handling tips, and compliance alerts -- all without interrupting the call. Early beta customers are seeing a 28% improvement in close rates within the first 30 days.',
  author: 'Maria Santos',
  authorInitials: 'MS',
  authorGradient: 'from-pink-500 to-rose-600',
  role: 'VP Product',
  date: 'April 28, 2026',
  readTime: '8 min read',
}

const posts = [
  {
    category: 'Engineering',
    categoryColor: 'bg-violet-50 text-violet-700 border-violet-200',
    title: 'How We Scaled Our Telephony Infrastructure to 1M+ Concurrent Calls',
    excerpt: 'A deep dive into our migration from monolithic SIP trunks to a distributed, region-aware telephony mesh that handles peak loads gracefully.',
    date: 'April 21, 2026',
    readTime: '12 min read',
  },
  {
    category: 'Customer Stories',
    categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'How CapitalBridge Increased Close Rates by 41% with Balji',
    excerpt: 'CapitalBridge\'s VP of Operations shares how switching to Balji\'s unified platform eliminated tool sprawl and transformed their team\'s productivity.',
    date: 'April 14, 2026',
    readTime: '6 min read',
  },
  {
    category: 'Industry',
    categoryColor: 'bg-amber-50 text-amber-700 border-amber-200',
    title: 'The State of Business Financing in 2026: Trends and Predictions',
    excerpt: 'Alternative business financing is growing 3x faster than traditional lending. We break down the market dynamics, regulatory shifts, and technology trends shaping the industry.',
    date: 'April 7, 2026',
    readTime: '10 min read',
  },
  {
    category: 'Product',
    categoryColor: 'bg-blue-50 text-blue-700 border-blue-200',
    title: 'Multi-Channel Drip Campaigns: Automate Your Merchant Outreach',
    excerpt: 'New in Balji: build automated sequences that combine voice, SMS, and email into cohesive merchant journeys with smart timing and personalization.',
    date: 'March 31, 2026',
    readTime: '5 min read',
  },
  {
    category: 'Engineering',
    categoryColor: 'bg-violet-50 text-violet-700 border-violet-200',
    title: 'Building Real-Time Sentiment Analysis for Financial Conversations',
    excerpt: 'Our ML team shares the challenges and breakthroughs behind training NLP models that understand the nuances of business financing conversations.',
    date: 'March 24, 2026',
    readTime: '15 min read',
  },
  {
    category: 'Customer Stories',
    categoryColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    title: 'From Spreadsheets to Balji: CapitalPulse\'s Digital Transformation',
    excerpt: 'CapitalPulse\'s COO walks us through their 90-day migration from legacy tools to Balji, and the surprising impact on agent satisfaction scores.',
    date: 'March 17, 2026',
    readTime: '7 min read',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   Sections
   ═══════════════════════════════════════════════════════════════════════════ */

function FeaturedPostSection() {
  const { ref, visible } = useInView()

  return (
    <section ref={ref} className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <a
          href="#"
          className={`group block bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
        >
          <div className="grid lg:grid-cols-2 gap-0">
            {/* Left - Visual */}
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-10 lg:p-14 flex items-center min-h-[320px]">
              <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-bl from-blue-500/20 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-gradient-to-tr from-emerald-500/15 to-transparent rounded-full blur-3xl" />
              <div className="relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-white/80 border border-white/10 mb-4">
                  <Tag size={12} />
                  Featured Post
                </span>
                <div className="flex items-center gap-4 mt-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
                    <Zap size={36} className="text-white" />
                  </div>
                  <div>
                    <div className="text-white/60 text-sm font-medium">New Feature</div>
                    <div className="text-white text-xl font-bold">AI Call Coaching</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Content */}
            <div className="p-8 lg:p-12 flex flex-col justify-center">
              <span className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold border ${featuredPost.categoryColor} mb-4`}>
                {featuredPost.category}
              </span>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 tracking-tight mb-4 group-hover:text-indigo-600 transition-colors">
                {featuredPost.title}
              </h2>
              <p className="text-gray-500 leading-relaxed mb-6">
                {featuredPost.excerpt}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${featuredPost.authorGradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-white text-sm font-bold">{featuredPost.authorInitials}</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{featuredPost.author}</div>
                    <div className="text-xs text-gray-400">{featuredPost.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {featuredPost.readTime}
                  </span>
                  <span>{featuredPost.date}</span>
                </div>
              </div>
            </div>
          </div>
        </a>
      </div>
    </section>
  )
}

function CategoryFilter({ active, onChange }: { active: string; onChange: (c: string) => void }) {
  const { ref, visible } = useInView()

  return (
    <div ref={ref} className={`transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {categories.map((cat) => (
            <button
              key={cat.label}
              onClick={() => onChange(cat.label)}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                active === cat.label
                  ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/10'
                  : 'bg-white text-gray-600 border border-gray-200 shadow-sm hover:border-gray-300 hover:text-gray-900'
              }`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function PostsGrid({ activeCategory }: { activeCategory: string }) {
  const { ref, visible } = useInView()

  const filteredPosts = activeCategory === 'All'
    ? posts
    : posts.filter((p) => p.category === activeCategory)

  return (
    <section ref={ref} className="py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No posts in this category yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post, i) => (
              <a
                key={post.title}
                href="#"
                className={`group flex flex-col bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {/* Card top accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

                <div className="p-6 flex flex-col flex-1">
                  <span className={`inline-flex items-center self-start px-3 py-1 rounded-full text-xs font-semibold border ${post.categoryColor} mb-4`}>
                    {post.category}
                  </span>

                  <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
                    {post.excerpt}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {post.readTime}
                      </span>
                      <span>{post.date}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      Read
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Page Export
   ═══════════════════════════════════════════════════════════════════════════ */

export function BlogPage() {
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    document.title = 'Blog | Balji'
  }, [])

  return (
    <>
      <PublicHero
        pill="Balji Blog"
        pillIcon={BookOpen}
        title="Insights, Updates &"
        titleHighlight="Industry Perspectives"
        subtitle="Product announcements, engineering deep dives, customer success stories, and expert analysis on the future of business financing."
      />
      <FeaturedPostSection />
      <CategoryFilter active={activeCategory} onChange={setActiveCategory} />
      <PostsGrid activeCategory={activeCategory} />
      <PublicCta
        title="Stay in the Loop"
        subtitle="Get the latest product updates, industry insights, and Balji news delivered to your inbox every week."
      />
    </>
  )
}
