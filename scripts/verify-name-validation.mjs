// End-to-end check of name validation logic against QA tickets ID_11–ID_20.
// Mirrors src/utils/nameValidation.ts.
//
// For each ticket, we simulate the React form pipeline:
//   raw  → sanitizeNameInput (keystroke filter + 50-char cap)
//        → normalizeNamesInPayload (collapse multi-spaces) on submit
//        → validateName (final reject)
// and compare the saved value against what the spec says is acceptable.

const NAME_MAX_LENGTH = 50
const NAME_PATTERN = /^[A-Za-z][A-Za-z'-]*(?: [A-Za-z'-]+)*$/

const normalizeName = v => v == null ? '' : String(v).replace(/\s+/g, ' ').trim()
const sanitizeNameInput = v => v.replace(/[^A-Za-z '-]/g, '').slice(0, NAME_MAX_LENGTH)
const validateName = (raw, label = 'Last Name') => {
  const v = normalizeName(raw)
  if (!v) return true
  if (v.length > NAME_MAX_LENGTH) return `${label} must not exceed ${NAME_MAX_LENGTH} characters`
  if (!NAME_PATTERN.test(v)) return `${label}: only alphabets are allowed`
  return true
}

// Simulate full pipeline: what eventually hits the API, OR an error message.
function pipeline(raw) {
  const filtered  = sanitizeNameInput(raw)         // keystroke / paste filter
  const submitted = normalizeName(filtered)        // payload normalize
  const v         = validateName(submitted)
  if (v !== true) return { rejected: v, saved: null }
  return { rejected: null, saved: submitted }
}

// Each case lists what the spec considers acceptable (any of):
//  - savedEmpty: invalid chars stripped to nothing → harmless empty save
//  - rejected:   validator returns an error
//  - savedEquals: a specific normalized value
const cases = [
  { id: 'ID_11', input: '123',                               accept: ['savedEmpty', 'rejected'] },
  { id: 'ID_12', input: 'Test123',                           accept: ['rejected', 'savedEquals:Test'] },
  { id: 'ID_13', input: '@#$%',                              accept: ['savedEmpty', 'rejected'] },
  { id: 'ID_14', input: 'Test      T',                       accept: ['rejected', 'savedEquals:Test T'] },
  { id: 'ID_15', input: 'Test     T'.padEnd(54, 'X'),        accept: ['rejected', 'lengthCapped'] },
  { id: 'ID_16', input: 'T'.repeat(184),                     accept: ['rejected', 'lengthCapped'] },
  { id: 'ID_18', input: 'TeSt',                              accept: ['savedEquals:TeSt'] }, // preserved → consistent display
  { id: 'ID_19', input: "' OR 1=1 --",                       accept: ['rejected'] },
  { id: 'ID_20', input: "<script>alert('XSS')</script>",     accept: ['rejected', 'savedNoTags'] },
  { id: 'OK_1',  input: 'John',                              accept: ['savedEquals:John']        },
  { id: 'OK_2',  input: "O'Brien",                           accept: ["savedEquals:O'Brien"]     },
  { id: 'OK_3',  input: 'Smith-Jones',                       accept: ['savedEquals:Smith-Jones'] },
  { id: 'OK_4',  input: 'John Smith',                        accept: ['savedEquals:John Smith']  },
]

function check(c, r) {
  for (const rule of c.accept) {
    if (rule === 'rejected'    && r.rejected) return rule
    if (rule === 'savedEmpty'  && r.saved === '') return rule
    if (rule === 'savedNoTags' && r.saved && !/[<>]/.test(r.saved)) return rule
    if (rule === 'lengthCapped'&& r.saved && r.saved.length <= NAME_MAX_LENGTH) return rule
    if (rule.startsWith('savedEquals:') && r.saved === rule.slice('savedEquals:'.length)) return rule
  }
  return null
}

const colW = (s, w) => String(s).length > w ? String(s).slice(0, w - 1) + '…' : String(s).padEnd(w)
const HEAD = ['', 'ID', 'desc', 'raw', 'pipeline outcome', 'matched rule']
const W    = [4, 6, 28, 36, 36, 24]
console.log(HEAD.map((s, i) => colW(s, W[i])).join(' | '))
console.log('-'.repeat(W.reduce((a, b) => a + b + 3, 0)))

let allPass = true
for (const c of cases) {
  const r = pipeline(c.input)
  const matched = check(c, r)
  const ok = matched !== null
  if (!ok) allPass = false

  const outcome = r.rejected
    ? `REJECT "${r.rejected}"`
    : `SAVE "${r.saved}"${r.saved.length > 25 ? ` (len=${r.saved.length})` : ''}`

  console.log(
    [
      ok ? 'ok  ' : 'FAIL',
      c.id,
      c.input.length > 26 ? c.input.slice(0, 23) + '...' : c.input,
      JSON.stringify(c.input).slice(0, 34),
      outcome,
      matched ?? '— none —',
    ].map((s, i) => colW(s, W[i])).join(' | ')
  )
}

console.log('\n' + (allPass ? 'All ticket cases pass.' : 'Some cases failed.'))
process.exit(allPass ? 0 : 1)
