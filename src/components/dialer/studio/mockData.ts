// ─── DialerStudio — Dummy data (UI prototype only) ─────────────────────────────
import type {
  StudioCampaign,
  StudioLead,
  StudioAgent,
  StudioDisposition,
  StudioEvent,
  StudioNote,
} from './types'

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const MOCK_CAMPAIGNS: StudioCampaign[] = [
  {
    id: 1,
    name: 'Q2 SMB Outbound — USA',
    dialMethod: 'Predictive',
    ratio: 2.5,
    totalLeads: 4820,
    calledLeads: 1264,
    status: 'active',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    id: 2,
    name: 'Working Capital Renewals',
    dialMethod: 'Power',
    ratio: 1.5,
    totalLeads: 1280,
    calledLeads: 912,
    status: 'active',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 3,
    name: 'Insurance Follow-Up',
    dialMethod: 'Preview',
    ratio: 1,
    totalLeads: 620,
    calledLeads: 410,
    status: 'active',
    color: 'from-sky-500 to-blue-600',
  },
  {
    id: 4,
    name: 'Cold Prospects — Restaurants',
    dialMethod: 'Manual',
    ratio: 1,
    totalLeads: 3120,
    calledLeads: 85,
    status: 'paused',
    color: 'from-amber-500 to-orange-600',
  },
]

// ─── Leads (queue) ────────────────────────────────────────────────────────────
export const MOCK_LEADS: StudioLead[] = [
  {
    id: 1001,
    firstName: 'Marcus',
    lastName: 'Whitford',
    email: 'marcus.whitford@pillarfoods.co',
    phone: '+1 (415) 555-0142',
    mobile: '+1 (415) 555-0198',
    state: 'California',
    country: 'United States',
    company: 'Pillar Foods Distribution LLC',
    tags: ['Hot Lead', 'Renewal', 'VIP'],
    score: 92,
    lastContact: '2 days ago',
    customFields: [
      { key: 'industry', label: 'Industry', value: 'Food Distribution', type: 'text' },
      { key: 'monthly_revenue', label: 'Monthly Revenue', value: '$385,000', type: 'text' },
      { key: 'years_in_biz', label: 'Years in Business', value: '12', type: 'number' },
      { key: 'credit_score', label: 'Credit Score', value: '728', type: 'number' },
      { key: 'requested_amount', label: 'Requested Amount', value: '$150,000', type: 'text' },
      { key: 'source', label: 'Lead Source', value: 'Referral Partner', type: 'text' },
    ],
  },
  {
    id: 1002,
    firstName: 'Sienna',
    lastName: 'Park',
    email: 'sienna@luminaarc.com',
    phone: '+1 (212) 555-0170',
    state: 'New York',
    country: 'United States',
    company: 'Lumina Arc Studios',
    tags: ['New', 'Warm'],
    score: 74,
    lastContact: '—',
    customFields: [
      { key: 'industry', label: 'Industry', value: 'Creative Agency', type: 'text' },
      { key: 'employees', label: 'Employees', value: '24', type: 'number' },
    ],
  },
  {
    id: 1003,
    firstName: 'Darrell',
    lastName: 'Okoye',
    email: 'd.okoye@bluehaven.io',
    phone: '+1 (305) 555-0111',
    mobile: '+1 (305) 555-0122',
    state: 'Florida',
    country: 'United States',
    company: 'Blue Haven Logistics',
    tags: ['Callback'],
    score: 81,
    lastContact: 'Yesterday',
    customFields: [
      { key: 'industry', label: 'Industry', value: 'Logistics', type: 'text' },
      { key: 'fleet_size', label: 'Fleet Size', value: '48 trucks', type: 'text' },
      { key: 'monthly_revenue', label: 'Monthly Revenue', value: '$620,000', type: 'text' },
      { key: 'years_in_biz', label: 'Years in Business', value: '8', type: 'number' },
    ],
  },
]

// ─── Agents ───────────────────────────────────────────────────────────────────
export const MOCK_AGENTS: StudioAgent[] = [
  { id: 1, name: 'Priya Sharma',    extension: '1024', department: 'Sales — West',  status: 'available', avatar: 'PS' },
  { id: 2, name: 'James O\'Connor', extension: '1031', department: 'Sales — East',  status: 'available', avatar: 'JO' },
  { id: 3, name: 'Elena Martinez',  extension: '1045', department: 'Renewals',      status: 'busy',      avatar: 'EM' },
  { id: 4, name: 'Tomás Ribeiro',   extension: '1052', department: 'Underwriting',  status: 'available', avatar: 'TR' },
  { id: 5, name: 'Maya Bennett',    extension: '1067', department: 'Closers',       status: 'away',      avatar: 'MB' },
  { id: 6, name: 'Noah Kim',        extension: '1071', department: 'Sales — West',  status: 'available', avatar: 'NK' },
  { id: 7, name: 'Amelia Dubois',   extension: '1088', department: 'Retention',     status: 'offline',   avatar: 'AD' },
  { id: 8, name: 'Rahul Verma',     extension: '1094', department: 'Sales — East',  status: 'available', avatar: 'RV' },
]

