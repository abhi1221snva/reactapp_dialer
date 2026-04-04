// Address field group mapping for Nominatim (OpenStreetMap) auto-fill

interface AddressGroup {
  addressKey: string
  cityKey: string
  stateKey: string
  zipKey: string
  countryKey?: string
}

const ADDRESS_GROUPS: AddressGroup[] = [
  { addressKey: 'address', cityKey: 'city', stateKey: 'state', zipKey: 'zip_code', countryKey: 'country' },
  { addressKey: 'home_address', cityKey: 'home_city', stateKey: 'home_state', zipKey: 'home_zip' },
  { addressKey: 'business_address', cityKey: 'business_city', stateKey: 'business_state', zipKey: 'business_zip' },
]

// Keys that are known address fields (exact match)
const ADDRESS_KEYS = new Set(ADDRESS_GROUPS.map(g => g.addressKey))

// Label name patterns that indicate an address autocomplete field
const ADDRESS_LABEL_PATTERNS = [
  /^home\s*address$/i,
  /^business\s*address$/i,
  /^address$/i,
  /^street\s*address$/i,
  /^mailing\s*address$/i,
]

/** Check if a field key OR label name is an address autocomplete field */
export function isAddressAutocompleteKey(fieldKey: string, labelName?: string): boolean {
  if (ADDRESS_KEYS.has(fieldKey)) return true
  // Check key pattern (e.g. option_37 won't match, but home_address will)
  const k = fieldKey.toLowerCase()
  if (k === 'address' || k.endsWith('_address')) return true
  // Check label name if provided
  if (labelName) {
    return ADDRESS_LABEL_PATTERNS.some(p => p.test(labelName.trim()))
  }
  return false
}

/** Resolve which sibling keys to fill based on field key or label name */
export function resolveAddressGroup(fieldKey: string, labelName?: string): Omit<AddressGroup, 'addressKey'> | null {
  // Try exact key match first
  const group = ADDRESS_GROUPS.find(g => g.addressKey === fieldKey)
  if (group) {
    const { addressKey: _, ...siblings } = group
    return siblings
  }
  // Try matching by label name to find the right group
  if (labelName) {
    const ln = labelName.trim().toLowerCase()
    if (/^home/i.test(ln)) {
      return { cityKey: 'home_city', stateKey: 'home_state', zipKey: 'home_zip' }
    }
    if (/^business/i.test(ln)) {
      return { cityKey: 'business_city', stateKey: 'business_state', zipKey: 'business_zip' }
    }
  }
  // Default: fill the standard city/state/zip
  return { cityKey: 'city', stateKey: 'state', zipKey: 'zip_code', countryKey: 'country' }
}

export interface ParsedPlace {
  street: string
  city: string
  state: string
  zip: string
  country: string
  lat?: number
  lng?: number
}

/** Nominatim search result */
export interface NominatimResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    municipality?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
}

/** Extract structured address from a Nominatim result */
export function parseNominatimResult(result: NominatimResult): ParsedPlace {
  const a = result.address
  const street = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city || a.town || a.village || a.municipality || ''

  return {
    street,
    city,
    state: a.state ?? '',
    zip: a.postcode ?? '',
    country: a.country_code?.toUpperCase() ?? '',
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  }
}
