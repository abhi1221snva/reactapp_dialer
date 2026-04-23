import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Save, Loader2, RefreshCw, Eye, EyeOff, Copy, AlertCircle, User, Settings, CheckCircle2, XCircle, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { userService } from '../../services/user.service'
import { didService } from '../../services/did.service'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { useAuthStore } from '../../stores/auth.store'
import { isSuperAdmin, LEVELS } from '../../utils/permissions'
import { NotFound } from '../NotFound'
import { TIMEZONES } from '../../constants/timezones'

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
  const syms = '@#!$%^&*_+-='
  const all = upper + lower + nums + syms
  const rng = (max: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % max }
  const pick = (s: string) => s[rng(s.length)]
  const chars = [pick(upper), pick(lower), pick(nums), pick(syms)]
  for (let i = chars.length; i < 12; i++) chars.push(pick(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rng(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
function genPin(): string {
  return String(Math.floor(Math.random() * 9000) + 1000)
}
function capFirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
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
// TIMEZONES imported from ../../constants/timezones
const USER_LEVELS = [
  { value: 1, label: 'Agent' },
  { value: 3, label: 'Associate' },
  { value: 5, label: 'Manager' },
  { value: 7, label: 'Admin' },
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
  { code:'+93',short:'AF',name:'Afghanistan' },
  { code:'+355',short:'AL',name:'Albania' },
  { code:'+213',short:'DZ',name:'Algeria' },
  { code:'+376',short:'AD',name:'Andorra' },
  { code:'+244',short:'AO',name:'Angola' },
  { code:'+54',short:'AR',name:'Argentina' },
  { code:'+374',short:'AM',name:'Armenia' },
  { code:'+61',short:'AU',name:'Australia' },
  { code:'+43',short:'AT',name:'Austria' },
  { code:'+994',short:'AZ',name:'Azerbaijan' },
  { code:'+973',short:'BH',name:'Bahrain' },
  { code:'+880',short:'BD',name:'Bangladesh' },
  { code:'+375',short:'BY',name:'Belarus' },
  { code:'+32',short:'BE',name:'Belgium' },
  { code:'+501',short:'BZ',name:'Belize' },
  { code:'+591',short:'BO',name:'Bolivia' },
  { code:'+387',short:'BA',name:'Bosnia & Herzegovina' },
  { code:'+267',short:'BW',name:'Botswana' },
  { code:'+55',short:'BR',name:'Brazil' },
  { code:'+673',short:'BN',name:'Brunei' },
  { code:'+359',short:'BG',name:'Bulgaria' },
  { code:'+855',short:'KH',name:'Cambodia' },
  { code:'+237',short:'CM',name:'Cameroon' },
  { code:'+1',short:'CA',name:'Canada' },
  { code:'+56',short:'CL',name:'Chile' },
  { code:'+86',short:'CN',name:'China' },
  { code:'+57',short:'CO',name:'Colombia' },
  { code:'+506',short:'CR',name:'Costa Rica' },
  { code:'+385',short:'HR',name:'Croatia' },
  { code:'+53',short:'CU',name:'Cuba' },
  { code:'+357',short:'CY',name:'Cyprus' },
  { code:'+420',short:'CZ',name:'Czech Republic' },
  { code:'+45',short:'DK',name:'Denmark' },
  { code:'+593',short:'EC',name:'Ecuador' },
  { code:'+20',short:'EG',name:'Egypt' },
  { code:'+503',short:'SV',name:'El Salvador' },
  { code:'+372',short:'EE',name:'Estonia' },
  { code:'+251',short:'ET',name:'Ethiopia' },
  { code:'+358',short:'FI',name:'Finland' },
  { code:'+33',short:'FR',name:'France' },
  { code:'+995',short:'GE',name:'Georgia' },
  { code:'+49',short:'DE',name:'Germany' },
  { code:'+233',short:'GH',name:'Ghana' },
  { code:'+30',short:'GR',name:'Greece' },
  { code:'+502',short:'GT',name:'Guatemala' },
  { code:'+504',short:'HN',name:'Honduras' },
  { code:'+852',short:'HK',name:'Hong Kong' },
  { code:'+36',short:'HU',name:'Hungary' },
  { code:'+354',short:'IS',name:'Iceland' },
  { code:'+91',short:'IN',name:'India' },
  { code:'+62',short:'ID',name:'Indonesia' },
  { code:'+98',short:'IR',name:'Iran' },
  { code:'+964',short:'IQ',name:'Iraq' },
  { code:'+353',short:'IE',name:'Ireland' },
  { code:'+972',short:'IL',name:'Israel' },
  { code:'+39',short:'IT',name:'Italy' },
  { code:'+1876',short:'JM',name:'Jamaica' },
  { code:'+81',short:'JP',name:'Japan' },
  { code:'+962',short:'JO',name:'Jordan' },
  { code:'+7',short:'KZ',name:'Kazakhstan' },
  { code:'+254',short:'KE',name:'Kenya' },
  { code:'+965',short:'KW',name:'Kuwait' },
  { code:'+371',short:'LV',name:'Latvia' },
  { code:'+961',short:'LB',name:'Lebanon' },
  { code:'+218',short:'LY',name:'Libya' },
  { code:'+370',short:'LT',name:'Lithuania' },
  { code:'+352',short:'LU',name:'Luxembourg' },
  { code:'+853',short:'MO',name:'Macau' },
  { code:'+60',short:'MY',name:'Malaysia' },
  { code:'+356',short:'MT',name:'Malta' },
  { code:'+52',short:'MX',name:'Mexico' },
  { code:'+373',short:'MD',name:'Moldova' },
  { code:'+212',short:'MA',name:'Morocco' },
  { code:'+258',short:'MZ',name:'Mozambique' },
  { code:'+95',short:'MM',name:'Myanmar' },
  { code:'+977',short:'NP',name:'Nepal' },
  { code:'+31',short:'NL',name:'Netherlands' },
  { code:'+64',short:'NZ',name:'New Zealand' },
  { code:'+505',short:'NI',name:'Nicaragua' },
  { code:'+234',short:'NG',name:'Nigeria' },
  { code:'+47',short:'NO',name:'Norway' },
  { code:'+968',short:'OM',name:'Oman' },
  { code:'+92',short:'PK',name:'Pakistan' },
  { code:'+507',short:'PA',name:'Panama' },
  { code:'+595',short:'PY',name:'Paraguay' },
  { code:'+51',short:'PE',name:'Peru' },
  { code:'+63',short:'PH',name:'Philippines' },
  { code:'+48',short:'PL',name:'Poland' },
  { code:'+351',short:'PT',name:'Portugal' },
  { code:'+1787',short:'PR',name:'Puerto Rico' },
  { code:'+974',short:'QA',name:'Qatar' },
  { code:'+40',short:'RO',name:'Romania' },
  { code:'+7',short:'RU',name:'Russia' },
  { code:'+966',short:'SA',name:'Saudi Arabia' },
  { code:'+381',short:'RS',name:'Serbia' },
  { code:'+65',short:'SG',name:'Singapore' },
  { code:'+421',short:'SK',name:'Slovakia' },
  { code:'+386',short:'SI',name:'Slovenia' },
  { code:'+27',short:'ZA',name:'South Africa' },
  { code:'+82',short:'KR',name:'South Korea' },
  { code:'+34',short:'ES',name:'Spain' },
  { code:'+94',short:'LK',name:'Sri Lanka' },
  { code:'+46',short:'SE',name:'Sweden' },
  { code:'+41',short:'CH',name:'Switzerland' },
  { code:'+886',short:'TW',name:'Taiwan' },
  { code:'+255',short:'TZ',name:'Tanzania' },
  { code:'+66',short:'TH',name:'Thailand' },
  { code:'+1868',short:'TT',name:'Trinidad & Tobago' },
  { code:'+216',short:'TN',name:'Tunisia' },
  { code:'+90',short:'TR',name:'Turkey' },
  { code:'+256',short:'UG',name:'Uganda' },
  { code:'+380',short:'UA',name:'Ukraine' },
  { code:'+971',short:'AE',name:'United Arab Emirates' },
  { code:'+44',short:'GB',name:'United Kingdom' },
  { code:'+1',short:'US',name:'United States' },
  { code:'+598',short:'UY',name:'Uruguay' },
  { code:'+998',short:'UZ',name:'Uzbekistan' },
  { code:'+58',short:'VE',name:'Venezuela' },
  { code:'+84',short:'VN',name:'Vietnam' },
  { code:'+260',short:'ZM',name:'Zambia' },
  { code:'+263',short:'ZW',name:'Zimbabwe' },
]

// Inline style constants (pixel-matched from campaign)
const LABEL: React.CSSProperties = { display:'flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700,color:'#64748b',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:4 }
const FLEX_ROW: React.CSSProperties = { display:'flex',gap:16,alignItems:'flex-start' }
const FLEX_ROW_MT: React.CSSProperties = { display:'flex',gap:16,marginTop:14 }
const FLEX1: React.CSSProperties = { flex:'1 1 0' }
const ACT_BTN: React.CSSProperties = { width:38,height:38,border:'1.5px solid #e2e8f0',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',background:'#fff',cursor:'pointer',flexShrink:0 }
const TOGGLE_ACTIVE: React.CSSProperties = { background:'#818cf8',color:'#fff',borderColor:'#818cf8' }

// Inline CSS (matches ApplyPage / MerchantPage styling)
const CPN_STYLES = `
.cpn-fi{width:100%;height:38px;padding:0 11px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:13px;color:#0f172a;background:#fff;outline:none;font-family:inherit;box-sizing:border-box;transition:border-color .15s,box-shadow .15s}
.cpn-fi:focus{border-color:#4f46e5;box-shadow:0 0 0 3px rgba(79,70,229,.1)}
.cpn-fi::placeholder{color:#94a3b8}
.cpn-fi:disabled{opacity:.45;cursor:not-allowed}
select.cpn-fi{appearance:none;cursor:pointer;padding-right:28px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 8px center;background-size:13px}
.cpn-fi.err{border-color:#ef4444}
.cpn-fi.err:focus{border-color:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.1)}
.cpn-toggle{display:inline-flex;background:#f1f5f9;border-radius:8px;padding:2px;gap:2px}
.cpn-toggle button{padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;border:none;cursor:pointer;transition:all .15s;background:transparent;white-space:nowrap}
.cpn-toggle button.active{background:#fff;color:#0f172a;box-shadow:0 1px 3px rgba(0,0,0,.1)}
.cpn-toggle button:hover:not(.active){color:#475569}
.cpn-toggle-sm{display:inline-flex;background:#f1f5f9;border-radius:6px;padding:1.5px;gap:1px}
.cpn-toggle-sm button{padding:3px 10px;border-radius:5px;font-size:11px;font-weight:600;color:#64748b;border:none;cursor:pointer;transition:all .15s;background:transparent;white-space:nowrap;line-height:1.4}
.cpn-toggle-sm button.active{background:#fff;color:#0f172a;box-shadow:0 1px 2px rgba(0,0,0,.08)}
.cpn-toggle-sm button:hover:not(.active){color:#475569}
.cpn-g4{display:grid;grid-template-columns:repeat(1,1fr);gap:14px 16px}
@media(min-width:640px){.cpn-g4{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.cpn-g4{grid-template-columns:repeat(4,1fr)}}
@keyframes fadeSlide{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
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
type FormErrors = Partial<Record<keyof FormState | 'asterisk_server_id' | 'password', string>>

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function UserForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isEdit = Boolean(id)
  const clientId = useAuthStore(s => s.user?.parent_id)
  const authUser = useAuthStore(s => s.user)
  const authLevel = authUser?.level ?? 0
  const isAgentRole = authLevel < LEVELS.MANAGER

  // Agents can only edit their own record; block create and editing others
  if (isAgentRole && (!isEdit || String(authUser?.id) !== id)) {
    return <NotFound />
  }

  const [form, setForm] = useState<FormState>(makeDefault)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const initialServerSet = useRef(false)
  const initialGroupSet = useRef(false)
  const formLoaded = useRef(false)
  const formRef = useRef<HTMLDivElement>(null)
  const showServerField = isSuperAdmin(authUser)

  /* queries */
  const { data: existing, isLoading: loadingExisting } = useQuery({ queryKey:['user',id], queryFn:()=>userService.getById(Number(id)), enabled:isEdit })
  const { data: groupsData } = useQuery({ queryKey:['extension-groups',clientId], queryFn:()=>userService.getGroups() })
  const { data: serversData } = useQuery({ queryKey:['client-servers'], queryFn:()=>userService.getServers() })
  const { data: didsData } = useQuery({ queryKey:['did-dropdown'], queryFn:()=>didService.list({ page:1,limit:500,search:'',filters:{} }), staleTime:60_000 })

  /* email availability check */
  const [emailStatus, setEmailStatus] = useState<'idle'|'checking'|'available'|'taken'>('idle')
  const emailCheckTimer = useRef<ReturnType<typeof setTimeout>|null>(null)
  const lastCheckedEmail = useRef('')

  const checkEmailAvailability = useCallback((email: string) => {
    if (emailCheckTimer.current) clearTimeout(emailCheckTimer.current)
    if (!email.trim() || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) { setEmailStatus('idle'); return }
    if (isEdit && existing?.data?.data && (existing.data.data as Record<string,unknown>).email === email) { setEmailStatus('idle'); return }
    if (lastCheckedEmail.current === email) return
    setEmailStatus('checking')
    emailCheckTimer.current = setTimeout(async () => {
      try {
        lastCheckedEmail.current = email
        const res = await userService.checkEmail(email)
        const d = res?.data as Record<string,unknown>|undefined
        const isTaken = d?.success === false || d?.success === 'false'
        setEmailStatus(isTaken ? 'taken' : 'available')
      } catch {
        setEmailStatus('idle')
      }
    }, 600)
  }, [isEdit, existing])

  /* country code search */
  const [ccSearch, setCcSearch] = useState('')
  const [ccOpen, setCcOpen] = useState(false)
  const ccRef = useRef<HTMLDivElement>(null)
  const filteredCC = ccSearch
    ? COUNTRY_CODES.filter(c => c.name.toLowerCase().includes(ccSearch.toLowerCase()) || c.code.includes(ccSearch) || c.short.toLowerCase().includes(ccSearch.toLowerCase()))
    : COUNTRY_CODES

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

  // Auto-select first group when groups load (create mode only)
  useEffect(() => {
    if (!isEdit && groups.length > 0 && !initialGroupSet.current) {
      initialGroupSet.current = true
      setForm(f => f.group_id.length === 0 ? { ...f, group_id: [groups[0].id] } : f)
    }
  }, [groups, isEdit])

  // Close country code dropdown on outside click
  useEffect(() => {
    if (!ccOpen) return
    const handler = (e: MouseEvent) => {
      if (ccRef.current && !ccRef.current.contains(e.target as Node)) setCcOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ccOpen])

  useEffect(() => {
    if (existing?.data?.data && !formLoaded.current) {
      formLoaded.current = true
      const u = existing.data.data as Record<string,unknown>
      setForm(f => ({
        ...f,
        first_name:(u.first_name as string)||'', last_name:(u.last_name as string)||'',
        email:(u.email as string)||'', mobile:formatUSPhone((u.mobile as string)||''),
        country_code:(()=>{const raw=String(u.country_code||'1');return raw.startsWith('+')?raw:'+'+raw})(), password:'',
        extension:(u.extension as string)||'',
        extension_type:mapExtType((u.extension_type as string)||'ext'),
        dialer_mode:(u.dialer_mode as string)||'webphone',
        timezone:(u.timezone as string)||'America/New_York',
        asterisk_server_id:Number(u.asterisk_server_id)||0,
        user_level:Number(u.user_level||u.level)||1,
        status:Number(u.status??1),
        group_id:Array.isArray(u.group)?(u.group as Array<{group_id:number}>).map(g=>Number(g.group_id)):Array.isArray(u.group_id)?(u.group_id as number[]):(u.group_id?[Number(u.group_id)]:[]),
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
    else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(form.email)) e.email = 'Enter a valid email'
    if (!isEdit && !form.password) e.password = 'Password is required'
    else if (!isEdit && form.password.length < 10) e.password = 'Minimum 10 characters'
    else if (!isEdit && (!/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password))) e.password = 'Must include upper, lower, digit, and special char'
    if (!form.mobile.trim()) e.mobile = 'Phone number is required'
    else if (form.mobile.replace(/\D/g,'').length < 7 || form.mobile.replace(/\D/g,'').length > 15) e.mobile = 'Must be 7-15 digits'
    if (form.no_answer_redirect===1) {
      if (!form.no_answer_phone.trim()) e.no_answer_phone = 'Redirect number is required'
      else if (form.no_answer_phone.replace(/\D/g,'').length < 7 || form.no_answer_phone.replace(/\D/g,'').length > 15) e.no_answer_phone = 'Must be 7-15 digits'
    }
    if (!isEdit) {
      const ext = Number(form.extension)
      if (!form.extension||!Number.isInteger(ext)||ext<1000||ext>9999) e.extension = '4 digits (1000-9999)'
      if (showServerField && !form.asterisk_server_id) e.asterisk_server_id = 'Select a server'
    }
    return e
  }

  /* mutation */
  const saveMutation = useMutation({
    mutationFn: () => {
      if (isEdit) {
        const p: Record<string,unknown> = {
          extension_id:Number(id),first_name:capFirst(form.first_name),last_name:capFirst(form.last_name),
          email:form.email,mobile:form.mobile.replace(/\D/g,''),country_code:form.country_code.replace(/\D/g,''),
          extension_type:form.extension_type,dialer_mode:form.dialer_mode,timezone:form.timezone,
          group_id:form.group_id,voicemail:Number(form.voicemail),voicemail_send_to_email:Number(form.voicemail_send_to_email),
          vm_pin:form.vm_pin?Number(form.vm_pin):undefined,follow_me:Number(form.follow_me),
          call_forward:Number(form.call_forward),twinning:String(form.twinning),no_answer_redirect:Number(form.no_answer_redirect),
          no_answer_phone:form.no_answer_redirect?form.no_answer_phone.replace(/\D/g,''):'',cli_setting:Number(form.cli_setting),
          cli:form.cli,receive_sms_on_email:String(form.receive_sms_on_email),receive_sms_on_mobile:String(form.receive_sms_on_mobile),
          ip_filtering:String(form.ip_filtering),enable_2fa:String(form.enable_2fa),app_status:String(form.app_status),status:Number(form.status),
        }
        if (form.password) p.password = form.password
        Object.keys(p).forEach(k => p[k]===undefined && delete p[k])
        return userService.update(p)
      }
      const p: Record<string,unknown> = {
        first_name:capFirst(form.first_name),last_name:capFirst(form.last_name),email:form.email,mobile:form.mobile.replace(/\D/g,''),
        country_code:form.country_code.replace(/\D/g,''),password:form.password,extension:Number(form.extension),
        extension_type:form.extension_type,dialer_mode:form.dialer_mode,timezone:form.timezone,
        asterisk_server_id:form.asterisk_server_id,user_level:Number(form.user_level),status:Number(form.status),
        group_id:form.group_id,voicemail:Number(form.voicemail),voicemail_send_to_email:Number(form.voicemail_send_to_email),
        vm_pin:form.vm_pin?Number(form.vm_pin):undefined,follow_me:Number(form.follow_me),
        call_forward:Number(form.call_forward),twinning:String(form.twinning),no_answer_redirect:Number(form.no_answer_redirect),
        no_answer_phone:form.no_answer_redirect?form.no_answer_phone.replace(/\D/g,''):'',cli_setting:Number(form.cli_setting),
        cli:form.cli,receive_sms_on_email:String(form.receive_sms_on_email),receive_sms_on_mobile:String(form.receive_sms_on_mobile),
        ip_filtering:String(form.ip_filtering),enable_2fa:String(form.enable_2fa),app_status:String(form.app_status),
      }
      Object.keys(p).forEach(k => p[k]===undefined && delete p[k])
      return userService.create(p)
    },
    onSuccess: (res) => {
      const data = (res as {data?:{success?:boolean|string;message?:string}|null})?.data
      if (!data||data.success===false||data.success==='false') { toast.error((data as {message?:string}|null)?.message||'Failed to save'); return }
      toast.success(isEdit?'Extension updated':'Extension created')
      qc.invalidateQueries({ queryKey:['users'] })
      if (isEdit) {
        qc.invalidateQueries({ queryKey:['user',id] })
        qc.invalidateQueries({ queryKey:['user-view'] })
      }
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
      if (errs?.extension) {
        set('extension', genExtension())
        toast('Extension was already taken. A new one has been generated.', { icon: '\u26A0\uFE0F' })
      }
    },
  })

  const handleSubmit = () => {
    setSubmitted(true)
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) {
      setTimeout(() => {
        const el = formRef.current?.querySelector('.cpn-fi.err') as HTMLElement
        if (el) { el.scrollIntoView({ behavior:'smooth', block:'center' }); el.focus?.() }
      }, 50)
      return
    }
    saveMutation.mutate()
  }

  /* toggle renderer (mirrors campaign sidebar toggles) */
  const renderToggle = (val:number, setVal:(v:number)=>void, first:string, firstVal:number, second:string, secondVal:number) => (
    <div className="cpn-toggle" style={{ width:'100%', display:'flex' }}>
      <button type="button" className={val===firstVal?'active':''} onClick={()=>setVal(firstVal)}
        style={{ flex:'1 1 0%', ...(val===firstVal?TOGGLE_ACTIVE:{}) }}>{first}</button>
      <button type="button" className={val===secondVal?'active':''} onClick={()=>setVal(secondVal)}
        style={{ flex:'1 1 0%', ...(val===secondVal?TOGGLE_ACTIVE:{}) }}>{second}</button>
    </div>
  )

  /* compact inline toggle for sidebar (label + toggle on same row) */
  const TOGGLE_ACTIVE_SM: React.CSSProperties = { background:'#818cf8',color:'#fff',borderColor:'#818cf8' }
  const renderInlineToggle = (label:string, val:number, setVal:(v:number)=>void, first:string, firstVal:number, second:string, secondVal:number) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 0' }}>
      <span style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', flexShrink:0 }}>{label}</span>
      <div className="cpn-toggle-sm" style={{ width:120, flexShrink:0, display:'flex' }}>
        <button type="button" className={val===firstVal?'active':''} onClick={()=>setVal(firstVal)}
          style={{ flex:'1 1 0%', ...(val===firstVal?TOGGLE_ACTIVE_SM:{}) }}>{first}</button>
        <button type="button" className={val===secondVal?'active':''} onClick={()=>setVal(secondVal)}
          style={{ flex:'1 1 0%', ...(val===secondVal?TOGGLE_ACTIVE_SM:{}) }}>{second}</button>
      </div>
    </div>
  )

  if (isEdit && loadingExisting) return <PageLoader />

  /* error hint */
  const err = (field: keyof FormErrors) => errors[field] ? <span style={{ fontSize:11,color:'#ef4444',marginTop:4,display:'flex',alignItems:'center',gap:3 }}><AlertCircle size={11}/>{errors[field]}</span> : null

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
            style={{ background:'linear-gradient(135deg, #4f46e5, #3730a3)', boxShadow:'0 2px 8px rgba(79,70,229,0.3)' }}>
            {saveMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Save size={14} />}
            {isEdit ? 'Update Extension' : 'Create Extension'}
          </button>
        </div>
      </div>

      {/* ── Blue gradient line ──────────────────────────────────────────── */}
      <div style={{ height:3, background:'linear-gradient(90deg, #c7d2fe, #4f46e5)' }} />

      {/* ── Form body (2-column grid identical to campaign) ─────────────── */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-0">

          {/* ═══ LEFT COLUMN ══════════════════════════════════════════════ */}
          <div ref={formRef} className="overflow-y-auto scroll-smooth border-r border-slate-200" style={{ background:'#f1f5f9' }}>
            <div className="p-5" style={{ animation:'fadeSlide .25s ease' }}>

              {submitted && Object.keys(errors).length > 0 && (
                <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:10, padding:'10px 14px', color:'#7f1d1d', fontSize:13, display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                  <AlertCircle size={14} style={{ flexShrink:0 }} />
                  Please fix {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''} before saving.
                </div>
              )}

              <div style={{ background:'#fff', borderRadius:16, border:`1.5px solid ${submitted && Object.keys(errors).length > 0 ? '#fca5a5' : '#e2e8f0'}`, padding:'24px', boxShadow:'0 2px 12px rgba(15,23,42,.05)' }}>

              {/* Section 1: Extension Details */}
              <section>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(79,70,229,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4f46e5' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#0f172a' }}>Extension Details</h3>
                    <p style={{ margin:0, fontSize:11, color:'#64748b' }}>Basic user and contact information</p>
                  </div>
                </div>
                <div className="cpn-g4">
                  <div>
                    <label style={LABEL}>First Name <span className="text-red-400">*</span></label>
                    <input className={fiCls('first_name')} placeholder="e.g. John"
                      value={form.first_name} onChange={e=>set('first_name',capFirst(e.target.value))} />
                    {err('first_name')}
                  </div>
                  <div>
                    <label style={LABEL}>Last Name</label>
                    <input className="cpn-fi" placeholder="Smith"
                      value={form.last_name} onChange={e=>set('last_name',capFirst(e.target.value))} />
                  </div>
                  <div>
                    <label style={LABEL}>Email Address <span className="text-red-400">*</span></label>
                    <div style={{ position:'relative' }}>
                      <input type="email" className={fiCls('email') + (emailStatus === 'taken' ? ' err' : '')} placeholder="user@company.com"
                        value={form.email} onChange={e=>{set('email',e.target.value);checkEmailAvailability(e.target.value)}} />
                      {emailStatus === 'checking' && <Loader2 size={14} className="animate-spin" style={{ position:'absolute',right:10,top:12,color:'#94a3b8' }} />}
                      {emailStatus === 'available' && <CheckCircle2 size={14} style={{ position:'absolute',right:10,top:12,color:'#22c55e' }} />}
                      {emailStatus === 'taken' && <XCircle size={14} style={{ position:'absolute',right:10,top:12,color:'#ef4444' }} />}
                    </div>
                    {emailStatus === 'available' && <span style={{ fontSize:11,color:'#22c55e',marginTop:2,display:'block' }}>Email is available</span>}
                    {emailStatus === 'taken' && <span style={{ fontSize:11,color:'#ef4444',marginTop:2,display:'block' }}>Email already exists</span>}
                    {err('email')}
                  </div>
                  <div>
                    <label style={LABEL}>Phone Number <span className="text-red-400">*</span></label>
                    <div style={{ display:'flex', gap:4 }}>
                      <div ref={ccRef} style={{ position:'relative', width:80, flexShrink:0 }}>
                        <button type="button" className="cpn-fi" onClick={()=>{setCcOpen(v=>!v);setCcSearch('')}}
                          style={{ display:'flex',alignItems:'center',justifyContent:'space-between',paddingRight:6,cursor:'pointer',fontSize:12,color:'#0f172a',textAlign:'left' }}>
                          <span>{(()=>{const c=COUNTRY_CODES.find(x=>x.code===form.country_code&&x.short!=='CA');return c?`${c.short} ${c.code}`:form.country_code})()}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        {ccOpen && (
                          <div style={{ position:'absolute',top:'100%',left:0,right:0,marginTop:2,background:'#fff',border:'1.5px solid #e2e8f0',borderRadius:8,boxShadow:'0 8px 24px rgba(0,0,0,.12)',zIndex:50,minWidth:220,maxHeight:260,display:'flex',flexDirection:'column' }}>
                            <div style={{ padding:'6px 8px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:6 }}>
                              <Search size={12} style={{ color:'#94a3b8',flexShrink:0 }} />
                              <input autoFocus className="cpn-fi" placeholder="Search country..."
                                value={ccSearch} onChange={e=>setCcSearch(e.target.value)}
                                style={{ border:'none',height:28,padding:0,fontSize:12,boxShadow:'none' }}
                                onClick={e=>e.stopPropagation()} />
                            </div>
                            <div style={{ overflowY:'auto',flex:1 }}>
                              {filteredCC.map(c=>{
                                const sel = form.country_code===c.code
                                return (
                                <button key={c.short + c.code} type="button"
                                  onClick={()=>{set('country_code',c.code);setCcOpen(false);setCcSearch('')}}
                                  style={{ width:'100%',padding:'6px 10px',border:'none',background:sel?'#eef2ff':'transparent',cursor:'pointer',fontSize:12,color:'#0f172a',textAlign:'left',display:'flex',alignItems:'center',gap:6 }}
                                  onMouseEnter={e=>(e.currentTarget.style.background=sel?'#eef2ff':'#f8fafc')}
                                  onMouseLeave={e=>(e.currentTarget.style.background=sel?'#eef2ff':'transparent')}>
                                  <span style={{ fontWeight:600,minWidth:42 }}>{c.code}</span>
                                  <span style={{ color:'#64748b' }}>{c.name}</span>
                                </button>
                                )
                              })}
                              {filteredCC.length===0 && <div style={{ padding:'8px 10px',fontSize:11,color:'#94a3b8' }}>No results</div>}
                            </div>
                          </div>
                        )}
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
              <section className="mt-8" style={{ paddingTop:20, borderTop:'1.5px solid #e2e8f0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:'rgba(124,58,237,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#7c3aed' }}>
                    <Settings size={16} />
                  </div>
                  <div>
                    <h3 style={{ margin:0, fontSize:15, fontWeight:800, color:'#0f172a' }}>Configuration</h3>
                    <p style={{ margin:0, fontSize:11, color:'#64748b' }}>Extension settings and preferences</p>
                  </div>
                </div>

                {/* Row 1: Extension | Password | Voicemail PIN */}
                <div style={FLEX_ROW_MT}>
                  <div style={FLEX1}>
                    <label style={LABEL}>Extension {!isEdit && <span className="text-red-400">*</span>}</label>
                    <div style={{ position:'relative' }}>
                      <input className={fiCls('extension')} value={form.extension} readOnly disabled
                        style={{ background:'#f8fafc', color:'#1e293b', cursor:'not-allowed', fontFamily:'monospace', fontWeight:600, opacity:1, paddingRight:!isEdit?36:11 }} />
                      {!isEdit && (
                        <button type="button" onClick={()=>set('extension',genExtension())} title="Regenerate"
                          style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:4 }}>
                          <RefreshCw size={13} />
                        </button>
                      )}
                    </div>
                    {err('extension')}
                  </div>
                  {!isEdit && (
                  <div style={FLEX1}>
                    <label style={LABEL}>Password</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPassword?'text':'password'} className="cpn-fi"
                        style={{ paddingRight:90, background:'#f8fafc',fontFamily:'monospace' }}
                        value={form.password}
                        onChange={e=>set('password',e.target.value)}
                        autoComplete="new-password" />
                      <div style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:2 }}>
                        <button type="button" onClick={()=>setShowPassword(v=>!v)}
                          style={{ width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:4 }}>
                          {showPassword?<EyeOff size={13}/>:<Eye size={13}/>}
                        </button>
                        <button type="button" onClick={()=>copyToClipboard(form.password)} title="Copy"
                          style={{ width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:4 }}>
                          <Copy size={13}/>
                        </button>
                        <button type="button" onClick={()=>set('password',genPassword())} title="Regenerate"
                          style={{ width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:4 }}>
                          <RefreshCw size={13}/>
                        </button>
                      </div>
                    </div>
                    {err('password')}
                  </div>
                  )}
                  <div style={FLEX1}>
                    <label style={LABEL}>Voicemail PIN</label>
                    <div style={{ position:'relative' }}>
                      <input type="text" inputMode="numeric" className="cpn-fi" style={{ background:'#f8fafc', color:'#1e293b', fontFamily:'monospace', fontWeight:600, paddingRight:36 }}
                        value={form.vm_pin} onChange={e=>{const v=e.target.value.replace(/\D/g,'').slice(0,4);set('vm_pin',v)}}
                        placeholder="e.g. 1234" maxLength={4} />
                      <button type="button" onClick={()=>set('vm_pin',genPin())} title="Generate PIN"
                        style={{ position:'absolute',right:6,top:'50%',transform:'translateY(-50%)',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',background:'transparent',border:'none',cursor:'pointer',color:'#94a3b8',borderRadius:4 }}>
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 2: Asterisk Server | Timezone */}
                <div style={FLEX_ROW_MT}>
                  {showServerField && servers.length > 0 && (
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
                  <div style={FLEX1}>
                    <label style={LABEL}>Timezone</label>
                    <SearchableSelect
                      className="cpn-fi"
                      options={TIMEZONES.map(tz => ({ value: tz.value, label: tz.label }))}
                      value={form.timezone}
                      onChange={v => set('timezone', v)}
                      placeholder="Select timezone…"
                    />
                  </div>
                </div>

                {/* Row 2b: User Role (visible to managers+) */}
                {authLevel >= LEVELS.MANAGER && (
                  <div style={FLEX_ROW_MT}>
                    <div style={FLEX1}>
                      <label style={LABEL}>User Role / Level</label>
                      <select className="cpn-fi" value={form.user_level}
                        onChange={e=>set('user_level',Number(e.target.value))}>
                        {USER_LEVELS.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                    <div style={FLEX1} />
                  </div>
                )}

                {/* Row 3: Agent Group | CLI Setting | Custom CLI (dynamic) */}
                <div style={FLEX_ROW_MT}>
                  <div style={FLEX1}>
                    <label style={LABEL}>Agent Group</label>
                    <SearchableSelect
                      className="cpn-fi"
                      options={groups.map(g => ({ value: String(g.id), label: labelOf(g) }))}
                      value={String(form.group_id[0] || '')}
                      onChange={v => set('group_id', v ? [Number(v)] : [])}
                      placeholder="Select group…"
                    />
                  </div>
                  <div style={FLEX1}>
                    <label style={LABEL}>CLI Setting</label>
                    <select className="cpn-fi" value={form.cli_setting} onChange={e=>{const v=Number(e.target.value);set('cli_setting',v);if(v!==1)set('cli','')}}>
                      {CLI_SETTINGS.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  {form.cli_setting === 1 && (
                    <div style={FLEX1}>
                      <label style={LABEL}>Custom CLI</label>
                      <SearchableSelect
                        className="cpn-fi"
                        options={dids.map(d => {
                          const raw = d as Record<string,unknown>
                          const dest = DID_DEST_LABEL[Number(raw.dest_type)]??'Other'
                          const cnam = (raw.cnam as string)||''
                          const num = d.cli||`DID #${d.id}`
                          return { value: d.cli??'', label: `${num}${cnam?` - ${cnam}`:''} - ${dest}` }
                        })}
                        value={form.cli}
                        onChange={v => set('cli', v)}
                        placeholder="-- Select DID --"
                        emptyLabel="-- Select DID --"
                      />
                    </div>
                  )}
                </div>
              </section>

              </div>{/* end card */}
            </div>
          </div>

          {/* ═══ RIGHT SIDEBAR ══════════════════════════════════════════ */}
          <div style={{ background:'#f8fafc', borderLeft:'1.5px solid #e2e8f0' }} className="overflow-y-auto">
            <div style={{ padding:'12px 14px' }}>

              {/* Sidebar header */}
              <div style={{ display:'flex', alignItems:'center', gap:10, paddingBottom:8, borderBottom:'1.5px solid #e2e8f0', marginBottom:6 }}>
                <div style={{ width:26, height:26, borderRadius:7, background:'rgba(79,70,229,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4f46e5' }}>
                  <Settings size={12} />
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'#0f172a' }}>Quick Settings</span>
              </div>

              {renderInlineToggle('Status', form.status, v=>set('status',v), 'Active',1, 'Inactive',0)}
              {renderInlineToggle('Follow Me', form.follow_me, v=>set('follow_me',v), 'No',0, 'Yes',1)}
              {renderInlineToggle('Call Forward', form.call_forward, v=>set('call_forward',v), 'No',0, 'Yes',1)}

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {renderInlineToggle('Twinning', form.twinning, v=>set('twinning',v), 'No',0, 'Yes',1)}
              {renderInlineToggle('Voicemail', form.voicemail, v=>set('voicemail',v), 'Active',1, 'Inactive',0)}

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {renderInlineToggle('IP Filtering', form.ip_filtering, v=>set('ip_filtering',v), 'Active',1, 'Inactive',0)}
              {renderInlineToggle('Enable 2FA', form.enable_2fa, v=>set('enable_2fa',v), 'No',0, 'Yes',1)}

              <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />

              {renderInlineToggle('Mobile App', form.app_status, v=>set('app_status',v), 'Active',1, 'Inactive',0)}

            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
