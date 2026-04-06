import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/auth.store'
import {
  ArrowLeft, GitBranch, Loader2,
  AlertCircle, Upload, Mic, History, Lock, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { didService } from '../../services/did.service'
import { ivrService } from '../../services/ivr.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { cn } from '../../utils/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  cli: string
  cnam: string
  // Main routing
  dest_type: string
  extension: string
  ivr_id: string
  voicemail_id: string
  ingroup: string
  forward_number: string
  // Provider & features
  operator: string
  sms: number
  sms_user_id: string           // stored in sms_email — user ID assigned to receive SMS
  default_did: number
  // Call times
  call_time_enabled: number     // UI toggle: 1 = call times active
  call_time_department_id: string
  call_time_holiday: number     // 1 = respect holiday calendar
  // Call screening
  call_screening_status: number
  call_screening_mode: string       // 'ivr' | 'upload' | 'speech'
  call_screening_ivr_id: string
  speech_text: string
  language: string
  voice_name: string
  // Redirect to last agent
  redirect_last_agent: number
  // Out-of-hours routing
  dest_type_ooh: string
  extension_ooh: string
  ivr_id_ooh: string
  voicemail_id_ooh: string
  ingroup_ooh: string
  forward_number_ooh: string
}

type DeptItem = { id: number; name: string; description?: string }

// ─── Config ───────────────────────────────────────────────────────────────────

// Fallback dest types in case API fails
const DEST_TYPES_FALLBACK = [
  { value: 'extension', label: 'Extension' },
  { value: 'ivr',       label: 'IVR' },
  { value: 'queue',     label: 'Ring Group / Queue' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'external',  label: 'External Number' },
]

// Map dest_type_list.dest_type name to internal key
const DEST_NAME_TO_KEY: Record<string, string> = {
  'Extension': 'extension', 'IVR': 'ivr', 'Voicemail': 'voicemail',
  'Ring-Group': 'queue', 'Queue': 'queue', 'DID': 'external',
  'Conferencing': 'conference', 'Fax': 'fax', 'DNC': 'dnc', 'Voice AI': 'voice_ai',
}

const OPERATORS = [
  { value: 'twilio',  label: 'Twilio' },
  { value: 'telnyx',  label: 'Telnyx' },
  { value: 'plivo',   label: 'Plivo' },
  { value: 'vonage',  label: 'Vonage' },
  { value: 'other',   label: 'Other' },
]

const DEFAULT_FORM: FormState = {
  cli: '', cnam: '', dest_type: 'extension',
  extension: '', ivr_id: '', voicemail_id: '', ingroup: '',
  forward_number: '', operator: '',
  sms: 0, sms_user_id: '', default_did: 0,
  call_time_enabled: 0, call_time_department_id: '', call_time_holiday: 0,
  call_screening_status: 0, call_screening_mode: 'ivr', call_screening_ivr_id: '',
  speech_text: '', language: 'en-US', voice_name: 'Joanna',
  redirect_last_agent: 0,
  dest_type_ooh: 'extension',
  extension_ooh: '', ivr_id_ooh: '', voicemail_id_ooh: '',
  ingroup_ooh: '', forward_number_ooh: '',
}

const DEST_TYPE_TO_NUM: Record<string, number> = {
  ivr: 0, extension: 1, voicemail: 2, external: 4, conference: 5, queue: 8, voice_ai: 12,
}
const DEST_TYPE_FROM_NUM: Record<number, string> = {
  0: 'ivr', 1: 'extension', 2: 'voicemail', 4: 'external', 5: 'conference', 8: 'queue', 12: 'voice_ai',
}

const LBL: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }

// ─── Small helpers ────────────────────────────────────────────────────────────

function EmptyHint({ message }: { message: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-1.5">
      <AlertCircle size={11} /> {message}
    </p>
  )
}




// ─── US phone formatter ───────────────────────────────────────────────────────

function formatUSPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

// ─── Routing target selector ──────────────────────────────────────────────────

type ExtItem  = { id: number; extension: string; first_name?: string; last_name?: string }
type IvrItem  = { ivr_id: string; ivr_desc?: string; ann_id?: string }
type RingItem = { id: number; title?: string; name?: string; extension_name?: string }

