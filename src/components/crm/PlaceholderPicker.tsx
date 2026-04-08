import { useState, useMemo, useEffect } from 'react'
import { Plus, ChevronDown, Info, Copy, Check, X, Tag, ArrowRight } from 'lucide-react'

// ── Public types ───────────────────────────────────────────────────────────────
export interface PickerPlaceholder {
  /** Full insertable string, e.g. [[first_name]] */
  key: string
  /** Human-readable label shown in the dropdown, e.g. "First Name" */
  label: string
  /** Group / category name, e.g. "Owner Information" */
  section: string
  /** True for variables added by the user via Add New Variable */
  isCustom?: boolean
}

interface PlaceholderPickerProps {
  placeholders: PickerPlaceholder[]
  /** Called with the exact string to insert into the editor */
  onInsert: (key: string) => void
  loading?: boolean
  tipLines?: string[]
}

// ── localStorage helpers ───────────────────────────────────────────────────────
const STORAGE_KEY = 'crm-picker-custom-vars'

function loadCustomVars(): PickerPlaceholder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as PickerPlaceholder[]) : []
  } catch {
    return []
  }
}

function saveCustomVars(vars: PickerPlaceholder[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(vars)) } catch { /* noop */ }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function toSlug(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

// ── Add-variable form state ────────────────────────────────────────────────────
interface AddForm {
  label: string
  rawKey: string
  section: string       // existing section selected
  newSection: string    // typed when creating new category
  useNewSection: boolean
}

const EMPTY_ADD: AddForm = {
  label: '', rawKey: '', section: '', newSection: '', useNewSection: false,
}

// ── Default tips ───────────────────────────────────────────────────────────────
const DEFAULT_TIPS = [
  "[[field_key]] — replaced with the lead's value at generation",
  '[[signature_image]] — renders the lead\'s signature image',
  'Unknown placeholders are silently removed',
]

// ════════════════════════════════════════════════════════════════════════════════
// PlaceholderPicker
// ════════════════════════════════════════════════════════════════════════════════
export function PlaceholderPicker({
  placeholders,
  onInsert,
  loading = false,
  tipLines,
}: PlaceholderPickerProps) {
  const tips = tipLines ?? DEFAULT_TIPS

  // ── Custom variables (persisted in localStorage) ──────────────────────────
  const [customVars, setCustomVars] = useState<PickerPlaceholder[]>(loadCustomVars)

  const allPlaceholders = useMemo(
    () => [...placeholders, ...customVars],
    [placeholders, customVars],
  )

  // ── Unique ordered category list ──────────────────────────────────────────
  const categories = useMemo(() => {
    const seen = new Set<string>()
    const list: string[] = []
    for (const p of allPlaceholders) {
      const sec = p.section?.trim() || 'Other'
      if (!seen.has(sec)) { seen.add(sec); list.push(sec) }
    }
    return list
  }, [allPlaceholders])

  // ── Selection state ───────────────────────────────────────────────────────
  const [selCategory, setSelCategory] = useState('')
  const [selKey, setSelKey]           = useState('')
  const [copied, setCopied]           = useState(false)

  // Reset variable when category changes
  useEffect(() => { setSelKey('') }, [selCategory])

  // Variables filtered to the selected category
  const categoryVars = useMemo(
    () => allPlaceholders.filter(p => (p.section?.trim() || 'Other') === selCategory),
    [allPlaceholders, selCategory],
  )

  const selectedPlaceholder = categoryVars.find(p => p.key === selKey)

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleInsert() {
    if (selKey) onInsert(selKey)
  }

  function handleCopy() {
    if (!selKey) return
    navigator.clipboard.writeText(selKey).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  // ── Add New Variable modal ────────────────────────────────────────────────
  const [showAdd, setShowAdd]     = useState(false)
  const [addForm, setAddForm]     = useState<AddForm>(EMPTY_ADD)
  const [addError, setAddError]   = useState('')

  function patchAdd<K extends keyof AddForm>(k: K, v: AddForm[K]) {
    setAddForm(f => ({ ...f, [k]: v }))
    setAddError('')
  }

  // Auto-generate key from label while key hasn't been manually edited
  const [keyTouched, setKeyTouched] = useState(false)

  function handleAddLabel(val: string) {
    setAddForm(f => ({
      ...f,
      label: val,
      rawKey: keyTouched ? f.rawKey : toSlug(val),
    }))
    setAddError('')
  }

  function handleAddKey(val: string) {
    setKeyTouched(true)
    patchAdd('rawKey', toSlug(val))
  }

  function closeAdd() {
    setShowAdd(false)
    setAddForm(EMPTY_ADD)
    setKeyTouched(false)
    setAddError('')
  }

  function handleAddSave() {
    const label    = addForm.label.trim()
    const rawKey   = (addForm.rawKey || toSlug(label)).trim()
    const section  = addForm.useNewSection
      ? addForm.newSection.trim()
      : addForm.section

    if (!label)   { setAddError('Variable name is required.'); return }
    if (!rawKey)  { setAddError('Placeholder key is required.'); return }
    if (!section) { setAddError('Category is required.'); return }

    const fullKey = `[[${rawKey}]]`
    if (allPlaceholders.some(p => p.key === fullKey)) {
      setAddError(`${fullKey} already exists. Choose a different key.`)
      return
    }

    const newVar: PickerPlaceholder = { key: fullKey, label, section, isCustom: true }
    const updated = [...customVars, newVar]
    setCustomVars(updated)
    saveCustomVars(updated)

    // Auto-navigate to the newly added variable
    setSelCategory(section)
    setTimeout(() => setSelKey(fullKey), 30)

    closeAdd()
  }

  const addPreviewKey = addForm.rawKey ? `[[${addForm.rawKey}]]` : null

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
          <div className="h-2.5 w-20 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-2 w-32 bg-slate-100 rounded-full animate-pulse mt-2" />
        </div>
        <div className="flex-1 p-4 space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5 animate-pulse">
              <div className="h-2 w-16 bg-slate-200 rounded-full" />
              <div className="h-9 w-full bg-slate-100 rounded-xl" />
            </div>
          ))}
          <div className="h-10 w-full bg-slate-100 rounded-xl animate-pulse mt-2" />
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (categories.length === 0) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <PickerHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-[11px] text-slate-400 italic text-center">
            No placeholder fields available
          </p>
          <AddButton onClick={() => setShowAdd(true)} />
        </div>
        {showAdd && (
          <AddVariableModal
            categories={categories}
            form={addForm}
            previewKey={addPreviewKey}
            error={addError}
            onLabelChange={handleAddLabel}
            onKeyChange={handleAddKey}
            onPatch={patchAdd}
            onSave={handleAddSave}
            onClose={closeAdd}
          />
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full overflow-hidden">

        {/* ── Header ── */}
        <PickerHeader />

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">

          {/* Category select */}
          <SelectRow
            label="Category"
            value={selCategory}
            onChange={setSelCategory}
            placeholder="— select category —"
            disabled={false}
          >
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SelectRow>

          {/* Variable select */}
          <SelectRow
            label="Variable"
            value={selKey}
            onChange={setSelKey}
            placeholder="— select variable —"
            disabled={!selCategory}
          >
            {categoryVars.map(p => (
              <option key={p.key} value={p.key}>
                {p.label}{p.isCustom ? ' ✦' : ''}
              </option>
            ))}
          </SelectRow>

          {/* Preview badge */}
          {selKey && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 flex items-center gap-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-0.5">
                  Will insert
                </p>
                <p className="font-mono text-xs font-bold text-indigo-700 truncate">
                  {selKey}
                </p>
                {selectedPlaceholder && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-indigo-400 truncate">
                      {selectedPlaceholder.label}
                    </p>
                    {selectedPlaceholder.isCustom && (
                      <span className="text-[9px] font-bold bg-indigo-200 text-indigo-600 px-1.5 py-0.5 rounded-full">
                        custom
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={handleCopy}
                title="Copy to clipboard"
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                {copied
                  ? <Check size={12} className="text-emerald-500" />
                  : <Copy size={12} />
                }
              </button>
            </div>
          )}

          {/* Insert button */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={handleInsert}
            disabled={!selKey}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm shadow-indigo-300/40"
          >
            <ArrowRight size={13} strokeWidth={2.5} />
            Insert Variable
          </button>

          {/* Divider + Add New Variable */}
          <div className="pt-1 border-t border-slate-100">
            <AddButton onClick={() => setShowAdd(true)} />
          </div>

          {/* Tips */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 mb-1.5">
              <Info size={11} className="text-amber-500 flex-shrink-0" />
              Tips
            </div>
            <ul className="space-y-1">
              {tips.map((line, i) => (
                <li key={i} className="text-[10.5px] text-amber-800 leading-snug">• {line}</li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Add New Variable modal (z-[60] sits above z-50 template modal) */}
      {showAdd && (
        <AddVariableModal
          categories={categories}
          form={addForm}
          previewKey={addPreviewKey}
          error={addError}
          onLabelChange={handleAddLabel}
          onKeyChange={handleAddKey}
          onPatch={patchAdd}
          onSave={handleAddSave}
          onClose={closeAdd}
        />
      )}
    </>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// Small sub-components
// ════════════════════════════════════════════════════════════════════════════════

function PickerHeader() {
  return (
    <div className="px-4 py-3 border-b border-slate-100 bg-white flex-shrink-0">
      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-none">
        Variables
      </p>
      <p className="text-[11px] text-slate-400 mt-1 leading-tight">
        Select category &amp; variable, then click&nbsp;
        <strong className="font-semibold text-slate-600">Insert</strong>
      </p>
    </div>
  )
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-indigo-600 border border-dashed border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400 transition-all"
    >
      <Plus size={11} strokeWidth={2.5} />
      Add New Variable
    </button>
  )
}

function SelectRow({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  disabled: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
      </p>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full appearance-none text-xs px-3 py-2.5 pr-8 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed hover:border-slate-300"
        >
          <option value="">{placeholder}</option>
          {children}
        </select>
        <ChevronDown
          size={12}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════════
// Add Variable Modal
// ════════════════════════════════════════════════════════════════════════════════
interface AddModalProps {
  categories: string[]
  form: AddForm
  previewKey: string | null
  error: string
  onLabelChange: (v: string) => void
  onKeyChange: (v: string) => void
  onPatch: <K extends keyof AddForm>(k: K, v: AddForm[K]) => void
  onSave: () => void
  onClose: () => void
}

function AddVariableModal({
  categories, form, previewKey, error,
  onLabelChange, onKeyChange, onPatch, onSave, onClose,
}: AddModalProps) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.48)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <Tag size={15} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-none">Add Custom Variable</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Define a new reusable template placeholder
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* Variable Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Variable Name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              className="input w-full"
              placeholder="e.g. Company Owner"
              value={form.label}
              onChange={e => onLabelChange(e.target.value)}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Human-readable label shown in the dropdown
            </p>
          </div>

          {/* Placeholder Key */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Placeholder Key <span className="text-red-500">*</span>
            </label>
            {/* [[  key  ]] flanked input */}
            <div className="flex items-stretch rounded-xl border border-slate-200 overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <span className="px-3 flex items-center text-xs font-mono font-bold text-slate-400 bg-slate-50 border-r border-slate-200 select-none">
                [[
              </span>
              <input
                className="flex-1 px-3 py-2.5 text-xs font-mono text-slate-800 outline-none bg-white placeholder:text-slate-300"
                placeholder="company_owner"
                value={form.rawKey}
                onChange={e => onKeyChange(e.target.value)}
              />
              <span className="px-3 flex items-center text-xs font-mono font-bold text-slate-400 bg-slate-50 border-l border-slate-200 select-none">
                ]]
              </span>
            </div>
            {previewKey && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] text-slate-400">Inserts as:</span>
                <code className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                  {previewKey}
                </code>
              </div>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            {!form.useNewSection ? (
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={form.section}
                    onChange={e => onPatch('section', e.target.value)}
                    className="w-full appearance-none text-xs px-3 py-2.5 pr-8 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                  >
                    <option value="">— select category —</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                <button
                  onClick={() => onPatch('useNewSection', true)}
                  className="text-[11px] text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                >
                  + Create new category
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  autoFocus
                  className="input w-full"
                  placeholder="e.g. Business Info"
                  value={form.newSection}
                  onChange={e => onPatch('newSection', e.target.value)}
                />
                <button
                  onClick={() => onPatch('useNewSection', false)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline transition-colors"
                >
                  ← Use existing category
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-100">
              <X size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onSave}
            className="btn-success flex items-center gap-2"
          >
            <Check size={13} />
            Add Variable
          </button>
          <button onClick={onClose} className="btn-outline">
            Cancel
          </button>
        </div>

      </div>
    </div>
  )
}
