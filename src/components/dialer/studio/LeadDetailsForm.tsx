import { useState } from 'react'
import {
  User, Mail, Phone, MapPin, Building2, Globe, Copy, Check, Edit3, Save, X,
  Star, Sparkles, Plus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '../../../utils/cn'
import type { StudioLead, LeadField } from './types'

interface Props {
  lead: StudioLead
  onUpdate: (lead: StudioLead) => void
}

// ─── Core (fixed) fields — always shown in primary grid ──────────────────────
const CORE_FIELDS: { key: keyof StudioLead; label: string; icon: React.ElementType; type: 'text' | 'email' | 'tel'; copyable?: boolean }[] = [
  { key: 'firstName', label: 'First Name', icon: User,      type: 'text'  },
  { key: 'lastName',  label: 'Last Name',  icon: User,      type: 'text'  },
  { key: 'email',     label: 'Email',      icon: Mail,      type: 'email', copyable: true },
  { key: 'phone',     label: 'Phone',      icon: Phone,     type: 'tel',   copyable: true },
  { key: 'state',     label: 'State',      icon: MapPin,    type: 'text'  },
  { key: 'country',   label: 'Country',    icon: Globe,     type: 'text'  },
  { key: 'company',   label: 'Company',    icon: Building2, type: 'text'  },
]

/**
 * Compact inline-editable lead form.
 * Color palette: slate base + indigo accent + soft emerald for success.
 */
export function LeadDetailsForm({ lead, onUpdate }: Props) {
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [globalEdit, setGlobalEdit] = useState(false)

  const beginEdit = (key: string, current: string) => {
    setEditingKey(key)
    setEditValue(current)
  }
  const cancelEdit = () => {
    setEditingKey(null)
    setEditValue('')
  }
  const saveCore = (key: keyof StudioLead) => {
    onUpdate({ ...lead, [key]: editValue })
    toast.success('Updated', { duration: 1400 })
    cancelEdit()
  }
  const saveCustom = (key: string) => {
    onUpdate({
      ...lead,
      customFields: lead.customFields.map((f) =>
        f.key === key ? { ...f, value: editValue } : f,
      ),
    })
    toast.success('Updated', { duration: 1400 })
    cancelEdit()
  }

  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      setTimeout(() => setCopied(null), 1400)
    } catch {
      toast.error('Copy failed')
    }
  }

  const initials = `${lead.firstName[0] ?? ''}${lead.lastName[0] ?? ''}`.toUpperCase()

  return (
    <div className="space-y-3 animate-fadeIn">
      {/* ─── Compact horizontal hero ────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
            {initials || '?'}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white" />
        </div>

        {/* Name + company */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[15px] font-bold text-slate-900 leading-tight truncate">
              {lead.firstName} {lead.lastName}
            </h2>
            {lead.score !== undefined && (
              <span className="inline-flex items-center gap-0.5 px-1.5 h-[18px] rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/60">
                <Star size={9} className="fill-amber-500 text-amber-500" />
                {lead.score}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            <span className="font-medium text-slate-600">{lead.company}</span>
            <span className="mx-1 text-slate-300">·</span>
            {lead.state}, {lead.country}
          </p>
        </div>

        {/* Tags inline */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {lead.tags?.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 h-[20px] inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold border border-indigo-100"
            >
              {tag}
            </span>
          ))}
          {(lead.tags?.length ?? 0) > 2 && (
            <span className="px-1.5 h-[20px] inline-flex items-center rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
              +{(lead.tags?.length ?? 0) - 2}
            </span>
          )}
        </div>

        {/* Edit toggle */}
        <button
          onClick={() => setGlobalEdit((v) => !v)}
          className={cn(
            'shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-[11px] font-semibold transition-colors border',
            globalEdit
              ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300',
          )}
        >
          {globalEdit ? <><X size={11} /> Done</> : <><Edit3 size={11} /> Edit</>}
        </button>
      </div>

      {/* ─── Contact fields ──────────────────────────────────── */}
      <FieldSection
        icon={User}
        iconColor="text-indigo-500"
        title="Contact Information"
        count={CORE_FIELDS.length}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {CORE_FIELDS.map((f) => {
            const current = String(lead[f.key] ?? '')
            const isEditing = editingKey === f.key
            return (
              <InlineField
                key={f.key}
                icon={f.icon}
                label={f.label}
                value={current}
                isEditing={isEditing}
                editValue={editValue}
                setEditValue={setEditValue}
                type={f.type}
                copyable={f.copyable}
                copied={copied === f.key}
                onCopy={() => copy(current, f.key)}
                onBeginEdit={() => beginEdit(f.key, current)}
                onCancelEdit={cancelEdit}
                onSave={() => saveCore(f.key)}
                forceEdit={globalEdit}
              />
            )
          })}
        </div>
      </FieldSection>

      {/* ─── Custom/dynamic fields ───────────────────────────── */}
      {lead.customFields.length > 0 && (
        <FieldSection
          icon={Sparkles}
          iconColor="text-violet-500"
          title="Custom Fields"
          count={lead.customFields.length}
          action={
            <button className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
              <Plus size={11} /> Add
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lead.customFields.map((f: LeadField) => {
              const isEditing = editingKey === `custom:${f.key}`
              return (
                <InlineField
                  key={f.key}
                  icon={Sparkles}
                  label={f.label}
                  value={f.value}
                  isEditing={isEditing}
                  editValue={editValue}
                  setEditValue={setEditValue}
                  type="text"
                  onBeginEdit={() => beginEdit(`custom:${f.key}`, f.value)}
                  onCancelEdit={cancelEdit}
                  onSave={() => saveCustom(f.key)}
                  forceEdit={globalEdit}
                />
              )
            })}
          </div>
        </FieldSection>
      )}
    </div>
  )
}

// ─── Section wrapper (compact) ──────────────────────────────────────────────
interface FieldSectionProps {
  icon: React.ElementType
  iconColor: string
  title: string
  count: number
  action?: React.ReactNode
  children: React.ReactNode
}

function FieldSection({ icon: Icon, iconColor, title, count, action, children }: FieldSectionProps) {
  return (
    <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50/40">
        <div className="flex items-center gap-1.5">
          <Icon size={12} className={iconColor} />
          <h3 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            {title}
          </h3>
          <span className="text-[10px] font-bold text-slate-400">{count}</span>
        </div>
        {action}
      </div>
      <div className="p-2">{children}</div>
    </div>
  )
}

// ─── Inline editable field (compact) ────────────────────────────────────────
interface InlineFieldProps {
  icon: React.ElementType
  label: string
  value: string
  isEditing: boolean
  editValue: string
  setEditValue: (v: string) => void
  type: string
  copyable?: boolean
  copied?: boolean
  onCopy?: () => void
  onBeginEdit: () => void
  onCancelEdit: () => void
  onSave: () => void
  forceEdit?: boolean
}

function InlineField({
  icon: Icon, label, value, isEditing, editValue, setEditValue, type,
  copyable, copied, onCopy, onBeginEdit, onCancelEdit, onSave, forceEdit,
}: InlineFieldProps) {
  const active = isEditing || forceEdit

  return (
    <div className={cn(
      'group relative flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all',
      active
        ? 'border-indigo-400 bg-indigo-50/50 shadow-[0_0_0_2px_rgba(99,102,241,0.08)]'
        : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/20',
    )}>
      <Icon
        size={11}
        className={cn(
          'shrink-0 transition-colors',
          active ? 'text-indigo-500' : 'text-slate-400 group-hover:text-indigo-500',
        )}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
          {label}
        </p>
        {isEditing ? (
          <input
            type={type}
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancelEdit()
            }}
            className="w-full bg-transparent border-none outline-none text-[12px] font-semibold text-slate-900 mt-0.5 p-0 leading-tight"
          />
        ) : (
          <p
            onClick={onBeginEdit}
            className={cn(
              'text-[12px] font-semibold text-slate-800 mt-0.5 truncate cursor-text leading-tight transition-colors',
              !value && 'text-slate-300',
              'group-hover:text-indigo-700',
            )}
            title={value}
          >
            {value || 'Not set'}
          </p>
        )}
      </div>

      {/* Action cluster */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {isEditing ? (
          <>
            <button
              onClick={onSave}
              className="p-1 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
              title="Save (Enter)"
            >
              <Save size={9} />
            </button>
            <button
              onClick={onCancelEdit}
              className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
              title="Cancel (Esc)"
            >
              <X size={9} />
            </button>
          </>
        ) : (
          <>
            {copyable && (
              <button
                onClick={(e) => { e.stopPropagation(); onCopy?.() }}
                className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Copy"
              >
                {copied ? <Check size={10} className="text-emerald-600" /> : <Copy size={10} />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onBeginEdit() }}
              className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              title="Edit"
            >
              <Edit3 size={10} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
