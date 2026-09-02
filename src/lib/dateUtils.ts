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

/**
 * Calculates payment / checkout due date (YYYY-MM-DD) based on check-in timestamp:
 * Ketentuan Check-Out (Batas 12:00 Siang WIB):
 * - Sewa Harian (Daily 1 Hari): Tamu menginap 1 malam (termasuk Early Check-in pagi maupun normal),
 *   sehingga batas check-out adalah BESOKNYA (tanggal masuk + 1) pukul 12:00 siang WIB.
 * - Sewa Harian (N Hari): Batas check-out adalah tanggal masuk + N hari pukul 12:00 siang WIB.
 * - Sesi Pagi / Transit Pagi (transit_morning): HANYA jika memilih paket transit pagi, check-out pada HARI YANG SAMA pukul 12:00 siang WIB.
 * - Sewa Mingguan: Tanggal masuk + (N * 7) hari.
 * - Sewa Bulanan: Tanggal masuk + N bulan.
 */
export function calculateCheckoutDueDate(
  checkInDateInput: Date | string | number = new Date(),
  rentalDuration: string = 'daily',
  rentalDays: number = 1,
  rentalWeeks: number = 1,
  rentalMonths: number = 1
): string {
  const checkInDate = typeof checkInDateInput === 'string' || typeof checkInDateInput === 'number'
    ? new Date(checkInDateInput)
    : checkInDateInput

  const validCheckIn = (!checkInDate || isNaN(checkInDate.getTime())) ? new Date() : checkInDate

  // If Sesi Pagi / Transit Pagi: strictly check-out on the SAME day at 12:00 noon WIB
  if (rentalDuration === 'transit_morning' || rentalDuration === 'transit' || rentalDuration === 'morning') {
    return getWIBDateString(validCheckIn)
  }

  const checkInDateStr = getWIBDateString(validCheckIn)
  const [year, month, day] = checkInDateStr.split('-').map(Number)
  const dueDate = new Date(year, month - 1, day)

  if (rentalDuration === 'daily') {
    const days = parseInt(String(rentalDays)) || 1
    dueDate.setDate(dueDate.getDate() + days)
  } else if (rentalDuration === 'weekly') {
    const weeks = parseInt(String(rentalWeeks)) || (rentalDays ? Math.round(rentalDays / 7) : 1)
    dueDate.setDate(dueDate.getDate() + (weeks * 7))
  } else if (rentalDuration === 'monthly') {
    const months = parseInt(String(rentalMonths)) || (rentalDays ? Math.round(rentalDays / 30) : 1)
    dueDate.setMonth(dueDate.getMonth() + months)
  } else {
    const days = parseInt(String(rentalDays)) || 1
    dueDate.setDate(dueDate.getDate() + days)
  }

  return getWIBDateString(dueDate)
}

/**
 * Returns formatted user-friendly label for rental duration
 */
export function formatRentalDurationLabel(rentalDuration?: string, rentalCount: number = 1): string {
  if (rentalDuration === 'transit_morning' || rentalDuration === 'transit' || rentalDuration === 'morning') {
    return 'Sesi Pagi (s/d 12:00 WIB)'
  }
  if (rentalDuration === 'weekly') {
    return `${rentalCount} Minggu`
  }
  if (rentalDuration === 'monthly') {
    return `${rentalCount} Bulan`
  }
  return `${rentalCount} Hari (Harian)`
}



