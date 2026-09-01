/**
 * Date utilities for Indonesian timezone (Asia/Jakarta / WIB = UTC+7)
 */

export function getWIBDateString(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (!d || isNaN(d.getTime())) {
    return ''
  }

  // Format as YYYY-MM-DD in Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(d)
}

export function formatWIBDate(
  date: Date | string | number | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
): string {
  if (!date) return '-'
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    ...options
  }).format(d)
}

export function getWIBNow(): Date {
  return new Date()
}

/**
 * Determines current daily rental price based on WIB (Asia/Jakarta) time:
 * - 06:00 - 12:00 WIB: Rp 150.000 / malam (Check-in pagi transit)
 * - Setelah 12:00 WIB: Rp 100.000 / malam (Tarif normal)
 */
export function getDailyRentalRate(date: Date | string | number = new Date()): {
  pricePerDay: number
  isMorningTransit: boolean
  formattedTime: string
  label: string
} {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  const validDate = (!d || isNaN(d.getTime())) ? new Date() : d

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })
  const parts = formatter.formatToParts(validDate)
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
  const totalMinutes = hour * 60 + minute

  // 06:00 (360 min) to 12:00 (720 min) WIB
  const isMorningTransit = totalMinutes >= 360 && totalMinutes < 720
  const pricePerDay = isMorningTransit ? 150000 : 100000

  return {
    pricePerDay,
    isMorningTransit,
    formattedTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB`,
    label: isMorningTransit 
      ? 'Tarif Transit Pagi (06:00 - 12:00 WIB)' 
      : 'Tarif Normal (Setelah 12:00 WIB)'
  }
}

