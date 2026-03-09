export interface UploadFormData {
  title: string
  campaign_id: string
  duplicate_check: boolean
  file: File
}

export interface Label {
  id: number
  title: string
}

export interface ParseResult {
  temp_key: string
  headers: string[]
  labels: Label[]
  row_count: number
}

export interface ImportResult {
  list_id: number
  campaign_id: number
  imported: number
}

export interface ListHeaderRow {
  id: number
  header: string
  column_name: string
  label_id: number | null
  label_title: string | null
  is_dialing: 0 | 1
  is_search: 0 | 1
}
