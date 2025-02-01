import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phone: string, country: string) {
  const cleaned = phone.replace(/\D/g, '')
  if (country === 'AU') {
    if (cleaned.length <= 4) return cleaned
    if (cleaned.length <= 7) return cleaned.replace(/(\d{4})(\d{0,3})/, '$1 $2')
    return cleaned.replace(/(\d{4})(\d{3})(\d{0,3})/, '$1 $2 $3')
  }
  return cleaned
}

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/\D/g, '')
}