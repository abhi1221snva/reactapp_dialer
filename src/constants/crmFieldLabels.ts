/** Shared human-readable labels for CRM field keys, used across LendersPanel and validation components. */
export const CRM_FIELD_LABELS: Record<string, string> = {
  first_name: 'First Name', last_name: 'Last Name', email: 'Email Address',
  phone: 'Phone Number', phone_number: 'Phone Number', cell_phone: 'Cell Phone',
  date_of_birth: 'Date of Birth', owner_dob: 'Owner Date of Birth', dob: 'Date of Birth',
  ssn: 'Social Security Number', home_state: 'Home State', home_address: 'Home Address',
  home_city: 'Home City', home_zip: 'Home ZIP Code', zip_code: 'ZIP Code',
  address: 'Address', city: 'City', state: 'State',
  business_name: 'Business Name', legal_name: 'Legal Business Name', company_name: 'Company Name',
  business_phone: 'Business Phone', business_email: 'Business Email',
  business_address: 'Business Address', business_city: 'Business City',
  business_state: 'Business State', business_zip: 'Business ZIP Code',
  ein: 'EIN / Tax ID', fein: 'Federal EIN', tax_id: 'Tax ID',
  amount_requested: 'Amount Requested', monthly_revenue: 'Monthly Revenue',
  annual_revenue: 'Annual Revenue', credit_score: 'Credit Score',
  business_start_date: 'Business Start Date', industry: 'Industry',
  ownership_percentage: 'Ownership %', years_in_business: 'Years in Business',
  full_name: 'Full Name',
  option_34: 'Home State', option_37: 'Home Address', option_38: 'Business Phone',
  option_39: 'Amount Requested', option_44: 'SSN', option_45: 'Business ZIP',
  option_46: 'Home ZIP', option_724: 'Business Address', option_730: 'EIN / Tax ID',
  option_731: 'Business Start Date', option_733: 'Ownership %',
  option_749: 'Monthly Revenue', option_750: 'Avg Bank Balance',
}

/** Fields computed from other fields — do not validate as missing */
export const COMPUTED_FIELDS = new Set(['full_name', 'name', 'owner_name'])

/** Auto-label fallback: snake_case → Title Case */
export function autoLabel(key: string): string {
  return CRM_FIELD_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
