import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Settings, X, Eye, EyeOff, Loader2, Power, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  integrationConfigService,
  PROVIDER_META,
  type IntegrationConfigRow,
  type ProviderMeta,
  type ProviderField,
} from '../../services/integrationConfig.service'
import { useCrmHeader } from '../../layouts/CrmLayout'
import { cn } from '../../utils/cn'

// ── Main page ────────────────────────────────────────────────────────────────────

export function CrmIntegrations() {
  useCrmHeader()

  const qc = useQueryClient()
  const [modalProvider, setModalProvider] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['integration-configs'],
    queryFn: async () => {
      const res = await integrationConfigService.getAll()
      return (res.data?.data ?? []) as IntegrationConfigRow[]
    },
  })

  const toggleMut = useMutation({
    mutationFn: (id: number) => integrationConfigService.toggle(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['integration-configs'] })
      toast.success(res.data?.message ?? 'Toggled')
    },
    onError: () => toast.error('Failed to toggle'),
  })

  const configs = data ?? []
  const meta = PROVIDER_META

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading integrations…
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {meta.map((pm) => {
          const cfg = configs.find((c) => c.provider === pm.slug)
          const isConfigured = !!cfg?.id
          return (
            <IntegrationCard
              key={pm.slug}
              meta={pm}
              config={cfg ?? null}
              isConfigured={isConfigured}
              onConfigure={() => setModalProvider(pm.slug)}
              onToggle={() => cfg?.id && toggleMut.mutate(cfg.id)}
            />
          )
        })}
      </div>

      {modalProvider && (
        <ConfigModal
          provider={modalProvider}
          config={configs.find((c) => c.provider === modalProvider) ?? null}
          onClose={() => setModalProvider(null)}
        />
      )}
    </>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────────

function IntegrationCard({
  meta,
  config,
  isConfigured,
  onConfigure,
  onToggle,
}: {
  meta: ProviderMeta
  config: IntegrationConfigRow | null
  isConfigured: boolean
  onConfigure: () => void
  onToggle: () => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 hover:shadow-sm transition-shadow">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-sm shrink-0', meta.color)}>
          {meta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{meta.label}</h3>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{meta.description}</p>
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex items-center justify-between mt-auto">
        <span
          className={cn(
            'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
            isConfigured
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-slate-100 text-slate-500',
          )}
        >
          {isConfigured ? 'Connected' : 'Not Configured'}
        </span>

        <div className="flex items-center gap-2">
          {isConfigured && (
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                config?.is_enabled
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-400 hover:bg-slate-100',
              )}
              title={config?.is_enabled ? 'Disable' : 'Enable'}
            >
              <Power className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Configure
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Config Modal ─────────────────────────────────────────────────────────────────

function ConfigModal({
  provider,
  config,
  onClose,
}: {
  provider: string
  config: IntegrationConfigRow | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const meta = PROVIDER_META.find((p) => p.slug === provider)!
  const isEdit = !!config?.id

  // Build initial form state from meta fields
  const buildInitial = (): Record<string, string> => {
    const init: Record<string, string> = {}
    for (const f of meta.fields) {
      if (f.target === 'extra_config' && f.extraKey) {
        init[f.key] = config?.extra_config?.[f.extraKey] ?? ''
      } else if (f.target === 'api_key' || f.target === 'api_secret') {
        init[f.key] = '' // never pre-fill secrets
      } else if (f.target === 'endpoint_url') {
        init[f.key] = config?.endpoint_url ?? ''
      } else {
        init[f.key] = ''
      }
    }
    return init
  }

  const [form, setForm] = useState(buildInitial)
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { provider }
      const extra: Record<string, string> = { ...(config?.extra_config ?? {}) }

      for (const f of meta.fields) {
        const val = form[f.key]
        if (f.target === 'api_key' || f.target === 'api_secret') {
          if (val) payload[f.target] = val // blank = keep existing
        } else if (f.target === 'endpoint_url') {
          payload.endpoint_url = val
        } else if (f.target === 'extra_config' && f.extraKey) {
          if (val !== undefined) extra[f.extraKey] = val
        }
      }

      payload.extra_config = extra
      return integrationConfigService.upsert(payload)
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['integration-configs'] })
      toast.success(res.data?.message ?? 'Saved')
      onClose()
    },
    onError: () => toast.error('Failed to save configuration'),
  })

  const deleteMut = useMutation({
    mutationFn: () => integrationConfigService.destroy(config!.id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['integration-configs'] })
      toast.success('Disconnected')
      onClose()
    },
    onError: () => toast.error('Failed to disconnect'),
  })

  const handleDisconnect = () => {
    if (window.confirm(`Disconnect ${meta.label}? This will remove all stored credentials.`)) {
      deleteMut.mutate()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={cn('flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-xs', meta.color)}>
              {meta.icon}
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              {isEdit ? 'Update' : 'Configure'} {meta.label}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {meta.fields.map((f) => (
            <FieldInput
              key={f.key}
              field={f}
              value={form[f.key] ?? ''}
              showPassword={!!showPw[f.key]}
              isEdit={isEdit}
              onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              onTogglePassword={() => setShowPw((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
          <div>
            {isEdit && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={deleteMut.isPending}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 px-3 py-2 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Disconnect
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Field renderer ───────────────────────────────────────────────────────────────

function FieldInput({
  field,
  value,
  showPassword,
  isEdit,
  onChange,
  onTogglePassword,
}: {
  field: ProviderField
  value: string
  showPassword: boolean
  isEdit: boolean
  onChange: (v: string) => void
  onTogglePassword: () => void
}) {
  const isSecret = field.type === 'password'

  if (field.type === 'select' && field.options) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
        >
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
      <div className="relative">
        <input
          type={isSecret && !showPassword ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-10"
        />
        {isSecret && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
      {isSecret && isEdit && (
        <p className="text-xs text-slate-400 mt-1">Leave blank to keep the existing value.</p>
      )}
    </div>
  )
}
