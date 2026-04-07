import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Capitalize the first letter of a string value (safe for any input type). */
export function capFirst(v: unknown): string {
  const s = typeof v === 'string' ? v : String(v ?? '')
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

