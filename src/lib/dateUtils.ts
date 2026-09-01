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
 * - Check-in sebelum 12:00 WIB (misal 01:00 dini hari, 06:00 pagi, 10:00 pagi):
 *   Sewa 1 hari (daily 1) check-out pada HARI YANG SAMA jam 12:00 siang (tanggal tidak bertambah).
 *   Sewa N hari check-out pada tanggal + (N - 1) hari jam 12:00 siang.
 * - Check-in setelah 12:00 WIB (misal 14:00 siang, 16:00 sore, 20:00 malam):
 *   Sewa 1 hari (daily 1) check-out pada BESOKNYA jam 12:00 siang (tanggal + 1 hari).
 *   Sewa N hari check-out pada tanggal + N hari jam 12:00 siang.
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

  // Get hour in Asia/Jakarta timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    hour12: false
  })
  const hourWIB = parseInt(formatter.format(validCheckIn), 10)

  const checkInDateStr = getWIBDateString(validCheckIn)
  const [year, month, day] = checkInDateStr.split('-').map(Number)
  const dueDate = new Date(year, month - 1, day)

  if (rentalDuration === 'daily') {
    const days = parseInt(String(rentalDays)) || 1
    const daysToAdd = hourWIB < 12 ? Math.max(0, days - 1) : days
    dueDate.setDate(dueDate.getDate() + daysToAdd)
  } else if (rentalDuration === 'weekly') {
    const weeks = parseInt(String(rentalWeeks)) || (rentalDays ? Math.round(rentalDays / 7) : 1)
    dueDate.setDate(dueDate.getDate() + (weeks * 7))
  } else if (rentalDuration === 'monthly') {
    const months = parseInt(String(rentalMonths)) || (rentalDays ? Math.round(rentalDays / 30) : 1)
    dueDate.setMonth(dueDate.getMonth() + months)
  } else {
    const days = parseInt(String(rentalDays)) || 1
    const daysToAdd = hourWIB < 12 ? Math.max(0, days - 1) : days
    dueDate.setDate(dueDate.getDate() + daysToAdd)
  }

  return getWIBDateString(dueDate)
}


