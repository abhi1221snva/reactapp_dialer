import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, RefreshCw, Eye, EyeOff, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { useAuthStore } from '../../stores/auth.store'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function genExtension(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}
function genPassword(): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const nums = '0123456789'
  const syms = '@#!'
  const all = upper + lower + nums + syms
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)]
  const chars = [pick(upper), pick(lower), pick(nums), pick(syms)]
  for (let i = chars.length; i < 10; i++) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
function genPin(): string {
  return String(Math.floor(Math.random() * 900000) + 100000).slice(0, 4 + Math.floor(Math.random() * 3))
}
function formatUSPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}
function mapExtType(val: string): string {
  if (val === 'extension') return 'ext'
  if (val === 'ring_group') return 'que'
  return val
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TIMEZONES = [
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
  'America/Phoenix','America/Anchorage','Pacific/Honolulu','UTC',
  'Europe/London','Europe/Paris','Europe/Berlin','Asia/Tokyo',
  'Asia/Shanghai','Asia/Kolkata','Asia/Dubai','Australia/Sydney',
]
const DIALER_MODES = [
  { value: 'webphone', label: 'WebPhone' },
  { value: 'extension', label: 'Extension' },
  { value: 'mobile_app', label: 'Mobile App' },
]
const EXTENSION_TYPES = [
  { value: 'ext', label: 'Extension' },
  { value: 'que', label: 'Ring group/Queue' },
]
const CLI_SETTINGS = [
  { value: 0, label: 'Area Code' },
  { value: 1, label: 'Custom' },
  { value: 2, label: 'Area Code + Randomizer' },
]
const DID_DEST_LABEL: Record<number, string> = { 0:'IVR',1:'Extension',2:'Voicemail',4:'External',8:'Queue' }
const COUNTRY_CODES = [
  { code:'+1',short:'US',label:'+1 United States / Canada' },
  { code:'+44',short:'UK',label:'+44 United Kingdom' },
  { code:'+61',short:'AU',label:'+61 Australia' },
  { code:'+33',short:'FR',label:'+33 France' },
  { code:'+49',short:'DE',label:'+49 Germany' },
  { code:'+91',short:'IN',label:'+91 India' },
  { code:'+81',short:'JP',label:'+81 Japan' },
  { code:'+86',short:'CN',label:'+86 China' },
  { code:'+55',short:'BR',label:'+55 Brazil' },
  { code:'+52',short:'MX',label:'+52 Mexico' },
  { code:'+34',short:'ES',label:'+34 Spain' },
  { code:'+39',short:'IT',label:'+39 Italy' },
  { code:'+7',short:'RU',label:'+7 Russia' },
  { code:'+971',short:'UAE',label:'+971 United Arab Emirates' },
  { code:'+966',short:'SA',label:'+966 Saudi Arabia' },
  { code:'+92',short:'PK',label:'+92 Pakistan' },
  { code:'+27',short:'ZA',label:'+27 South Africa' },
  { code:'+63',short:'PH',label:'+63 Philippines' },
  { code:'+60',short:'MY',label:'+60 Malaysia' },
  { code:'+65',short:'SG',label:'+65 Singapore' },
]

// Inline style constants (pixel-matched from campaign)
const LABEL: React.CSSProperties = { display:'block',fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4 }
const H3: React.CSSProperties = { fontSize:14,fontWeight:700,color:'#1f2937',borderLeft:'3px solid #2563eb',paddingLeft:10,lineHeight:1.3 }
const DIVIDER: React.CSSProperties = { height:1,background:'#e5e7eb',marginTop:8 }
const SEC_HEAD: React.CSSProperties = { marginBottom:16 }
const FLEX_ROW: React.CSSProperties = { display:'flex',gap:16,alignItems:'flex-start' }
const FLEX_ROW_MT: React.CSSProperties = { display:'flex',gap:16,marginTop:12 }
const FLEX1: React.CSSProperties = { flex:'1 1 0' }
const ACT_BTN: React.CSSProperties = { width:36,height:36,border:'1px solid #e2e8f0',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',cursor:'pointer',flexShrink:0 }
const TOGGLE_ACTIVE: React.CSSProperties = { background:'rgb(143, 174, 243)',color:'#fff',borderColor:'rgb(143, 174, 243)' }

// Inline CSS (matches campaign page exactly)
const CPN_STYLES = `
.cpn-fi{width:100%;height:36px;padding:0 10px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
.cpn-fi:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.cpn-fi::placeholder{color:#94a3b8}
.cpn-fi:disabled{opacity:.45;cursor:not-allowed}
select.cpn-fi{appearance:none;cursor:pointer;padding-right:28px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:13px}
.cpn-fi.err{border-color:#f87171}
.cpn-fi.err:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1)}
.cpn-toggle{display:inline-flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:2px}
.cpn-toggle button{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;border:none;cursor:pointer;transition:all .15s;background:transparent;white-space:nowrap}
.cpn-toggle button.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.cpn-toggle button:hover:not(.active){color:#475569}
.cpn-g4{display:grid;grid-template-columns:repeat(1,1fr);gap:12px 16px}
@media(min-width:640px){.cpn-g4{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.cpn-g4{grid-template-columns:repeat(4,1fr)}}
`

// ---------------------------------------------------------------------------
// Default form
// ---------------------------------------------------------------------------
const makeDefault = () => ({
  first_name:'',last_name:'',email:'',mobile:'',country_code:'+1',
  password:genPassword(),extension:genExtension(),extension_type:'ext',
  dialer_mode:'webphone',timezone:'America/New_York',asterisk_server_id:0,
  user_level:1,status:1,group_id:[] as number[],
  voicemail:0,voicemail_send_to_email:0,vm_pin:'',
  follow_me:0,call_forward:0,twinning:0,
  no_answer_redirect:0,no_answer_phone:'',
  cli_setting:0,cli:'',
  receive_sms_on_email:0,receive_sms_on_mobile:0,
  ip_filtering:0,enable_2fa:0,app_status:0,
})
type FormState = ReturnType<typeof makeDefault>
type FormErrors = Partial<Record<keyof FormState | 'asterisk_server_id', string>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)
  const clientId = useAuthStore(s => s.user?.parent_id)

  const [form, setForm] = useState<FormState>(makeDefault)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const initialServerSet = useRef(false)

  /* queries */
  const { data: existing, isLoading: loadingExisting } = useQuery({ queryKey:['user',id], queryFn:()=>userService.getById(Number(id)), enabled:isEdit })
  const { data: groupsData } = useQuery({ queryKey:['extension-groups',clientId], queryFn:()=>userService.getGroups() })
  const { data: serversData } = useQuery({ queryKey:['client-servers'], queryFn:()=>userService.getServers() })
  const { data: didsData } = useQuery({ queryKey:['did-dropdown'], queryFn:()=>didService.list({ page:1,limit:500,search:'',filters:{} }), staleTime:60_000 })

  const servers: Array<{id:number;title_name?:string;detail?:string}> = serversData?.data?.data||serversData?.data||[]
  const groups: Array<{id:number;title?:string;group_name?:string}> = groupsData?.data?.data||groupsData?.data||[]
  const dids: Array<{id:number;cli?:string;title?:string}> = (didsData?.data?.data??didsData?.data??[]) as Array<{id:number;cli?:string;title?:string}>

  const labelOf = (g:{id:number;title?:string;group_name?:string}) => g.title||g.group_name||`Group ${g.id}`

  /* effects */
  useEffect(() => {
    if (!isEdit && servers.length > 0 && !initialServerSet.current) {
      initialServerSet.current = true
      setForm(f => ({ ...f, asterisk_server_id: servers[0].id }))
    }
  }, [servers, isEdit])

  useEffect(() => {
    if (existing?.data?.data) {
      const u = existing.data.data as Record<string,unknown>
      setForm(f => ({
        ...f,
        first_name:(u.first_name as string)||'', last_name:(u.last_name as string)||'',
        email:(u.email as string)||'', mobile:(u.mobile as string)||'',
        country_code:(u.country_code as string)||'+1', password:'',
        extension:(u.extension as string)||'',
        extension_type:mapExtType((u.extension_type as string)||'ext'),
        dialer_mode:(u.dialer_mode as string)||'webphone',
        timezone:(u.timezone as string)||'America/New_York',
        asterisk_server_id:Number(u.asterisk_server_id)||0,
        user_level:Number(u.user_level||u.level)||1,
        status:Number(u.status??1),
        group_id:Array.isArray(u.group_id)?(u.group_id as number[]):(u.group_id?[Number(u.group_id)]:[]),
        voicemail:Number(u.voicemail??0), voicemail_send_to_email:Number(u.voicemail_send_to_email??0),
        vm_pin:(u.vm_pin as string)||'',
        follow_me:Number(u.follow_me??0), call_forward:Number(u.call_forward??0),
        twinning:Number(u.twinning??0),
        no_answer_redirect:Number(u.no_answer_redirect??0), no_answer_phone:(u.no_answer_phone as string)||'',
        cli_setting:Number(u.cli_setting??0), cli:(u.cli as string)||'',
        receive_sms_on_email:Number(u.receive_sms_on_email??0), receive_sms_on_mobile:Number(u.receive_sms_on_mobile??0),
        ip_filtering:Number(u.ip_filtering??0), enable_2fa:Number(u.enable_2fa??0), app_status:Number(u.app_status??0),
      }))
    }
  }, [existing])

  /* helpers */
  const set = (key:string, value:unknown) => {
    setForm(f => ({ ...f, [key]: value }))
    if (submitted) setErrors(prev => ({ ...prev, [key]: undefined }))
  }
  const fiCls = (field: keyof FormErrors) => 'cpn-fi' + (errors[field] ? ' err' : '')
  const copyToClipboard = (text:string) => { navigator.clipboard.writeText(text).then(()=>toast.success('Copied!')).catch(()=>{}) }

  /* validation */
  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.mobile.trim()) e.mobile = 'Phone number is required'
    else if (form.mobile.replace(/\D/g,'').length!==10) e.mobile = 'Must be exactly 10 digits'
    if (form.no_answer_redirect===1) {
      if (!form.no_answer_phone.trim()) e.no_answer_phone = 'Redirect number is required'
      else if (form.no_answer_phone.replace(/\D/g,'').length!==10) e.no_answer_phone = 'Must be exactly 10 digits'
    }
    if (!isEdit) {
      const ext = Number(form.extension)
      if (!form.extension||!Number.isInteger(ext)||ext<1000||ext>9999) e.extension = '4 digits (1000-9999)'
      if (!form.asterisk_server_id) e.asterisk_server_id = 'Select a server'
    }
    return e
  }

  /* mutation */
  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const p: Record<string,unknown> = {
          extension_id:Number(id),first_name:form.first_name,last_name:form.last_name,
          email:form.email,mobile:form.mobile.replace(/\D/g,''),country_code:form.country_code,
          extension_type:form.extension_type,dialer_mode:form.dialer_mode,timezone:form.timezone,
          group_id:form.group_id,voicemail:form.voicemail,voicemail_send_to_email:form.voicemail_send_to_email,
          vm_pin:form.vm_pin?Number(form.vm_pin):undefined,follow_me:form.follow_me,
          call_forward:form.call_forward,twinning:form.twinning,no_answer_redirect:form.no_answer_redirect,
          no_answer_phone:form.no_answer_redirect?form.no_answer_phone:'',cli_setting:form.cli_setting,
          cli:form.cli,receive_sms_on_email:form.receive_sms_on_email,receive_sms_on_mobile:form.receive_sms_on_mobile,
          ip_filtering:form.ip_filtering,enable_2fa:form.enable_2fa,app_status:form.app_status,status:form.status,
        }
        if (form.password) p.password = form.password
        Object.keys(p).forEach(k => p[k]===undefined && delete p[k])
        return userService.update(p)
      }
      const p: Record<string,unknown> = {
        first_name:form.first_name,last_name:form.last_name,email:form.email,mobile:form.mobile,
        country_code:form.country_code,password:form.password,extension:Number(form.extension),
        extension_type:form.extension_type,dialer_mode:form.dialer_mode,timezone:form.timezone,
        asterisk_server_id:form.asterisk_server_id,user_level:form.user_level,status:form.status,
        group_id:form.group_id,voicemail:form.voicemail,voicemail_send_to_email:form.voicemail_send_to_email,
        vm_pin:form.vm_pin?Number(form.vm_pin):undefined,follow_me:form.follow_me,
        call_forward:form.call_forward,twinning:String(form.twinning),no_answer_redirect:form.no_answer_redirect,
        no_answer_phone:form.no_answer_redirect?form.no_answer_phone:'',cli_setting:form.cli_setting,
        cli:form.cli,receive_sms_on_email:form.receive_sms_on_email,receive_sms_on_mobile:form.receive_sms_on_mobile,
        ip_filtering:form.ip_filtering,enable_2fa:form.enable_2fa,app_status:form.app_status,
      }
      Object.keys(p).forEach(k => p[k]===undefined && delete p[k])
      return userService.create(p)
    },
    onSuccess: (res) => {
      const data = (res as {data?:{success?:boolean|string;message?:string}|null})?.data
      if (!data||data.success===false||data.success==='false') { toast.error((data as {message?:string}|null)?.message||'Failed to save'); return }
      toast.success(isEdit?'Extension updated':'Extension created')
      qc.invalidateQueries({ queryKey:['users'] })
      if (isEdit) qc.invalidateQueries({ queryKey:['user',id] })
      navigate('/users')
    },
    onError: (err:unknown) => {
      const status = (err as {response?:{status?:number}})?.response?.status
      const handled = status&&(status===400||status===401||status===403||status===422||status>=500)
      if (!handled) {
        const d = (err as {response?:{data?:{message?:string;errors?:Record<string,string[]>}}})?.response?.data
        toast.error(d?.message||(d?.errors?Object.values(d.errors)[0]?.[0]??'':'')||'Failed to save')
      }
      const errs = (err as {response?:{data?:{errors?:Record<string,string[]>}}})?.response?.data?.errors
      if (errs?.extension) set('extension', genExtension())
    },
  })

  const handleSubmit = () => { setSubmitted(true); const e=validate(); setErrors(e); if(!Object.keys(e).length) saveMutation.mutate() }

  /* toggle renderer (mirrors campaign sidebar toggles) */
  const renderToggle = (val:number, setVal:(v:number)=>void, first:string, firstVal:number, second:string, secondVal:number) => (
    <div className="cpn-toggle" style={{ width:'100%', display:'flex' }}>
      <button type="button" className={val===firstVal?'active':''} onClick={()=>setVal(firstVal)}
        style={{ flex:'1 1 0%', ...(val===firstVal?TOGGLE_ACTIVE:{}) }}>{first}</button>
      <button type="button" className={val===secondVal?'active':''} onClick={()=>setVal(secondVal)}
        style={{ flex:'1 1 0%', ...(val===secondVal?TOGGLE_ACTIVE:{}) }}>{second}</button>
    </div>
  )

  if (isEdit && loadingExisting) return <PageLoader />

  /* error hint */
  const err = (field: keyof FormErrors) => errors[field] ? <p style={{ fontSize:11,color:'#ef4444',marginTop:4 }}>{errors[field]}</p> : null

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="-mx-5 -mt-5 flex flex-col animate-fadeIn" style={{ height:'calc(100vh - 70px)' }}>
      <style>{CPN_STYLES}</style>

      {/* ── Header bar (identical to campaign) ──────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>navigate('/users')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all">
            <ArrowLeft size={15} />
          </button>
          <h1 className="text-[15px] font-semibold text-slate-800">
            {isEdit ? 'Edit Extension' : 'Create Extension'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={()=>navigate('/users')}
            className="text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors hidden sm:block">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saveMutation.isPending}
            className="px-5 py-2 text-xs font-semibold text-white rounded-lg flex items-center gap-2 disabled:opacity-50 transition-all"
            style={{ background:'linear-gradient(135deg, #2563eb, #1d4ed8)', boxShadow:'0 2px 8px rgba(37,99,235,0.3)' }}>
            {saveMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Save size={14} />}
            {isEdit ? 'Update Extension' : 'Create Extension'}
          </button>
        </div>
      </div>

      {/* ── Blue gradient line ──────────────────────────────────────────── */}
      <div style={{ height:3, background:'linear-gradient(90deg, #bfdbfe, #3b82f6)' }} />

      {/* ── Form body (2-column grid identical to campaign) ─────────────── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

          {/* ═══ LEFT COLUMN ══════════════════════════════════════════════ */}
          <div className="overflow-y-auto scroll-smooth border-r border-slate-200 bg-white">
            <div className="p-5">

              {/* Section 1: Extension Details */}
              <section>
                <div style={SEC_HEAD}>
                  <h3 style={H3}>Extension Details</h3>
                  <div style={DIVIDER} />
                </div>
                <div className="cpn-g4">
                  <div>
                    <label style={LABEL}>First Name <span className="text-red-400">*</span></label>
                    <input className={fiCls('first_name')} placeholder="e.g. John"
                      value={form.first_name} onChange={e=>set('first_name',e.target.value)} />
                    {err('first_name')}
                  </div>
                  <div>
                    <label style={LABEL}>Last Name</label>
                    <input className="cpn-fi" placeholder="Smith"
                      value={form.last_name} onChange={e=>set('last_name',e.target.value)} />
                  </div>
                  <div>
                    <label style={LABEL}>Email Address <span className="text-red-400">*</span></label>
                    <input type="email" className={fiCls('email')} placeholder="user@company.com"
                      value={form.email} onChange={e=>set('email',e.target.value)} />
                    {err('email')}
                  </div>
                  <div>
                    <label style={LABEL}>Phone Number <span className="text-red-400">*</span></label>
                    <div style={{ display:'flex', gap:4 }}>
                      <div style={{ position:'relative', width:90, flexShrink:0 }}>
                        <select className="cpn-fi" value={form.country_code} onChange={e=>set('country_code',e.target.value)}
                          style={{ color:'transparent', paddingRight:28 }}>
                          {COUNTRY_CODES.map(c=><option key={c.code} value={c.code} style={{color:'#0f172a'}}>{c.label}</option>)}
                        </select>
                        <div style={{ position:'absolute',inset:0,display:'flex',alignItems:'center',paddingLeft:10,paddingRight:24,pointerEvents:'none',fontSize:12,color:'#0f172a',whiteSpace:'nowrap',overflow:'hidden' }}>
                          {(()=>{const c=COUNTRY_CODES.find(x=>x.code===form.country_code);return c?`${c.code} ${c.short}`:form.country_code})()}
                        </div>
                      </div>
                      <input type="tel" className={fiCls('mobile')} style={{ flex:1 }}
                        value={form.mobile} onChange={e=>set('mobile',formatUSPhone(e.target.value))}
                        placeholder="(555) 555-5555" maxLength={14} />
                    </div>
                    {err('mobile')}
                  </div>
                </div>
              </section>

              {/* Section 2: Configuration */}
              <section className="mt-6">
                <div style={SEC_HEAD}>
                  <h3 style={H3}>Configuration</h3>
                  <div style={DIVIDER} />
                </div>

                {/* Row 1: Extension Type | Dialer Mode */}
                <div style={FLEX_ROW}>
                  <div style={FLEX1}>
                    <label style={LABEL}>Extension Type</label>
                    <select className="cpn-fi" value={form.extension_type} onChange={e=>set('extension_type',e.target.value)}>
                      {EXTENSION_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div style={FLEX1}>
                    <label style={LABEL}>Dialer Mode</label>
                    <select className="cpn-fi" value={form.dialer_mode} onChange={e=>set('dialer_mode',e.target.value)}>
                      {DIALER_MODES.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 2: Extension | Password */}
                <div style={FLEX_ROW_MT}>
                  <div style={FLEX1}>
                    <label style={LABEL}>Extension {!isEdit && <span className="text-red-400">*</span>}</label>
                    <div style={{ display:'flex', gap:4 }}>
                      <input className={fiCls('extension')} value={form.extension} readOnly disabled
                        style={{ flex:1, background:'#f8fafc', color:'#64748b', cursor:'not-allowed', fontFamily:'monospace' }} />
                      {!isEdit && (
                        <button type="button" onClick={()=>set('extension',genExtension())} style={ACT_BTN} title="Regenerate">
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </div>
                    {err('extension')}
                  </div>
                  <div style={FLEX1}>
                    <label style={LABEL}>{isEdit?'New Password':'Password'}</label>
                    <div style={{ display:'flex', gap:4 }}>
                      <input type={showPassword?'text':'password'} className="cpn-fi"
                        style={{ flex:1, ...(isEdit?{}:{background:'#f8fafc',fontFamily:'monospace'}) }}
                        value={form.password}
                        onChange={isEdit?e=>set('password',e.target.value):undefined}
                        readOnly={!isEdit} placeholder={isEdit?'Leave blank to keep':''} autoComplete="new-password" />
                      <button type="button" onClick={()=>setShowPassword(v=>!v)} style={ACT_BTN}>
                        {showPassword?<EyeOff size={14}/>:<Eye size={14}/>}
                      </button>
                      {!isEdit && (
                        <>
                          <button type="button" onClick={()=>copyToClipboard(form.password)} style={ACT_BTN} title="Copy">
                            <Copy size={14}/>
                          </button>
                          <button type="button" onClick={()=>set('password',genPassword())} style={ACT_BTN} title="Regenerate">
                            <RefreshCw size={14}/>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 3: Timezone | Server */}
                <div style={FLEX_ROW_MT}>
                  <div style={FLEX1}>
                    <label style={LABEL}>Timezone</label>
                    <select className="cpn-fi" value={form.timezone} onChange={e=>set('timezone',e.target.value)}>
                      {TIMEZONES.map(tz=><option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                  {servers.length > 0 && (
                    <div style={FLEX1}>
                      <label style={LABEL}>Asterisk Server {!isEdit && <span className="text-red-400">*</span>}</label>
                      <select className={fiCls('asterisk_server_id')} value={form.asterisk_server_id}
                        onChange={e=>set('asterisk_server_id',Number(e.target.value))}>
                        <option value={0} disabled>Select a server...</option>
                        {servers.map(s=><option key={s.id} value={s.id}>{s.title_name||s.detail||`Server ${s.id}`}</option>)}
                      </select>
                      {err('asterisk_server_id')}
                    </div>
                  )}
                </div>

                {/* Row 4: CLI Setting | Agent Group */}
                <div style={FLEX_ROW_MT}>
                  <div style={FLEX1}>
                    <label style={LABEL}>CLI Setting</label>
                    <select className="cpn-fi" value={form.cli_setting} onChange={e=>set('cli_setting',Number(e.target.value))}>
                      {CLI_SETTINGS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div style={FLEX1}>
                    <label style={LABEL}>Agent Group</label>
                    <select className="cpn-fi" value={form.group_id[0]||''}
                      onChange={e=>set('group_id',e.target.value?[Number(e.target.value)]:[])}>
                      <option value="">None</option>
                      {groups.map(g=><option key={g.id} value={g.id}>{labelOf(g)}</option>)}
                    </select>
                  </div>
                </div>

                {/* Row 5 (conditional): Custom CLI | VM PIN */}
                <div style={FLEX_ROW_MT}>
                  {form.cli_setting === 1 && (
                    <div style={FLEX1}>
                      <label style={LABEL}>Custom CLI</label>
                      <select className="cpn-fi" value={form.cli} onChange={e=>set('cli',e.target.value)}>
                        <option value="">-- Select DID --</option>
                        {dids.map(d => {
                          const raw = d as Record<string,unknown>
                          const dest = DID_DEST_LABEL[Number(raw.dest_type)]??'Other'
                          const cnam = (raw.cnam as string)||''
                          const num = d.cli||`DID #${d.id}`
                          return <option key={d.id} value={d.cli??''}>{`${num}${cnam?` - ${cnam}`:''} - ${dest}`}</option>
                        })}
                      </select>
                    </div>
                  )}
                  <div style={FLEX1}>
                    <label style={LABEL}>Voicemail PIN</label>
                    <div style={{ display:'flex', gap:4 }}>
                      <input type="number" className="cpn-fi" style={{ flex:1, fontFamily:'monospace' }}
                        value={form.vm_pin} onChange={e=>set('vm_pin',e.target.value)}
                        placeholder="e.g. 1234" />
                      <button type="button" onClick={()=>set('vm_pin',genPin())}
                        style={{ height:36,padding:'0 12px',border:'1px solid #e2e8f0',borderRadius:8,background:'#fff',fontSize:12,fontWeight:600,color:'#64748b',cursor:'pointer',whiteSpace:'nowrap' }}>
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR (identical pattern to campaign) ═══════════ */}
          <div style={{ background:'#f8fafc', borderLeft:'1px solid #e2e8f0' }} className="overflow-y-auto">
            <div className="p-4 space-y-3">

              {/* Status */}
              <div>
                <label style={LABEL}>Status</label>
                {renderToggle(form.status, v=>set('status',v), 'Active',1, 'Inactive',0)}
              </div>

              {/* Follow Me */}
              <div>
                <label style={LABEL}>Follow Me</label>
                {renderToggle(form.follow_me, v=>set('follow_me',v), 'No',0, 'Yes',1)}
              </div>

              {/* Call Forward */}
              <div>
                <label style={LABEL}>Call Forward</label>
                {renderToggle(form.call_forward, v=>set('call_forward',v), 'No',0, 'Yes',1)}
              </div>

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {/* Twinning */}
              <div>
                <label style={LABEL}>Twinning</label>
                {renderToggle(form.twinning, v=>set('twinning',v), 'No',0, 'Yes',1)}
              </div>

              {/* No Answer Redirect */}
              <div>
                <label style={LABEL}>No Answer Redirect</label>
                {renderToggle(form.no_answer_redirect, v=>set('no_answer_redirect',v), 'No',0, 'Yes',1)}
              </div>
              {form.no_answer_redirect === 1 && (
                <div>
                  <label style={LABEL}>Redirect Number <span className="text-red-400">*</span></label>
                  <input type="tel" className={fiCls('no_answer_phone')}
                    value={form.no_answer_phone} onChange={e=>set('no_answer_phone',formatUSPhone(e.target.value))}
                    placeholder="(555) 555-5555" maxLength={14} />
                  {err('no_answer_phone')}
                </div>
              )}

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {/* Voicemail */}
              <div>
                <label style={LABEL}>Voicemail</label>
                {renderToggle(form.voicemail, v=>set('voicemail',v), 'Active',1, 'Inactive',0)}
              </div>

              {/* VM to Email */}
              <div>
                <label style={LABEL}>VM to Email</label>
                {renderToggle(form.voicemail_send_to_email, v=>set('voicemail_send_to_email',v), 'No',0, 'Yes',1)}
              </div>

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {/* IP Filtering */}
              <div>
                <label style={LABEL}>IP Filtering</label>
                {renderToggle(form.ip_filtering, v=>set('ip_filtering',v), 'Active',1, 'Inactive',0)}
              </div>

              {/* Enable 2FA */}
              <div>
                <label style={LABEL}>Enable 2FA</label>
                {renderToggle(form.enable_2fa, v=>set('enable_2fa',v), 'No',0, 'Yes',1)}
              </div>

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {/* Mobile App */}
              <div>
                <label style={LABEL}>Mobile App</label>
                {renderToggle(form.app_status, v=>set('app_status',v), 'Active',1, 'Inactive',0)}
              </div>

              {/* SMS to Email */}
              <div>
                <label style={LABEL}>SMS to Email</label>
                {renderToggle(form.receive_sms_on_email, v=>set('receive_sms_on_email',v), 'Off',0, 'On',1)}
              </div>

              {/* SMS to Mobile */}
              <div>
                <label style={LABEL}>SMS to Mobile</label>
                {renderToggle(form.receive_sms_on_mobile, v=>set('receive_sms_on_mobile',v), 'Off',0, 'On',1)}
              </div>

            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