// ─── Dispositions ─────────────────────────────────────────────────────────────
export const MOCK_DISPOSITIONS: StudioDisposition[] = [
  { id: 'interested',     label: 'Interested',          color: 'emerald', group: 'positive' },
  { id: 'callback',       label: 'Callback Scheduled',  color: 'sky',     group: 'positive' },
  { id: 'qualified',      label: 'Qualified',           color: 'violet',  group: 'positive' },
  { id: 'voicemail',      label: 'Voicemail Left',      color: 'amber',   group: 'neutral'  },
  { id: 'no_answer',      label: 'No Answer',           color: 'slate',   group: 'neutral'  },
  { id: 'busy',           label: 'Busy',                color: 'slate',   group: 'neutral'  },
  { id: 'wrong_number',   label: 'Wrong Number',        color: 'orange',  group: 'negative' },
  { id: 'not_interested', label: 'Not Interested',      color: 'rose',    group: 'negative' },
  { id: 'dnc',            label: 'Do Not Call',         color: 'red',     group: 'negative' },
]

// ─── Events timeline ─────────────────────────────────────────────────────────
export const MOCK_EVENTS: StudioEvent[] = [
  {
    id: 1, type: 'call', title: 'Outbound Call',
    description: 'Connected — discussed renewal terms and pricing.',
    timestamp: '2 days ago · 3:42 PM', agent: 'Priya Sharma', duration: '6m 12s',
  },
  {
    id: 2, type: 'email', title: 'Email Sent',
    description: 'Sent proposal draft with revised terms.',
    timestamp: '3 days ago · 11:08 AM', agent: 'Priya Sharma',
  },
  {
    id: 3, type: 'disposition', title: 'Callback Scheduled',
    description: 'Requested follow-up after Tuesday morning.',
    timestamp: '3 days ago · 11:02 AM', agent: 'Priya Sharma',
  },
  {
    id: 4, type: 'sms', title: 'SMS Sent',
    description: 'Confirmation text with meeting link.',
    timestamp: '5 days ago · 9:22 AM', agent: 'James O\'Connor',
  },
  {
    id: 5, type: 'note', title: 'Note Added',
    description: 'Decision-maker prefers mornings. Budget approved.',
    timestamp: '1 week ago',            agent: 'Elena Martinez',
  },
]

// ─── Notes ────────────────────────────────────────────────────────────────────
export const MOCK_NOTES: StudioNote[] = [
  {
    id: 1, author: 'Priya Sharma', avatar: 'PS',
    text: 'Spoke with Marcus. Decision maker confirmed. Needs proposal by Thursday. Sending revised pricing to CFO.',
    timestamp: '2 days ago',
  },
  {
    id: 2, author: 'Elena Martinez', avatar: 'EM',
    text: 'Previously a client in 2022. Strong payback history. Good candidate for renewal.',
    timestamp: '1 week ago',
  },
]

// ─── SMS templates ────────────────────────────────────────────────────────────
export const MOCK_SMS_TEMPLATES = [
  { id: 1, name: 'Intro — Cold Lead', body: 'Hi {first_name}, this is {agent} from Rocket. Would you have 2 minutes to chat about working capital for {company}?' },
  { id: 2, name: 'Callback Reminder', body: 'Hi {first_name}, just a reminder about our scheduled call tomorrow. Talk soon!' },
  { id: 3, name: 'Voicemail Follow-up', body: 'Hi {first_name}, sorry I missed you. Please call me back at your convenience.' },
]

// ─── Email templates ─────────────────────────────────────────────────────────
export const MOCK_EMAIL_TEMPLATES = [
  { id: 1, name: 'Proposal Draft',   subject: 'Your proposal from Rocket',       body: 'Hi {first_name},\n\nPlease find attached the proposal we discussed…' },
  { id: 2, name: 'Follow-up #1',     subject: 'Following up on our conversation', body: 'Hi {first_name},\n\nJust following up on our conversation…' },
  { id: 3, name: 'Meeting Confirmation', subject: 'Confirming our meeting',     body: 'Hi {first_name},\n\nConfirming our meeting for…' },
]

// ─── Script ───────────────────────────────────────────────────────────────────
export const MOCK_SCRIPT = `Hi, may I speak with {{first_name}} please?

Hi {{first_name}}, my name is {{agent_name}} and I'm calling from Rocket Capital. I understand you're the owner of {{company}}, is that correct?

The reason for my call is that we specialize in helping businesses like yours secure working capital — typically between $25K and $500K — with funding in as little as 24 hours.

I'd love to quickly understand your current financing situation:

1. Are you currently working with any capital providers?
2. What kind of amount would make a real difference for {{company}} right now?
3. How's your average monthly revenue looking over the past 6 months?

[LISTEN CAREFULLY — Take notes]

Based on what you've shared, I believe we could structure something that works really well for you. Would it be okay if I sent over a quick application — it takes about 2 minutes — and we could have funds in your account by the end of the week?`