function RoutingTarget({
  destType, extension, ivr_id, voicemail_id, ingroup, forward_number,
  extensions, ivrs, ringGroups, loadingIvrs, loadingRingGroups,
  onChange,
}: {
  destType: string
  extension: string; ivr_id: string; voicemail_id: string
  ingroup: string; forward_number: string
  extensions: ExtItem[]
  ivrs: IvrItem[]
  ringGroups: RingItem[]
  loadingIvrs: boolean
  loadingRingGroups: boolean
  onChange: (key: string, value: string) => void
}) {
  const extLabel = (ext: ExtItem) => {
    const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
    return name || `Ext ${ext.extension}`
  }

  const rgLabel = (rg: RingItem) => {
    const title = rg.title || rg.name || `Group #${rg.id}`
    if (rg.extension_name) {
      const agents = rg.extension_name
        .split(',')
        .map(s => s.replace(/-\d+$/, '').trim())
        .filter(Boolean)
        .slice(0, 3)
      const suffix = agents.length ? `  — ${agents.join(', ')}` : ''
      return `${title}${suffix}`
    }
    return title
  }

  if (destType === 'extension') return (
    <div style={{ flex: '1 1 0' }}>
      <label style={LBL}>Target Agent / Extension <span className="text-red-400">*</span></label>
      <select className="cpn-fi" value={extension} onChange={e => onChange('extension', e.target.value)}>
        <option value="">— Select an agent —</option>
        {extensions.map(ext => (
          <option key={ext.id} value={String(ext.extension)}>{extLabel(ext)}</option>
        ))}
      </select>
      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>{extensions.length} agent{extensions.length !== 1 ? 's' : ''} available</span>
      {extensions.length === 0 && <EmptyHint message="No extensions found. Please create an extension first." />}
    </div>
  )

  if (destType === 'ivr') return (
    <div style={{ flex: '1 1 0' }}>
      <label style={LBL}>Select IVR Menu <span className="text-red-400">*</span></label>
      <select className="cpn-fi" value={ivr_id} onChange={e => onChange('ivr_id', e.target.value)} disabled={loadingIvrs}>
        <option value="">{loadingIvrs ? 'Loading IVR menus…' : '— Select an IVR menu —'}</option>
        {ivrs.map(ivr => (
          <option key={ivr.ivr_id} value={String(ivr.ivr_id)}>
            {ivr.ivr_desc || ivr.ann_id || ivr.ivr_id}
          </option>
        ))}
      </select>
      {!loadingIvrs && ivrs.length > 0 && (
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>{ivrs.length} IVR menu{ivrs.length !== 1 ? 's' : ''} available</span>
      )}
      {!loadingIvrs && ivrs.length === 0 && <EmptyHint message="No IVRs found. Please create an IVR first." />}
    </div>
  )

  if (destType === 'queue') return (
    <div style={{ flex: '1 1 0' }}>
      <label style={LBL}>Select Ring Group / Queue <span className="text-red-400">*</span></label>
      <select className="cpn-fi" value={ingroup} onChange={e => onChange('ingroup', e.target.value)} disabled={loadingRingGroups}>
        <option value="">{loadingRingGroups ? 'Loading ring groups…' : '— Select a ring group —'}</option>
        {ringGroups.map(rg => (
          <option key={rg.id} value={String(rg.id)}>
            {rgLabel(rg)}
          </option>
        ))}
      </select>
      {!loadingRingGroups && ringGroups.length > 0 && (
        <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>{ringGroups.length} ring group{ringGroups.length !== 1 ? 's' : ''} available</span>
      )}
      {!loadingRingGroups && ringGroups.length === 0 && <EmptyHint message="No ring groups found. Please create one first." />}
    </div>
  )

  if (destType === 'voicemail') return (
    <div style={{ flex: '1 1 0' }}>
      <label style={LBL}>Voicemail Box <span className="text-red-400">*</span></label>
      <select className="cpn-fi" value={voicemail_id} onChange={e => onChange('voicemail_id', e.target.value)}>
        <option value="">— Select an agent / extension —</option>
        {extensions.map(ext => (
          <option key={ext.id} value={String(ext.extension)}>{extLabel(ext)}</option>
        ))}
      </select>
      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>Callers go directly to this agent's voicemail box</span>
      {extensions.length === 0 && <EmptyHint message="No extensions found. Please create an extension first." />}
    </div>
  )

  if (destType === 'external') {
    const digits = forward_number.replace(/\D/g, '')
    return (
      <div style={{ flex: '1 1 0' }}>
        <label style={LBL}>Forward To Number <span className="text-red-400">*</span></label>
        <input
          className="cpn-fi font-mono"
          value={forward_number}
          onChange={e => onChange('forward_number', formatUSPhone(e.target.value))}
          placeholder="(XXX) XXX-XXXX"
          maxLength={14}
          inputMode="numeric"
        />
        <span style={{ fontSize: 11, color: digits.length === 10 ? '#059669' : '#94a3b8', marginTop: 2, display: 'block' }}>
          {digits.length}/10 digits{digits.length === 10 ? ' ✓' : ' · US format (XXX) XXX-XXXX'}
        </span>
      </div>
    )
  }

  return null
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function DidForm() {
  const { id }     = useParams<{ id: string }>()
  const navigate   = useNavigate()
  const isEdit     = Boolean(id)
  // Scope all lookup queries to the current client so switching tenants
  // never serves another client's agents/IVRs/groups from the cache.
  const clientId   = useAuthStore(s => s.user?.parent_id)
  const [form, setForm]           = useState<FormState>(DEFAULT_FORM)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [formPopulated, setFormPopulated] = useState(!isEdit)
  const didPopulateForId = useRef<string | undefined>(undefined)

  // ── Data queries ────────────────────────────────────────────────────────────
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['did', id],
    queryFn: async () => {
      const res = await didService.getById(Number(id))
      const d = res.data?.data ?? res.data
      return (Array.isArray(d) ? d[0] : d) as Record<string, unknown> | null
    },
    enabled: isEdit,
  })
  const { data: extensionsData, isLoading: loadingExtensions } = useQuery({
    queryKey: ['extensions', clientId],
    queryFn:  () => didService.getExtensions(),
  })
  const { data: ivrData, isLoading: loadingIvrs } = useQuery({
    queryKey: ['ivr-list-dropdown', clientId],
    queryFn:  () => didService.getIvrList(),
  })
  const { data: ringGroupData, isLoading: loadingRingGroups } = useQuery({
    queryKey: ['ringgroup-list-dropdown', clientId],
    queryFn:  () => didService.getRingGroups(),
  })
  const { data: deptData } = useQuery({
    queryKey: ['department-list', clientId],
    queryFn:  () => didService.getDepartments(),
  })
  const { data: destTypeData } = useQuery({
    queryKey: ['dest-types'],
    queryFn:  () => ivrService.getDestTypes(),
  })

  // Build dest types from API data
  const DEST_TYPES = (() => {
    const raw = (destTypeData as { data?: { data?: Array<{ id: number; dest_type: string; dest_id: number; is_deleted: number }> } })?.data?.data
    if (!raw || raw.length === 0) return DEST_TYPES_FALLBACK
    return raw
      .filter(d => d.is_deleted === 0)
      .map(d => ({
        value: DEST_NAME_TO_KEY[d.dest_type] ?? d.dest_type.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        label: d.dest_type === 'Ring-Group' ? 'Ring Group / Queue' : d.dest_type === 'DID' ? 'External Number' : d.dest_type,
      }))
  })()

  const extRaw    = (extensionsData as { data?: unknown })?.data
  const extensions: ExtItem[]  = Array.isArray(extRaw)
    ? (extRaw as ExtItem[])
    : ((extRaw as { data?: ExtItem[] })?.data ?? [])

  const ivrRaw    = (ivrData       as { data?: unknown })?.data
  const ivrs:       IvrItem[]  = Array.isArray(ivrRaw)
    ? (ivrRaw as IvrItem[])
    : ((ivrRaw as { data?: IvrItem[] })?.data ?? [])

  const rgRaw     = (ringGroupData as { data?: unknown })?.data
  const ringGroups: RingItem[] = Array.isArray(rgRaw)
    ? (rgRaw as RingItem[])
    : ((rgRaw as { data?: RingItem[] })?.data ?? [])

  const deptRaw  = (deptData as { data?: unknown })?.data
  const departments: DeptItem[] = Array.isArray(deptRaw)
    ? (deptRaw as DeptItem[])
    : ((deptRaw as { data?: DeptItem[] })?.data ?? [])

  // ── Populate form on edit ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !existing || typeof existing !== 'object') return
    if (didPopulateForId.current === id) return
    if (loadingExtensions || loadingIvrs || loadingRingGroups) return

    const d = existing as Record<string, unknown>

    console.log('[DID Edit] raw API record keys:', Object.keys(d))
    console.log('[DID Edit] raw API record:', JSON.stringify(d, null, 2))

    const toStr = (v: unknown): string => {
      if (v === null || v === undefined || v === '') return 'extension'
      if (typeof v === 'number') return DEST_TYPE_FROM_NUM[v] ?? 'extension'
      const n = Number(v)
      if (!isNaN(n) && DEST_TYPE_FROM_NUM[n] !== undefined) return DEST_TYPE_FROM_NUM[n]
      return String(v).toLowerCase() || 'extension'
    }

    const toBool = (v: unknown): 0 | 1 =>
      (v === 1 || v === '1' || v === true || v === 'true' ? 1 : 0)

    const resolveRg = (rawVal: unknown): string => {
      const raw = String(rawVal ?? '')
      if (!raw) return ''
      if (ringGroups.find(r => String(r.id) === raw)) return raw
      const byTitle = ringGroups.find(r => String(r.title || r.name || '') === raw)
      return byTitle ? String(byTitle.id) : raw
    }

    const resolveExtension = (val: unknown): string => {
      if (!val && val !== false) return ''
      const raw = String(val).trim()
      if (!raw || raw === '0') return ''
      if (extensions.find(e => String(e.extension) === raw)) return raw
      const byId = extensions.find(e => String(e.id) === raw)
      return byId ? String(byId.extension) : raw
    }

    const mainDestType = toStr(d.dest_type)
    const oohDestType  = toStr(d.dest_type_ooh)

    const dest = d.destination

    const rawExt = (
      d.extension       || d.extension_id    || d.ext_number     ||
      d.destination_extension || d.agent_id  ||
      d.ext_no          || d.sip_extension   || d.ext_id         ||
      (mainDestType === 'extension' ? dest : null)
    ) || null

    const rawVm = (
      d.voicemail_id || d.vm_id || d.voicemail ||
      (mainDestType === 'voicemail' ? dest : null)
    ) || null

    const resolvedIvrId = String(
      d.ivr_id ?? (mainDestType === 'ivr' ? dest : '') ?? ''
    )

    const resolvedIngroup = resolveRg(
      d.ingroup ?? (mainDestType === 'queue' ? dest : null)
    )

    const resolvedForward = String(
      d.forward_number ?? (mainDestType === 'external' ? dest : '') ?? ''
    )

    const rawExtOoh = (
      d.extension_ooh    || d.extension_id_ooh || d.ext_number_ooh ||
      d.user_id_ooh      || d.agent_id_ooh     || d.dest_id_ooh    ||
      d.destination_ooh  || d.ext_ooh
    ) || null

    const rawVmOoh = (
      d.voicemail_id_ooh || d.vm_id_ooh || d.voicemail_ooh ||
      (oohDestType === 'voicemail' ? (d.extension_ooh || d.user_id_ooh) : null)
    ) || null

    const resolvedSmsUserId = String(d.assigned_user_id ?? d.sms_email ?? '')

    const deptId = String(d.call_time_department_id ?? '')
    const rawAudioOpt = String(d.ivr_audio_option ?? '')
    const screeningMode = ['upload', 'speech'].includes(rawAudioOpt) ? rawAudioOpt : 'ivr'

    setForm({
      cli:            String(d.cli            ?? ''),
      cnam:           String(d.cnam           ?? ''),
      dest_type:      mainDestType,
      extension:      resolveExtension(rawExt),
      ivr_id:         resolvedIvrId,
      voicemail_id:   resolveExtension(rawVm),
      ingroup:        resolvedIngroup,
      forward_number: resolvedForward,
      operator:       String(d.operator       ?? d.voip_provider ?? ''),
      sms:            toBool(d.sms ?? d.is_sms ?? d.sms_enabled),
      sms_user_id:    resolvedSmsUserId,
      default_did:    toBool(d.default_did ?? d.is_default ?? d.default),
      call_time_enabled:       deptId && deptId !== '0' ? 1 : 0,
      call_time_department_id: deptId === '0' ? '' : deptId,
      call_time_holiday:       toBool(d.call_time_holiday),
      call_screening_status:   toBool(d.call_screening_status),
      call_screening_mode:     screeningMode,
      call_screening_ivr_id:   String(d.call_screening_ivr_id ?? ''),
      speech_text:             String(d.speech_text   ?? ''),
      language:                String(d.language      ?? 'en-US'),
      voice_name:              String(d.voice_name    ?? 'Joanna'),
      redirect_last_agent:     toBool(d.redirect_last_agent),
      dest_type_ooh:      oohDestType,
      extension_ooh:      resolveExtension(rawExtOoh),
      ivr_id_ooh:         String(d.ivr_id_ooh         ?? ''),
      voicemail_id_ooh:   resolveExtension(rawVmOoh),
      ingroup_ooh:        resolveRg(d.ingroup_ooh),
      forward_number_ooh: String(d.forward_number_ooh ?? ''),
    })
    didPopulateForId.current = id
    setFormPopulated(true)
  }, [existing, extensions, ringGroups, loadingExtensions, loadingIvrs, loadingRingGroups, id, isEdit])

  // ── Save mutation ────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () => {
      const destNum    = DEST_TYPE_TO_NUM[form.dest_type]    ?? 1
      const destNumOoh = DEST_TYPE_TO_NUM[form.dest_type_ooh] ?? 1

      const toExtNum = (val: string): string => {
        if (!val) return ''
        if (extensions.find(e => String(e.extension) === val)) return val
        const byId = extensions.find(e => String(e.id) === val)
        return byId ? String(byId.extension) : val
      }

      const oohEnabled = Boolean(form.call_time_holiday)

      const rawDigits = form.cli.replace(/\D/g, '')
      const cliValue = !isEdit && rawDigits.length === 10 ? `+1${rawDigits}` : form.cli

      const payload: Record<string, unknown> = {
        cli: cliValue, cnam: form.cnam,
        area_code: '', country_code: '',

        dest_type:      destNum,
        ivr_id:         destNum === 0 ? form.ivr_id             : '',
        extension:      destNum === 1 ? toExtNum(form.extension)      : '',
        voicemail_id:   destNum === 2 ? toExtNum(form.voicemail_id)   : '',
        forward_number: destNum === 4 ? form.forward_number : '',
        conf_id:        '',
        ingroup:        destNum === 8 ? form.ingroup         : '',

        operator:         form.operator,
        operator_check:   form.operator,
        voip_provider:    form.operator,
        phone_number_sid: '',

        sms: form.sms, is_sms: form.sms,
        sms_phone: '',
        sms_email: form.sms ? form.sms_user_id : '',
        sms_type: 0,
        default_did: form.default_did,

        call_screening_status: form.call_screening_status,
        call_screening_ivr_id: form.call_screening_status && oohEnabled && form.call_screening_mode === 'ivr'
          ? form.call_screening_ivr_id : '',
        ivr_audio_option: form.call_screening_status && oohEnabled ? form.call_screening_mode : '',
        speech_text:  form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.speech_text  : '',
        language:     form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.language     : '',
        voice_name:   form.call_screening_status && oohEnabled && form.call_screening_mode === 'speech' ? form.voice_name   : '',
        prompt_option: 0,

        redirect_last_agent: form.redirect_last_agent,

        dest_type_ooh:      oohEnabled ? destNumOoh : 1,
        ivr_id_ooh:         oohEnabled && destNumOoh === 0 ? form.ivr_id_ooh         : '',
        extension_ooh:      oohEnabled && destNumOoh === 1 ? toExtNum(form.extension_ooh)    : '',
        voicemail_id_ooh:   oohEnabled && destNumOoh === 2 ? toExtNum(form.voicemail_id_ooh) : '',
        forward_number_ooh: oohEnabled && destNumOoh === 4 ? form.forward_number_ooh : '',
        conf_id_ooh:        '',
        ingroup_ooh:        oohEnabled && destNumOoh === 8 ? form.ingroup_ooh : '',

        call_time_department_id: form.call_time_enabled ? form.call_time_department_id : 0,
        call_time_holiday:       form.call_time_enabled ? form.call_time_holiday        : 0,
      }
      if (isEdit) payload.did_id = Number(id)

      if (form.call_screening_status && oohEnabled && form.call_screening_mode === 'upload' && audioFile) {
        const fd = new FormData()
        Object.entries(payload).forEach(([k, v]) => fd.append(k, String(v ?? '')))
        fd.append('audio_file', audioFile)
        return isEdit ? didService.update(fd) : didService.create(fd)
      }

      return isEdit ? didService.update(payload) : didService.create(payload)
    },
    onSuccess: (res) => {
      const succeeded = res?.data?.success
      if (succeeded === false || succeeded === 'false' || succeeded === 0) {
        const errArr   = res?.data?.errors
        const firstErr = Array.isArray(errArr) && errArr.length > 0 ? String(errArr[0]) : null
        const isTech   = firstErr
          ? /SQLSTATE|Exception|Traceback|stack trace|at line \d|mysqli|PDO|undefined|null|Fatal/i.test(firstErr)
          : true
        const fallback = isEdit ? 'Unable to update DID.' : 'Unable to add DID.'
        toast.error((!isTech && firstErr && firstErr.length <= 120) ? firstErr : fallback)
        return
      }
      toast.success(isEdit ? 'DID updated' : 'DID added')
      navigate('/dids')
    },
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status
      if (!status || (status !== 403 && status !== 422 && status < 500)) {
        toast.error(isEdit ? 'Unable to update DID.' : 'Unable to add DID.')
      }
    },
  })

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const set = (key: keyof FormState, value: unknown) => setForm(f => ({ ...f, [key]: value }))

  const switchDestType = (val: string) =>
    setForm(f => ({ ...f, dest_type: val, extension: '', ivr_id: '', voicemail_id: '', ingroup: '', forward_number: '' }))

  const switchDestTypeOoh = (val: string) =>
    setForm(f => ({ ...f, dest_type_ooh: val, extension_ooh: '', ivr_id_ooh: '', voicemail_id_ooh: '', ingroup_ooh: '', forward_number_ooh: '' }))

  function handleSave() {
    if (!isEdit) {
      const rawDigits = form.cli.replace(/\D/g, '')
      if (rawDigits.length !== 10) {
        toast.error('Enter a valid 10-digit US phone number (e.g. 2125551234).')
        return
      }
    }
    if (!form.operator)    { toast.error('Please select a VoIP provider.'); return }
    if (!form.redirect_last_agent) {
      if (form.dest_type === 'extension' && !form.extension)            { toast.error('Please select a target extension.'); return }
      if (form.dest_type === 'ivr'       && !form.ivr_id)               { toast.error('Please select an IVR.'); return }
      if (form.dest_type === 'queue'     && !form.ingroup)              { toast.error('Please select a ring group / queue.'); return }
      if (form.dest_type === 'voicemail' && !form.voicemail_id)         { toast.error('Please select an extension for voicemail.'); return }
      if (form.dest_type === 'external') {
        if (!form.forward_number.trim()) { toast.error('Please enter the external forward number.'); return }
        if (form.forward_number.replace(/\D/g, '').length !== 10) { toast.error('External number must be exactly 10 digits.'); return }
      }
    }
    if (Boolean(form.call_time_holiday) && form.dest_type_ooh === 'external') {
      if (!form.forward_number_ooh.trim()) { toast.error('Please enter the out-of-hours external forward number.'); return }
      if (form.forward_number_ooh.replace(/\D/g, '').length !== 10) { toast.error('Out-of-hours external number must be exactly 10 digits.'); return }
    }
    const screeningActive = Boolean(form.call_screening_status) && Boolean(form.call_time_holiday)
    if (screeningActive) {
      if (form.call_screening_mode === 'ivr' && !form.call_screening_ivr_id) {
        toast.error('Please select an IVR announcement for call screening.'); return
      }
      if (form.call_screening_mode === 'upload' && !audioFile && !isEdit) {
        toast.error('Please upload an audio file for call screening.'); return
      }
      if (form.call_screening_mode === 'speech' && !form.speech_text.trim()) {
        toast.error('Please enter the screening message text.'); return
      }
    }
    saveMutation.mutate()
  }

  if (isEdit && (loadingExisting || !formPopulated || loadingExtensions || loadingIvrs || loadingRingGroups)) return <PageLoader />

  const holidayActive = Boolean(form.call_time_holiday)

  return (
    <div className="-mx-5 -mt-5 flex flex-col animate-fadeIn" style={{ height: 'calc(100vh - 70px)' }}>
      <style>{`
        .cpn-fi{width:100%;height:36px;padding:0 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
        .cpn-fi:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
        .cpn-fi::placeholder{color:#94a3b8}
        .cpn-fi:disabled{opacity:.45;cursor:not-allowed}
        select.cpn-fi{appearance:none;cursor:pointer;padding-right:28px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:13px}
        .cpn-reveal{animation:cpnReveal .25s ease-out}
        @keyframes cpnReveal{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        .cpn-toggle{display:inline-flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:2px}
        .cpn-toggle button{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;border:none;cursor:pointer;transition:all .15s;background:transparent;white-space:nowrap}
        .cpn-toggle button.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
        .cpn-toggle button:hover:not(.active){color:#475569}
        textarea.cpn-fi{height:auto;padding:8px 10px;resize:none}
      `}</style>

      {/* ── Sticky Header ── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dids')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-[15px] font-semibold text-slate-800">{isEdit ? 'Edit Phone Number' : 'Add Phone Number'}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/dids')}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors hidden sm:block">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saveMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow: '0 2px 8px rgba(37,99,235,.3)' }}>
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add DID'}
          </button>
        </div>
      </div>
      <div style={{ height: 3, background: 'linear-gradient(90deg, #bfdbfe, #3b82f6)' }} />

      {/* ── Body: Left form + Right sidebar ── */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

        {/* ── LEFT: Main form fields ── */}
        <div className="overflow-y-auto scroll-smooth border-r border-slate-200 bg-white">
          <div className="p-5 space-y-6">

            {/* ═══ Section: Phone Identity ═══ */}
            <section>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                  Phone Identity
                </h3>
                <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 0' }}>
                  <label style={LBL}>Phone Number (CLI) <span className="text-red-400">*</span></label>
                  <input
                    className={cn('cpn-fi font-mono', isEdit && '!opacity-45 !cursor-not-allowed')}
                    value={form.cli}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                      set('cli', digits)
                    }}
                    placeholder="2125551234"
                    disabled={isEdit}
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>
                <div style={{ flex: '1 1 0' }}>
                  <label style={LBL}>Caller ID Name (CNAM)</label>
                  <input
                    className="cpn-fi"
                    value={form.cnam}
                    onChange={e => set('cnam', e.target.value)}
                    placeholder="e.g. Support Line, Acme Corp"
                  />
                </div>
                <div style={{ flex: '1 1 0' }}>
                  <label style={LBL}>VoIP Provider <span className="text-red-400">*</span></label>
                  <select className="cpn-fi" value={form.operator} onChange={e => set('operator', e.target.value)}>
                    <option value="">— Select —</option>
                    {OPERATORS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* ═══ Section: Call Routing ═══ */}
            <section>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                  Call Routing
                </h3>
                <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
              </div>

              {Boolean(form.redirect_last_agent) ? (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                  <History size={16} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-700 leading-relaxed">
                    <span className="font-bold">Redirect to Last Spoken is active.</span> Calls will automatically route to the last agent the caller spoke with. Turn off the toggle in the sidebar to configure manual routing.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Routing Type</label>
                    <select className="cpn-fi" value={form.dest_type} onChange={e => switchDestType(e.target.value)}>
                      {DEST_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                  </div>
                  <RoutingTarget
                    destType={form.dest_type}
                    extension={form.extension} ivr_id={form.ivr_id}
                    voicemail_id={form.voicemail_id} ingroup={form.ingroup}
                    forward_number={form.forward_number}
                    extensions={extensions} ivrs={ivrs} ringGroups={ringGroups}
                    loadingIvrs={loadingIvrs} loadingRingGroups={loadingRingGroups}
                    onChange={(key, val) => set(key as keyof FormState, val)}
                  />
                </div>
              )}
            </section>

            {/* ═══ Section: SMS Assignment (visible when SMS on) ═══ */}
            {Boolean(form.sms) && (
              <section className="cpn-reveal">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    SMS Assignment
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div style={{ maxWidth: 400 }}>
                  <label style={LBL}>Assign SMS to User</label>
                  <select
                    className="cpn-fi"
                    value={form.sms_user_id}
                    onChange={e => set('sms_user_id', e.target.value)}
                  >
                    <option value="">— Select a user —</option>
                    {extensions.map(ext => {
                      const name = [ext.first_name, ext.last_name].filter(Boolean).join(' ')
                      return (
                        <option key={ext.id} value={String(ext.id)}>
                          {name || `User #${ext.id}`}
                        </option>
                      )
                    })}
                  </select>
                  <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>Incoming SMS routed to this user</span>
                  {extensions.length === 0 && <EmptyHint message="No users found." />}
                </div>
              </section>
            )}

            {/* ═══ Section: Business Hours (visible when Call Times on) ═══ */}
            {Boolean(form.call_time_enabled) && (
              <section className="cpn-reveal">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Business Hours
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>
                <div style={{ maxWidth: 400 }}>
                  <label style={LBL}>Schedule / Department</label>
                  <select
                    className="cpn-fi"
                    value={form.call_time_department_id}
                    onChange={e => set('call_time_department_id', e.target.value)}
                  >
                    <option value="">— Select a schedule —</option>
                    {departments.map(d => (
                      <option key={d.id} value={String(d.id)}>{d.name}</option>
                    ))}
                  </select>
                  {departments.length === 0 && <EmptyHint message="No call-time schedules found. Create one under Call Timings first." />}
                </div>
              </section>
            )}

            {/* ═══ Section: Call Screening (visible when screening + holiday on) ═══ */}
            {holidayActive && Boolean(form.call_screening_status) && (
              <section className="cpn-reveal">
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                    Call Screening
                  </h3>
                  <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={LBL}>Screening Method</label>
                  <div className="flex gap-2" style={{ maxWidth: 480 }}>
                    {([
                      { value: 'ivr',    label: 'Use IVR',      Icon: GitBranch },
                      { value: 'upload', label: 'Upload Audio',  Icon: Upload },
                      { value: 'speech', label: 'Text-to-Audio', Icon: Mic },
                    ] as const).map(m => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => set('call_screening_mode', m.value)}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all',
                          form.call_screening_mode === m.value
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        )}
                      >
                        <m.Icon size={12} />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {form.call_screening_mode === 'ivr' && (
                  <div className="cpn-reveal" style={{ maxWidth: 400 }}>
                    <label style={LBL}>IVR Announcement <span className="text-red-400">*</span></label>
                    <select
                      className="cpn-fi"
                      value={form.call_screening_ivr_id}
                      onChange={e => set('call_screening_ivr_id', e.target.value)}
                      disabled={loadingIvrs}
                    >
                      <option value="">{loadingIvrs ? 'Loading IVRs…' : '— Select an IVR —'}</option>
                      {ivrs.map(ivr => (
                        <option key={ivr.ivr_id} value={String(ivr.ivr_id)}>
                          {ivr.ivr_desc || ivr.ann_id || ivr.ivr_id}
                        </option>
                      ))}
                    </select>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>Caller hears this IVR; agent hears caller name before accepting</span>
                    {!loadingIvrs && ivrs.length === 0 && <EmptyHint message="No IVRs found. Create an IVR menu first." />}
                  </div>
                )}

                {form.call_screening_mode === 'upload' && (
                  <div className="cpn-reveal">
                    <label style={LBL}>Upload Screening Audio {!isEdit && <span className="text-red-400">*</span>}</label>
                    <label className={cn(
                      'mt-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                      audioFile ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'
                    )} style={{ maxWidth: 480 }}>
                      <Upload size={16} className={audioFile ? 'text-indigo-500' : 'text-slate-400'} />
                      <span className={cn('text-xs font-medium flex-1 truncate', audioFile ? 'text-indigo-700' : 'text-slate-500')}>
                        {audioFile ? audioFile.name : 'Choose audio file (mp3, wav, ogg)…'}
                      </span>
                      {audioFile && (
                        <button type="button" onClick={e => { e.preventDefault(); setAudioFile(null) }} className="text-slate-400 hover:text-red-500 text-xs flex-shrink-0">
                          Remove
                        </button>
                      )}
                      <input type="file" accept=".mp3,.wav,.ogg" className="sr-only" onChange={e => setAudioFile(e.target.files?.[0] ?? null)} />
                    </label>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>
                      {isEdit ? 'Leave empty to keep existing audio. Upload to replace.' : 'Audio played when call connects to this number.'}
                    </span>
                  </div>
                )}

                {form.call_screening_mode === 'speech' && (
                  <div className="cpn-reveal space-y-3">
                    <div>
                      <label style={LBL}>Screening Message <span className="text-red-400">*</span></label>
                      <textarea
                        className="cpn-fi"
                        rows={3}
                        style={{ height: 'auto', padding: '8px 10px', resize: 'none' }}
                        value={form.speech_text}
                        onChange={e => set('speech_text', e.target.value)}
                        placeholder="e.g. You have a call from a new customer. Press 1 to accept."
                      />
                      <span style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, display: 'block' }}>Text converted to speech and played to caller</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                      <div style={{ flex: '1 1 0' }}>
                        <label style={LBL}>Language</label>
                        <select className="cpn-fi" value={form.language} onChange={e => set('language', e.target.value)}>
                          <option value="en-US">English (US)</option>
                          <option value="en-GB">English (UK)</option>
                          <option value="es-ES">Spanish</option>
                          <option value="fr-FR">French</option>
                          <option value="de-DE">German</option>
                          <option value="pt-BR">Portuguese (BR)</option>
                        </select>
                      </div>
                      <div style={{ flex: '1 1 0' }}>
                        <label style={LBL}>Voice</label>
                        <select className="cpn-fi" value={form.voice_name} onChange={e => set('voice_name', e.target.value)}>
                          <option value="Joanna">Joanna (Female)</option>
                          <option value="Matthew">Matthew (Male)</option>
                          <option value="Amy">Amy (Female, UK)</option>
                          <option value="Brian">Brian (Male, UK)</option>
                          <option value="Salli">Salli (Female)</option>
                          <option value="Joey">Joey (Male)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ═══ Section: Out of Hours ═══ */}
            <section>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', borderLeft: '3px solid #2563eb', paddingLeft: 10, lineHeight: 1.3 }}>
                  Out of Hours
                </h3>
                <div style={{ height: 1, background: '#e5e7eb', marginTop: 8 }} />
              </div>

              {holidayActive ? (
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ flex: '1 1 0' }}>
                    <label style={LBL}>Out-of-Hours Routing Type</label>
                    <select className="cpn-fi" value={form.dest_type_ooh} onChange={e => switchDestTypeOoh(e.target.value)}>
                      {DEST_TYPES.map(dt => (
                        <option key={dt.value} value={dt.value}>{dt.label}</option>
                      ))}
                    </select>
                  </div>
                  <RoutingTarget
                    destType={form.dest_type_ooh}
                    extension={form.extension_ooh} ivr_id={form.ivr_id_ooh}
                    voicemail_id={form.voicemail_id_ooh} ingroup={form.ingroup_ooh}
                    forward_number={form.forward_number_ooh}
                    extensions={extensions} ivrs={ivrs} ringGroups={ringGroups}
                    loadingIvrs={loadingIvrs} loadingRingGroups={loadingRingGroups}
                    onChange={(key, val) => set(`${key}_ooh` as keyof FormState, val)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Lock size={22} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600 mb-1.5">Holiday Calendar Required</p>
                  <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                    Enable the <span className="font-medium text-slate-500">Holiday Calendar</span> toggle
                    in the sidebar to unlock out-of-hours routing.
                  </p>
                </div>
              )}
            </section>

          </div>
        </div>

        {/* ── RIGHT: Toggle sidebar ── */}
        <div style={{ background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
          <div className="p-4 space-y-3">
            <div>
              <label style={LBL}>Enable SMS</label>
              <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                <button type="button" className={cn(!form.sms && 'active')} style={{ flex: 1, ...(!form.sms ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('sms', 0)}>Off</button>
                <button type="button" className={cn(Boolean(form.sms) && 'active')} style={{ flex: 1, ...(form.sms ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('sms', 1)}>On</button>
              </div>
            </div>
            <div>
              <label style={LBL}>Default DID</label>
              <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                <button type="button" className={cn(!form.default_did && 'active')} style={{ flex: 1, ...(!form.default_did ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('default_did', 0)}>Off</button>
                <button type="button" className={cn(Boolean(form.default_did) && 'active')} style={{ flex: 1, ...(form.default_did ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('default_did', 1)}>On</button>
              </div>
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
            <div>
              <label style={LBL}>Call Times</label>
              <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                <button type="button" className={cn(!form.call_time_enabled && 'active')} style={{ flex: 1, ...(!form.call_time_enabled ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_time_enabled', 0)}>Off</button>
                <button type="button" className={cn(Boolean(form.call_time_enabled) && 'active')} style={{ flex: 1, ...(form.call_time_enabled ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_time_enabled', 1)}>On</button>
              </div>
            </div>
            <div>
              <label style={LBL}>Holiday Calendar</label>
              <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                <button type="button" className={cn(!form.call_time_holiday && 'active')} style={{ flex: 1, ...(!form.call_time_holiday ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_time_holiday', 0)}>Off</button>
                <button type="button" className={cn(Boolean(form.call_time_holiday) && 'active')} style={{ flex: 1, ...(form.call_time_holiday ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_time_holiday', 1)}>On</button>
              </div>
            </div>
            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
            <div>
              <label style={LBL}>Redirect to Last Agent</label>
              <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                <button type="button" className={cn(!form.redirect_last_agent && 'active')} style={{ flex: 1, ...(!form.redirect_last_agent ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('redirect_last_agent', 0)}>Off</button>
                <button type="button" className={cn(Boolean(form.redirect_last_agent) && 'active')} style={{ flex: 1, ...(form.redirect_last_agent ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('redirect_last_agent', 1)}>On</button>
              </div>
            </div>
            {holidayActive && (
              <div className="cpn-reveal">
                <label style={LBL}>Call Screening</label>
                <div className="cpn-toggle" style={{ width: '100%', display: 'flex' }}>
                  <button type="button" className={cn(!form.call_screening_status && 'active')} style={{ flex: 1, ...(!form.call_screening_status ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_screening_status', 0)}>Off</button>
                  <button type="button" className={cn(Boolean(form.call_screening_status) && 'active')} style={{ flex: 1, ...(form.call_screening_status ? { background: 'rgb(143,174,243)', color: '#fff', borderColor: 'rgb(143,174,243)' } : {}) }} onClick={() => set('call_screening_status', 1)}>On</button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
