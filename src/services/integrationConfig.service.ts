import api from '../api/axios'

// ── Types ───────────────────────────────────────────────────────────────────────

export interface IntegrationConfigRow {
  id: number | null
  provider: string
  has_api_key: boolean
  has_api_secret: boolean
  endpoint_url: string | null
  extra_config: Record<string, string> | null
  is_enabled: boolean
  configured_by: number | null
  created_at: string | null
  updated_at: string | null
}

export interface ProviderField {
  key: string
  label: string
  type: 'text' | 'password' | 'select'
  target: 'api_key' | 'api_secret' | 'endpoint_url' | 'extra_config'
  extraKey?: string          // nested key inside extra_config JSON
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface ProviderMeta {
  slug: string
  label: string
  description: string
  icon: string   // emoji or short code for the card
  color: string  // tailwind bg color class
  fields: ProviderField[]
}

// ── Provider metadata (single source of truth) ─────────────────────────────────

export const PROVIDER_META: ProviderMeta[] = [
  {
    slug: 'balji',
    label: 'Balji',
    description: 'Business verification and compliance checks.',
    icon: 'B',
    color: 'bg-blue-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', target: 'api_key', placeholder: 'Enter API key' },
    ],
  },
  {
    slug: 'datamerch',
    label: 'Datamerch',
    description: 'Merchant cash advance industry database.',
    icon: 'D',
    color: 'bg-violet-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', target: 'api_key', placeholder: 'Enter API key' },
    ],
  },
  {
    slug: 'experian',
    label: 'Experian',
    description: 'Credit bureau reports and business credit data.',
    icon: 'E',
    color: 'bg-red-600',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', target: 'extra_config', extraKey: 'client_id', placeholder: 'Enter Client ID' },
      { key: 'api_secret', label: 'Client Secret', type: 'password', target: 'api_secret', placeholder: 'Enter Client Secret' },
      {
        key: 'environment', label: 'Environment', type: 'select', target: 'extra_config', extraKey: 'environment',
        options: [{ value: 'sandbox', label: 'Sandbox' }, { value: 'production', label: 'Production' }],
      },
    ],
  },
  {
    slug: 'persona',
    label: 'Persona',
    description: 'Identity verification and KYC compliance.',
    icon: 'P',
    color: 'bg-emerald-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', target: 'api_key', placeholder: 'Enter API key' },
      { key: 'template_id', label: 'Template ID', type: 'text', target: 'extra_config', extraKey: 'template_id', placeholder: 'Enter template ID' },
    ],
  },
  {
    slug: 'plaid',
    label: 'Plaid',
    description: 'Bank account verification and financial data.',
    icon: 'PL',
    color: 'bg-black',
    fields: [
      { key: 'client_id', label: 'Client ID', type: 'text', target: 'extra_config', extraKey: 'client_id', placeholder: 'Enter Client ID' },
      { key: 'api_secret', label: 'Secret', type: 'password', target: 'api_secret', placeholder: 'Enter Secret' },
      {
        key: 'environment', label: 'Environment', type: 'select', target: 'extra_config', extraKey: 'environment',
        options: [{ value: 'sandbox', label: 'Sandbox' }, { value: 'development', label: 'Development' }, { value: 'production', label: 'Production' }],
      },
    ],
  },
  {
    slug: 'ucc_filings',
    label: 'UCC Filings',
    description: 'Uniform Commercial Code filing searches.',
    icon: 'U',
    color: 'bg-amber-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', target: 'api_key', placeholder: 'Enter API key' },
    ],
  },
  {
    slug: 'tracer',
    label: 'Tracer',
    description: 'Skip tracing and contact data enrichment.',
    icon: 'T',
    color: 'bg-cyan-600',
    fields: [
      { key: 'api_key', label: 'API Key', type: 'password', target: 'api_key', placeholder: 'Enter API key' },
      { key: 'account_id', label: 'Account ID', type: 'text', target: 'extra_config', extraKey: 'account_id', placeholder: 'Enter Account ID' },
    ],
  },
  {
    slug: 'pacer',
    label: 'PACER',
    description: 'Federal court records and bankruptcy filings.',
    icon: 'PA',
    color: 'bg-slate-700',
    fields: [
      { key: 'username', label: 'Username', type: 'text', target: 'extra_config', extraKey: 'username', placeholder: 'PACER username' },
      { key: 'password', label: 'Password', type: 'password', target: 'extra_config', extraKey: 'password', placeholder: 'PACER password' },
      { key: 'client_code', label: 'Client Code', type: 'text', target: 'extra_config', extraKey: 'client_code', placeholder: 'Enter Client Code' },
    ],
  },
  {
    slug: 'easify_bank_analysis',
    label: 'Balji Bank Analysis',
    description: 'AI-powered bank statement analysis, fraud detection, and MCA identification.',
    icon: 'BA',
    color: 'bg-teal-600',
    fields: [
      { key: 'email', label: 'Balji Email', type: 'text', target: 'api_key', placeholder: 'your@email.com' },
      { key: 'password', label: 'Balji Password', type: 'password', target: 'api_secret', placeholder: 'Enter password' },
      {
        key: 'model_tier', label: 'Default Model Tier', type: 'select', target: 'extra_config', extraKey: 'model_tier',
        options: [
          { value: 'lsc_basic', label: 'LSC Basic (Fastest)' },
          { value: 'lsc_pro', label: 'LSC Pro (Balanced)' },
          { value: 'lsc_max', label: 'LSC Max (Most Accurate)' },
        ],
      },
    ],
  },
]

// ── API service ─────────────────────────────────────────────────────────────────

export const integrationConfigService = {
  getAll: () =>
    api.get<{ success: boolean; data: IntegrationConfigRow[] }>('/crm/integration-configs'),

  upsert: (data: Record<string, unknown>) =>
    api.post<{ success: boolean; data: IntegrationConfigRow; message: string }>('/crm/integration-configs', data),

  toggle: (id: number) =>
    api.post<{ success: boolean; data: IntegrationConfigRow; message: string }>(`/crm/integration-configs/${id}/toggle`),

  destroy: (id: number) =>
    api.delete<{ success: boolean; message: string }>(`/crm/integration-configs/${id}`),
}
